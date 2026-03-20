const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

let data = { tree: [], quickBindings: {} };
let selectedId = null;
let contextTargetId = null;

// --- Init ---
async function init() {
  try {
    const json = await invoke("load_templates");
    data = JSON.parse(json);
  } catch (e) {
    console.error("Failed to load templates:", e);
    data = { tree: [], quickBindings: {} };
  }
  renderTree();
  renderBindings();
  setupListeners();
  listenEvents();
}

// --- Render Tree ---
function renderTree(filter = "") {
  const container = document.getElementById("tree-container");
  container.innerHTML = "";
  const lf = filter.toLowerCase();
  data.tree.forEach((node) => {
    const el = renderNode(node, lf);
    if (el) container.appendChild(el);
  });
}

function renderNode(node, filter) {
  if (node.type === "folder") {
    return renderFolder(node, filter);
  } else {
    return renderTemplate(node, filter);
  }
}

function renderFolder(folder, filter) {
  const div = document.createElement("div");
  div.className = "tree-folder" + (folder.expanded ? " expanded" : "");

  const header = document.createElement("div");
  header.className = "tree-folder-header";
  header.innerHTML = `
    <span class="tree-folder-arrow">▶</span>
    <span class="tree-folder-icon">📁</span>
    <span>${esc(folder.name)}</span>
  `;
  header.addEventListener("click", () => {
    folder.expanded = !folder.expanded;
    div.classList.toggle("expanded");
    save();
  });
  div.appendChild(header);

  const children = document.createElement("div");
  children.className = "tree-folder-children";
  let hasVisible = false;
  (folder.children || []).forEach((child) => {
    const el = renderNode(child, filter);
    if (el) {
      children.appendChild(el);
      hasVisible = true;
    }
  });
  div.appendChild(children);

  if (filter && !hasVisible) return null;
  if (filter) {
    div.classList.add("expanded");
  }
  return div;
}

function renderTemplate(tpl, filter) {
  if (filter && !tpl.title.toLowerCase().includes(filter) && !tpl.content.toLowerCase().includes(filter)) {
    return null;
  }
  const div = document.createElement("div");
  div.className = "tree-item" + (tpl.id === selectedId ? " active" : "");
  div.dataset.id = tpl.id;

  // Find binding
  const bindSlot = findBindSlot(tpl.id);
  const badge = bindSlot ? `<span class="tree-item-badge">Alt+${bindSlot === "10" ? "0" : bindSlot}</span>` : "";

  div.innerHTML = `
    <span class="tree-item-icon">📄</span>
    <span class="tree-item-title">${esc(tpl.title)}</span>
    ${badge}
  `;

  div.addEventListener("click", () => selectTemplate(tpl));
  div.addEventListener("contextmenu", (e) => showContextMenu(e, tpl));
  div.addEventListener("dblclick", () => {
    copyContent(tpl.content);
  });
  return div;
}

function findBindSlot(id) {
  for (const [slot, tid] of Object.entries(data.quickBindings || {})) {
    if (tid === id) return slot;
  }
  return null;
}

// --- Select & Preview ---
function selectTemplate(tpl) {
  selectedId = tpl.id;
  document.getElementById("panel-empty").classList.add("hidden");
  document.getElementById("panel-edit").classList.add("hidden");
  document.getElementById("panel-content").classList.remove("hidden");
  document.getElementById("panel-title").textContent = tpl.title;
  document.getElementById("panel-body").textContent = tpl.content;

  // Update active class
  document.querySelectorAll(".tree-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === tpl.id);
  });
}

// --- Edit Mode ---
function enterEditMode(tpl) {
  selectedId = tpl.id;
  document.getElementById("panel-empty").classList.add("hidden");
  document.getElementById("panel-content").classList.add("hidden");
  document.getElementById("panel-edit").classList.remove("hidden");
  document.getElementById("edit-title").value = tpl.title;
  document.getElementById("edit-content").value = tpl.content;
  document.getElementById("edit-title").focus();
}

function saveEdit() {
  const title = document.getElementById("edit-title").value.trim();
  const content = document.getElementById("edit-content").value;
  if (!title) return;
  const tpl = findTemplateById(selectedId);
  if (tpl) {
    tpl.title = title;
    tpl.content = content;
    save();
    renderTree(document.getElementById("search-input").value);
    selectTemplate(tpl);
  }
}

function cancelEdit() {
  const tpl = findTemplateById(selectedId);
  if (tpl) {
    selectTemplate(tpl);
  } else {
    document.getElementById("panel-edit").classList.add("hidden");
    document.getElementById("panel-empty").classList.remove("hidden");
  }
}

// --- Copy ---
async function copyContent(text) {
  try {
    await invoke("copy_to_clipboard", { text });
    showToast("Copied to clipboard!");
  } catch (e) {
    showToast("Failed to copy: " + e, true);
  }
}

// --- Context Menu ---
function showContextMenu(e, tpl) {
  e.preventDefault();
  e.stopPropagation();
  contextTargetId = tpl.id;
  const menu = document.getElementById("context-menu");

  // Build bind submenu
  const bindList = document.getElementById("ctx-bind-list");
  bindList.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    const slot = i.toString();
    const key = i === 10 ? "0" : slot;
    const item = document.createElement("div");
    item.className = "ctx-item";
    const existing = data.quickBindings[slot];
    const label = existing ? ` (${findTitleById(existing) || "?"})` : "";
    item.textContent = `Alt+${key}${label}`;
    item.addEventListener("click", () => {
      bindTemplate(slot, tpl.id);
      hideContextMenu();
    });
    bindList.appendChild(item);
  }

  menu.classList.remove("hidden");
  const x = Math.min(e.clientX, window.innerWidth - 180);
  const y = Math.min(e.clientY, window.innerHeight - 200);
  menu.style.left = x + "px";
  menu.style.top = y + "px";
}

