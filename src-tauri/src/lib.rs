use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum TreeNode {
    #[serde(rename = "folder")]
    Folder {
        name: String,
        expanded: bool,
        children: Vec<TreeNode>,
    },
    #[serde(rename = "template")]
    Template {
        id: String,
        title: String,
        content: String,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TemplatesData {
    pub tree: Vec<TreeNode>,
    pub quick_bindings: std::collections::HashMap<String, Option<String>>,
}

impl Default for TemplatesData {
    fn default() -> Self {
        serde_json::from_str(include_str!("../../default_templates.json"))
            .expect("default_templates.json must be valid")
    }
}

fn templates_path(app: &AppHandle) -> PathBuf {
    let dir = app.path().app_data_dir().expect("failed to get app data dir");
    fs::create_dir_all(&dir).ok();
    dir.join("templates.json")
}

#[tauri::command]
fn load_templates(app: AppHandle) -> Result<String, String> {
    let path = templates_path(&app);
    if !path.exists() {
        let default_data = TemplatesData::default();
        let json = serde_json::to_string_pretty(&default_data).map_err(|e| e.to_string())?;
        fs::write(&path, &json).map_err(|e| e.to_string())?;
        return Ok(json);
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_templates(app: AppHandle, data: String) -> Result<(), String> {
    let path = templates_path(&app);
    serde_json::from_str::<TemplatesData>(&data).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}

fn find_template_in_nodes(nodes: &[TreeNode], id: &str) -> Option<(String, String)> {
    for node in nodes {
        match node {
            TreeNode::Template {
                id: tid,
                title,
                content,
            } => {
                if tid == id {
                    return Some((title.clone(), content.clone()));
                }
            }
            TreeNode::Folder { children, .. } => {
                if let Some(found) = find_template_in_nodes(children, id) {
                    return Some(found);
                }
            }
        }
    }
    None
}

#[tauri::command]
fn get_template_by_id(app: AppHandle, id: String) -> Result<String, String> {
    let path = templates_path(&app);
    let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: TemplatesData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    match find_template_in_nodes(&data.tree, &id) {
        Some((_title, content)) => Ok(content),
        None => Err(format!("Template '{}' not found", id)),
    }
}

fn copy_quick_binding(app: &AppHandle, slot: &str) {
    let path = templates_path(app);
    let Ok(json) = fs::read_to_string(&path) else { return };
    let Ok(data) = serde_json::from_str::<TemplatesData>(&json) else { return };
    let Some(Some(template_id)) = data.quick_bindings.get(slot) else { return };
    let Some((_title, content)) = find_template_in_nodes(&data.tree, template_id) else { return };
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let _ = app.clipboard().write_text(&content);
    let _ = app.emit("quick-copy", serde_json::json!({ "slot": slot, "content": content }));
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::tray::TrayIconBuilder;

    let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
    let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                ..
            } = event
            {
                if let Some(w) = tray.app_handle().get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn setup_global_shortcuts(app: &AppHandle) {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

    let handle = app.clone();
    if let Ok(shortcut) = "Alt+F2".parse::<Shortcut>() {
        let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Some(w) = handle.get_webview_window("main") {
                    if w.is_visible().unwrap_or(false) {
                        let _ = w.hide();
                    } else {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
            }
        });
    }

    for i in 1..=9 {
        let handle = app.clone();
        let shortcut_str = format!("Alt+{}", i);
        let slot = i.to_string();
        if let Ok(shortcut) = shortcut_str.parse::<Shortcut>() {
            let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    copy_quick_binding(&handle, &slot);
                }
            });
        }
    }

    let handle = app.clone();
    if let Ok(shortcut) = "Alt+0".parse::<Shortcut>() {
        let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                copy_quick_binding(&handle, "10");
            }
        });
    }
}

pub fn commands() -> impl Fn(tauri::ipc::Invoke) -> bool {
    tauri::generate_handler![
        load_templates,
        save_templates,
        copy_to_clipboard,
        get_template_by_id,
    ]
}
