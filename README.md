# Kage Bojutsu - 樹狀剪貼簿

A tree-structured prompt template clipboard manager built with Tauri v2.

## Features

- **Tree-structured templates**: Organize prompts in folders
- **Global hotkey** (Alt+F2): Toggle the app window from anywhere
- **Quick bindings** (Alt+1~0): Bind templates to hotkeys for instant copy
- **System tray**: Runs in the background with tray icon
- **Dark theme**: Modern Catppuccin-inspired UI
- **Cross-platform**: macOS and Windows

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Tauri CLI](https://tauri.app/start/): `cargo install tauri-cli`
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with C++ workload, [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## Development

```bash
cargo tauri dev
```

## Build

### macOS
```bash
cargo tauri build
```
Output: `src-tauri/target/release/bundle/dmg/`

### Windows
```bash
cargo tauri build
```
Output: `src-tauri\target\release\bundle\msi\`

## Usage

- **Alt+F2**: Show/hide the window
- **Click template**: Preview content in right panel
- **Double-click**: Copy content to clipboard
- **Right-click**: Edit, delete, or bind to Alt+N
- **Alt+1~9, Alt+0**: Quick copy bound templates

## Data

Templates are stored in the app data directory:
- macOS: `~/Library/Application Support/com.kagebojutsu.desktop/templates.json`
- Windows: `%APPDATA%/com.kagebojutsu.desktop/templates.json`