function hideContextMenu() {
  document.getElementById("context-menu").classList.add("hidden");
}

// --- Bindings ---
function bindTemplate(slot, id) {
  // Unbind if already bound elsewhere
  for (const [s, tid] of Object.entries(data.quickBindings)) {
    if (tid === id) data.quickBindings[s] = null;
  }
  data.quickBindings[slot] = id;
  save();
  renderTree(document.getElementById("search-input").value);
  renderBindings();
}

function unbindTemplate(id) {
  for (const [slot, tid] of Object.entries(data.quickBindings)) {
    if (tid === id) data.quickBindings[slot] = null;
  }
  save();
  renderTree(document.getElementById("search-input").value);
  renderBindings();
}

function renderBindings() {
  const list = document.getElementById("bindings-list");
  list.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    const slot = i.toString();
    const key = i === 10 ? "0" : slot;
    const id = data.quickBindings[slot];
    const title = id ? findTitleById(id) : null;
    const div = document.createElement("div");
    div.className = "binding-slot" + (title ? " bound" : " empty");
    div.innerHTML = `<span class="binding-key">Alt+${key}</span><span class="binding-name">${title ? esc(title) : "—"}</span>`;
    list.appendChild(div);
  }
}

// --- Add ---
function addFolder() {
  const name = prompt("Folder name:");
  if (!name) return;
  data.tree.push({
    type: "folder",
    name,
    expanded: true,
    children: [],
  });
  save();
  renderTree();
}

function addTemplate() {
  // Add to first folder, or create one
  if (data.tree.length === 0) {
    data.tree.push({ type: "folder", name: "General", expanded: true, children: [] });
  }
  const folder = data.tree.find((n) => n.type === "folder") || data.tree[0];
  const id = "t-" + Date.now();
  const tpl = { type: "template", id, title: "New Template", content: "" };
  if (folder.type === "folder") {
    folder.children.push(tpl);
    folder.expanded = true;
  }
  save();
  renderTree();
  selectedId = id;
  enterEditMode(tpl);
}

function deleteTemplate(id) {
  if (!confirm("Delete this template?")) return;
  removeFromTree(data.tree, id);
  unbindTemplate(id);
  if (selectedId === id) {
    selectedId = null;
    document.getElementById("panel-content").classList.add("hidden");
    document.getElementById("panel-edit").classList.add("hidden");
    document.getElementById("panel-empty").classList.remove("hidden");
  }
  save();
  renderTree(document.getElementById("search-input").value);
}

function removeFromTree(nodes, id) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.type === "template" && node.id === id) {
      nodes.splice(i, 1);
      return true;
    }
    if (node.type === "folder" && node.children) {
      if (removeFromTree(node.children, id)) return true;
    }
  }
  return false;
}

// --- Helpers ---
function findTemplateById(id) {
  return findInNodes(data.tree, id);
}

function findInNodes(nodes, id) {
  for (const node of nodes) {
    if (node.type === "template" && node.id === id) return node;
    if (node.type === "folder" && node.children) {
      const found = findInNodes(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findTitleById(id) {
  const tpl = findTemplateById(id);
  return tpl ? tpl.title : null;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

async function save() {
  try {
    await invoke("save_templates", { data: JSON.stringify(data) });
  } catch (e) {
    console.error("Save failed:", e);
  }
}

function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.background = isError ? "var(--danger)" : "var(--success)";
  toast.classList.remove("hidden");
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 200);
  }, 1500);
}

// --- Event Listeners ---
function setupListeners() {
  document.getElementById("search-input").addEventListener("input", (e) => {
    renderTree(e.target.value);
  });

  document.getElementById("btn-add-folder").addEventListener("click", addFolder);
  document.getElementById("btn-add-template").addEventListener("click", addTemplate);

  document.getElementById("btn-edit").addEventListener("click", () => {
    const tpl = findTemplateById(selectedId);
    if (tpl) enterEditMode(tpl);
  });
  document.getElementById("btn-copy").addEventListener("click", () => {
    const tpl = findTemplateById(selectedId);
    if (tpl) copyContent(tpl.content);
  });
  document.getElementById("btn-save").addEventListener("click", saveEdit);
  document.getElementById("btn-cancel").addEventListener("click", cancelEdit);

  // Context menu actions
  document.querySelectorAll("#context-menu .ctx-item[data-action]").forEach((el) => {
    el.addEventListener("click", () => {
      const action = el.dataset.action;
      if (action === "edit") {
        const tpl = findTemplateById(contextTargetId);
        if (tpl) enterEditMode(tpl);
      } else if (action === "delete") {
        deleteTemplate(contextTargetId);
      } else if (action === "unbind") {
        unbindTemplate(contextTargetId);
      }
      hideContextMenu();
    });
  });

  // Hide context menu on click outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#context-menu")) hideContextMenu();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideContextMenu();
      if (!document.getElementById("panel-edit").classList.contains("hidden")) {
        cancelEdit();
      }
    }
    // Ctrl/Cmd+S to save in edit mode
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (!document.getElementById("panel-edit").classList.contains("hidden")) {
        saveEdit();
      }
    }
  });
}

// Listen for quick-copy events from backend
async function listenEvents() {
  await listen("quick-copy", (event) => {
    showToast(`Copied (Alt+${event.payload.slot})`);
  });
}

// --- Start ---
document.addEventListener("DOMContentLoaded", init);
