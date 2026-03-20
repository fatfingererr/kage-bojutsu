# 🌳 Kage Bojutsu (影棒術)

> A tree-structured prompt template clipboard manager with global hotkeys, quick bindings, and system tray — built with Tauri v2.

**Kage Bojutsu** (影棒術 — "shadow staff technique") organizes your prompt templates in a tree hierarchy, letting you copy any template to clipboard instantly via global hotkeys.

## ✨ Features

- **🌲 Tree-structured templates** — Organize prompts in nested folders
- **⌨️ Global hotkey** (`Alt+F2`) — Toggle the window from anywhere
- **🔢 Quick bindings** (`Alt+1`~`Alt+0`) — Bind 10 templates for instant copy
- **🖥️ System tray** — Runs silently in background
- **🌙 Dark theme** — Catppuccin-inspired UI
- **💻 Cross-platform** — macOS and Windows

## 📸 How It Works

```
┌─────────────────────────────────────────────┐
│ 🌳 Kage Bojutsu                        ─ □ x│
├──────────────┬──────────────────────────────┤
│ 📁 Coding    │                              │
│  ├─ Review   │  # Code Review Template      │
│  ├─ Debug    │                              │
│  └─ Refactor │  You are a senior developer. │
│ 📁 Writing   │  Review the following code   │
│  ├─ Blog     │  for:                        │
│  └─ Email    │  - Bugs and edge cases       │
│ 📁 Meeting   │  - Performance issues        │
│  └─ Summary  │  - Readability               │
├──────────────┴──────────────────────────────┤
│ Alt+1: Review  Alt+2: Debug  Alt+3: Blog    │
└─────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Tauri CLI](https://tauri.app/start/): `cargo install tauri-cli`
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with C++ workload + [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### Development

```bash
cargo tauri dev
```

### Build

```bash
cargo tauri build
```

| Platform | Output |
|----------|--------|
| macOS | `src-tauri/target/release/bundle/dmg/` |
| Windows | `src-tauri\target\release\bundle\msi\` |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+F2` | Show / hide window |
| `Alt+1`~`Alt+9`, `Alt+0` | Quick copy bound template |
| Click | Preview template |
| Double-click | Copy to clipboard |
| Right-click | Edit / Delete / Bind to hotkey |

## 📂 Data Storage

Templates are stored in JSON format:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/com.kagebojutsu.desktop/templates.json` |
| Windows | `%APPDATA%/com.kagebojutsu.desktop/templates.json` |

## 🏗️ Tech Stack

- **Backend**: Rust + [Tauri v2](https://v2.tauri.app/)
- **Frontend**: Vanilla JS + CSS (no framework)
- **Plugins**: `tauri-plugin-clipboard-manager`, `tauri-plugin-global-shortcut`

## 📝 License

MIT
