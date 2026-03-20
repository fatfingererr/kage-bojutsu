#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(kage_bojutsu_lib::commands())
        .setup(|app| {
            kage_bojutsu_lib::setup_tray(app.handle())?;
            kage_bojutsu_lib::setup_global_shortcuts(app.handle());

            let handle = app.handle().clone();
            if let Some(window) = handle.get_webview_window("main") {
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(w) = handle.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Kage Bojutsu");
}
