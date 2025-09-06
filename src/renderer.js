let tabs = [];
try {
  tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
} catch {
  localStorage.removeItem('tabs');
}
let folders = [];
try {
  folders = JSON.parse(localStorage.getItem('folders') || '[]');
} catch {
  localStorage.removeItem('folders');
}
let currentTab = null;
let isRawMode = false;

const tabList = document.getElementById('tab-list');
const addTabBtn = document.getElementById('add-tab');
const editorContainer = document.getElementById('editor');
const tabsContainer = document.getElementById('tabs');
const tabContextMenu = document.createElement('div');
tabContextMenu.id = 'tab-context-menu';
tabContextMenu.className = 'context-menu hidden';
document.body.appendChild(tabContextMenu);
const tabBarContextMenu = document.createElement('div');
tabBarContextMenu.id = 'tabbar-context-menu';
tabBarContextMenu.className = 'context-menu hidden';
document.body.appendChild(tabBarContextMenu);
let draggedTabId = null;
let draggedFolderId = null;

const dragIndicator = document.createElement('div');
dragIndicator.className = 'drag-indicator hidden';

function showMenu(menu, x, y, items) {
  hideMenus();
  menu.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'context-menu-item';
    div.textContent = item.label;
    div.addEventListener('click', () => { hideMenus(); item.action(); });
    menu.appendChild(div);
  });
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.remove('hidden');
}

function hideMenus() {
  tabContextMenu.classList.add('hidden');
  tabBarContextMenu.classList.add('hidden');
}

document.addEventListener('click', hideMenus);

function getDragAfterElement(container, y, selector) {
  const elements = [...container.querySelectorAll(selector)]
    .filter(el => el !== dragIndicator && el.dataset.id !== draggedTabId && el.dataset.id !== draggedFolderId);
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

tabList.addEventListener('dragover', (e) => {
  e.preventDefault();
  const selector = draggedFolderId ? '.folder' : '.tab';
  const afterElement = getDragAfterElement(tabList, e.clientY, selector);
  dragIndicator.classList.remove('hidden');
  if (afterElement) {
    tabList.insertBefore(dragIndicator, afterElement);
  } else {
    tabList.appendChild(dragIndicator);
  }
});
tabList.addEventListener('drop', (e) => {
  e.preventDefault();
  dragIndicator.classList.add('hidden');
  dragIndicator.remove();
  if (draggedTabId) {
    const afterElement = getDragAfterElement(tabList, e.clientY, '.tab');
    const draggedIndex = tabs.findIndex(t => t.id === draggedTabId);
    const [dragged] = tabs.splice(draggedIndex, 1);
    dragged.folderId = null;
    let targetIndex = afterElement ? tabs.findIndex(t => t.id === afterElement.dataset.id) : tabs.length;
    tabs.splice(targetIndex, 0, dragged);
    saveTabs();
    renderTabs();
  } else if (draggedFolderId) {
    const afterElement = getDragAfterElement(tabList, e.clientY, '.folder');
    const draggedIndex = folders.findIndex(f => f.id === draggedFolderId);
    const [dragged] = folders.splice(draggedIndex, 1);
    let targetIndex = afterElement ? folders.findIndex(f => f.id === afterElement.dataset.id) : folders.length;
    folders.splice(targetIndex, 0, dragged);
    saveTabs();
    renderTabs();
  }
  draggedTabId = null;
  draggedFolderId = null;
});

tabsContainer.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.tab') || e.target.closest('.folder')) return;
  e.preventDefault();
  showMenu(tabBarContextMenu, e.pageX, e.pageY, [
    { label: 'New Folder', action: () => createFolder() }
  ]);
});
const noteArea = document.getElementById('note-area');
const rawEditor = document.getElementById('raw-editor');
const renderedView = document.getElementById('rendered-view');
const rawView = document.getElementById('raw-view');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const settingsView = document.getElementById('settings-view');
settingsView.classList.add('hidden');
const gradientSelect = document.getElementById('gradient-select');
const gradientPreview = document.getElementById('gradient-preview');
const gradientOutlineSelect = document.getElementById('gradient-outline-select');
const glowSelect = document.getElementById('glow-select');
const fontSelect = document.getElementById('font-select');
const themeSelect = document.getElementById('theme-select');
const logsBtn = document.getElementById('logs-btn');
const logPanel = document.getElementById('log-panel');
const logOutput = document.getElementById('log-output');

// Restore persisted settings
const savedGradient = localStorage.getItem('gradient');
if (savedGradient) {
  gradientSelect.value = savedGradient;
  document.body.style.setProperty('--border-gradient', savedGradient);
  gradientPreview.style.background = savedGradient;
} else {
  gradientPreview.style.background = gradientSelect.value;
}

const savedFont = localStorage.getItem('font');
if (savedFont) {
  fontSelect.value = savedFont;
  document.body.style.setProperty('--app-font', "'" + savedFont + "', sans-serif");
}

const defaultGlowOpacity = '0.35';
const defaultGradientOpacity = '0.5';

function applyGlow(enabled, persist = true) {
  document.body.style.setProperty('--glow-opacity', enabled ? defaultGlowOpacity : '0');
  if (persist) {
    localStorage.setItem('glow', enabled ? 'on' : 'off');
  }
}

function applyGradientOutline(enabled, persist = true) {
  document.body.style.setProperty('--gradient-opacity', enabled ? defaultGradientOpacity : '0');
  if (persist) {
    localStorage.setItem('gradient-outline', enabled ? 'on' : 'off');
  }
}

const savedGlow = localStorage.getItem('glow') || 'on';
glowSelect.value = savedGlow;
applyGlow(savedGlow === 'on', false);

const savedGradientOutline = localStorage.getItem('gradient-outline') || 'on';
gradientOutlineSelect.value = savedGradientOutline;
applyGradientOutline(savedGradientOutline === 'on', false);

function applyTheme(theme, persist = true) {
  document.body.classList.remove('theme-dark', 'theme-light', 'theme-acrylic');
  if (theme === 'light-mica') {
    document.body.classList.add('theme-light');
  } else if (theme === 'acrylic') {
    document.body.classList.add('theme-acrylic');
  } else {
    document.body.classList.add('theme-dark');
  }
  if (window.api?.setTheme) {
    window.api.setTheme(theme);
  }
  if (persist) {
    localStorage.setItem('theme', theme);
  }
}

const savedTheme = localStorage.getItem('theme') || 'dark-mica';
themeSelect.value = savedTheme;
applyTheme(savedTheme, false);

function syncDropdownWidths() {
  const width = gradientSelect.offsetWidth;
  if (width) {
    fontSelect.style.width = `${width}px`;
    themeSelect.style.width = `${width}px`;
    glowSelect.style.width = `${width}px`;
    gradientOutlineSelect.style.width = `${width}px`;
  }
}
syncDropdownWidths();
window.addEventListener('load', syncDropdownWidths);
window.addEventListener('resize', syncDropdownWidths);
noteArea.addEventListener('click', async (e) => {
  if (!editor) return;
  if (e.target !== noteArea && e.target !== editorContainer) return;
  const { TextSelection } = await import('@milkdown/prose/state');
  const view = editor.view;
  const end = view.state.doc.content.size;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, end)));
  view.focus();
});

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
if (isDev) {
  function formatLogArg(a) {
    if (a instanceof Error) {
      return `${a.message}\n${a.stack}`;
    }
    if (typeof a === 'object') {
      try { return JSON.stringify(a, null, 2); }
      catch { return String(a); }
    }
    return String(a);
  }

  function appendLog(level, args) {
    const line = document.createElement('div');
    const msg = Array.from(args).map(formatLogArg).join(' ');
    line.textContent = `[${level}] ${msg}`;
    logOutput.appendChild(line);
    logOutput.scrollTop = logOutput.scrollHeight;
  }

  ['log','warn','error'].forEach(level => {
    const orig = console[level];
    console[level] = (...args) => {
      orig.apply(console, args);
      appendLog(level, args);
    };
  });

  window.addEventListener('error', (e) => appendLog('error', [e.error || e.message]));
  window.addEventListener('unhandledrejection', (e) => appendLog('error', [e.reason]));

  logsBtn.addEventListener('click', () => {
    logPanel.classList.toggle('hidden');
  });
} else {
  logsBtn.remove();
  logPanel.remove();
}

let editor = null;
let ignoreUpdate = false;
// Defer injecting markdown into the DOM until Milkdown is ready.
// Otherwise the raw markdown flashes before the editor mounts.
let setContent = () => {};

function setRawMode(on) {
  if (on === isRawMode) return;
  isRawMode = on;
  if (on) {
    rawEditor.value = currentTab?.content || '';
    editorContainer.classList.add('hidden');
    rawEditor.classList.remove('hidden');
    rawView.classList.add('active');
    renderedView.classList.remove('active');
  } else {
    setContent(rawEditor.value);
    editorContainer.classList.remove('hidden');
    rawEditor.classList.add('hidden');
    renderedView.classList.add('active');
    rawView.classList.remove('active');
  }
}

renderedView.addEventListener('click', () => setRawMode(false));
rawView.addEventListener('click', () => setRawMode(true));

rawEditor.addEventListener('input', () => {
  if (!currentTab) return;
  const md = rawEditor.value;
  currentTab.content = md;
  const firstLine = md.trimStart().split('\n')[0];
  const m = firstLine.match(/^#{1,6}\s+(.*)$/);
  if (m) {
    const name = m[1].trim();
    if (name && currentTab.title !== name) {
      currentTab.title = name;
      renderTabs();
    }
  }
  saveTabs();
});

async function initMilkdown() {
  try {
    // Ensure the editor container is empty before Milkdown mounts.
    editorContainer.textContent = '';
    console.log('Loading Milkdown core...');
    const {
      Editor,
      rootCtx,
      defaultValueCtx,
      editorViewOptionsCtx,
      prosePluginsCtx,
    } = await import('@milkdown/core');
    console.log('Loading Nord theme...');
    const { nord } = await import('@milkdown/theme-nord');
    console.log('Loading CommonMark preset...');
    const { commonmark } = await import('@milkdown/preset-commonmark');
    console.log('Loading listener plugin...');
    const { listener, listenerCtx } = await import('@milkdown/plugin-listener');
    const { replaceAll } = await import('@milkdown/utils');
    const { keymap } = await import('@milkdown/prose/keymap');
    const { TextSelection } = await import('@milkdown/prose/state');

    const exitCodeBlock = keymap({
      ArrowDown: (state, dispatch) => {
        const { selection } = state;
        if (!selection.empty) return false;
        const $pos = selection.$head;
        if ($pos.parent.type.name !== 'code_block') return false;
        if ($pos.parentOffset < $pos.parent.content.size) return false;
        const pos = $pos.after();
        const paragraph = state.schema.nodes.paragraph.create();
        if (dispatch) {
          let tr = state.tr.insert(pos, paragraph);
          tr = tr.setSelection(TextSelection.create(tr.doc, pos + 1));
          dispatch(tr);
        }
        return true;
      }
    });

    console.log('Creating Milkdown editor...');
    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorContainer);
        ctx.set(defaultValueCtx, currentTab?.content || '');
        ctx.set(editorViewOptionsCtx, {});
      })
      .use(nord)
      .use(commonmark)
      .use(listener)
      .config((ctx) => {
        ctx.update(prosePluginsCtx, (ps) => ps.concat(exitCodeBlock));
      })
      .create();

    editor.action((ctx) => {
      ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
        if (ignoreUpdate) return;
        if (!currentTab) return;
        currentTab.content = markdown;
        const firstLine = markdown.trimStart().split('\n')[0];
        const m = firstLine.match(/^#{1,6}\s+(.*)$/);
        if (m) {
          const name = m[1].trim();
          if (name && currentTab.title !== name) {
            currentTab.title = name;
            renderTabs();
          }
        }
        saveTabs();
      });
    });

    setContent = (md) => {
      ignoreUpdate = true;
      editor.action(replaceAll(md));
      ignoreUpdate = false;
    };
    console.log('Milkdown editor ready');
  } catch (err) {
    console.error('Milkdown failed to load, falling back to plain editor', err);
    editorContainer.contentEditable = 'true';
    editorContainer.addEventListener('input', () => {
      if (!currentTab) return;
      currentTab.content = editorContainer.textContent;
      saveTabs();
    });
  }
}

function saveTabs() {
  localStorage.setItem('tabs', JSON.stringify(tabs));
  localStorage.setItem('folders', JSON.stringify(folders));
}

function renameTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  const tabEl = tabList.querySelector(`.tab[data-id="${tabId}"]`);
  if (!tabEl) return;
  const titleSpan = tabEl.querySelector('.title');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rename-input';
  input.value = tab.title;
  tabEl.replaceChild(input, titleSpan);
  input.focus();
  input.select();

  const finish = () => {
    const newName = input.value.trim();
    if (newName) tab.title = newName;
    saveTabs();
    renderTabs();
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') finish();
    if (ev.key === 'Escape') renderTabs();
  });
}

function renameFolder(folderId) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  const titleSpan = tabList.querySelector(`.folder[data-id="${folderId}"] .folder-title`);
  if (!titleSpan) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rename-input';
  input.value = folder.title;
  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  const finish = () => {
    const newName = input.value.trim();
    if (newName) folder.title = newName;
    saveTabs();
    renderTabs();
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') finish();
    if (ev.key === 'Escape') renderTabs();
  });
}

function createFolder(name) {
  if (!name) {
    let index = 1;
    const base = 'Folder ';
    while (folders.some(f => f.title === base + index)) index++;
    name = base + index;
  }
  const id = Date.now().toString() + '-f';
  folders.push({ id, title: name, collapsed: false });
  saveTabs();
  renderTabs();
}

function moveTabToFolder(tabId, folderId) {
  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;
  const [tab] = tabs.splice(index, 1);
  tab.folderId = folderId || null;
  let targetIndex;
  if (tab.folderId) {
    const lastIndex = tabs.map((t, i) => t.folderId === tab.folderId ? i : -1).filter(i => i !== -1).pop();
    targetIndex = lastIndex !== undefined ? lastIndex + 1 : tabs.length;
  } else {
    const lastIndex = tabs.map((t, i) => !t.folderId ? i : -1).filter(i => i !== -1).pop();
    targetIndex = lastIndex !== undefined ? lastIndex + 1 : tabs.length;
  }
  tabs.splice(targetIndex, 0, tab);
  saveTabs();
  renderTabs();
}

function deleteFolder(folderId) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  const delNotes = confirm(`Delete all notes in "${folder.title}"? Press OK to delete notes, Cancel to keep notes.`);
  if (delNotes) {
    tabs = tabs.filter(t => t.folderId !== folderId);
  } else {
    tabs.forEach(t => { if (t.folderId === folderId) t.folderId = null; });
  }
  const idx = folders.findIndex(f => f.id === folderId);
  if (idx !== -1) folders.splice(idx, 1);
  saveTabs();
  renderTabs();
  showToast(delNotes ? `Deleted folder "${folder.title}" and its notes` : `Deleted folder "${folder.title}"`);
}

function createTabElement(tab) {
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.dataset.id = tab.id;
  tabEl.draggable = true;
  if (tab.id === currentTab?.id) tabEl.classList.add('active');

  const titleSpan = document.createElement('span');
  titleSpan.className = 'title';
  titleSpan.textContent = tab.title;
  titleSpan.title = tab.title;
  tabEl.title = tab.title;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-tab';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tab.id);
  });

  tabEl.appendChild(titleSpan);
  tabEl.appendChild(closeBtn);

  tabEl.addEventListener('click', () => {
    if (currentTab?.id !== tab.id) switchTab(tab.id);
  });

  tabEl.addEventListener('dblclick', () => {
    if (currentTab?.id !== tab.id) switchTab(tab.id);
    renameTab(tab.id);
  });

  tabEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const x = e.pageX;
    const y = e.pageY;
    const items = [
      { label: 'Rename', action: () => { hideMenus(); renameTab(tab.id); } },
      { label: 'Delete', action: () => { hideMenus(); closeTab(tab.id); } }
    ];
    if (folders.length > 0) {
      items.push({
        label: 'Move to Folder',
        action: () => {
          const moveItems = [{ label: 'Root', action: () => { hideMenus(); moveTabToFolder(tab.id, null); } }];
          folders.forEach(f => moveItems.push({ label: f.title, action: () => { hideMenus(); moveTabToFolder(tab.id, f.id); } }));
          showMenu(tabContextMenu, x, y, moveItems);
        }
      });
    }
    showMenu(tabContextMenu, x, y, items);
  });

  tabEl.addEventListener('dragstart', (e) => {
    draggedTabId = tab.id;
    e.dataTransfer.effectAllowed = 'move';
    tabEl.classList.add('dragging');
  });

  tabEl.addEventListener('dragend', () => {
    draggedTabId = null;
    tabEl.classList.remove('dragging');
    dragIndicator.classList.add('hidden');
    dragIndicator.remove();
  });

  return tabEl;
}

function createTab(title) {
  if (!title) {
    let index = 1;
    const base = 'Note ';
    while (tabs.some(t => t.title === base + index)) index++;
    title = base + index;
  }
  const id = Date.now().toString();
  const tab = { id, title, content: '', folderId: null };
  tabs.push(tab);
  saveTabs();
  renderTabs();
  switchTab(id);
}

function renderTabs() {
  tabList.innerHTML = '';
  folders.forEach(folder => {
    const folderEl = document.createElement('div');
    folderEl.className = 'folder';
    folderEl.dataset.id = folder.id;
    if (folder.collapsed) folderEl.classList.add('collapsed');
    folderEl.draggable = true;

    const header = document.createElement('div');
    header.className = 'folder-header';

    const arrow = document.createElement('span');
    arrow.className = 'folder-arrow';
    arrow.textContent = folder.collapsed ? '▶' : '▼';
    header.appendChild(arrow);

    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 4H2v16h20V6H12l-2-2z"/></svg>';
    header.appendChild(icon);

    const title = document.createElement('span');
    title.className = 'folder-title';
    title.textContent = folder.title;
    header.appendChild(title);

    let clickTimer;
    header.addEventListener('click', () => {
      if (clickTimer) return;
      clickTimer = setTimeout(() => {
        folder.collapsed = !folder.collapsed;
        saveTabs();
        renderTabs();
        clickTimer = null;
      }, 200);
    });
    header.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      renameFolder(folder.id);
    });
    header.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const x = e.pageX;
      const y = e.pageY;
      showMenu(tabContextMenu, x, y, [
        { label: 'Rename', action: () => { hideMenus(); renameFolder(folder.id); } },
        { label: 'Delete', action: () => { hideMenus(); deleteFolder(folder.id); } }
      ]);
    });

    header.addEventListener('dragenter', () => {
      if (draggedTabId) header.classList.add('drag-over');
    });
    header.addEventListener('dragleave', (e) => {
      if (!header.contains(e.relatedTarget)) header.classList.remove('drag-over');
    });
    header.addEventListener('drop', (e) => {
      e.preventDefault();
      header.classList.remove('drag-over');
      if (draggedTabId) {
        const draggedIndex = tabs.findIndex(t => t.id === draggedTabId);
        const [dragged] = tabs.splice(draggedIndex, 1);
        dragged.folderId = folder.id;
        const lastIndex = tabs.map((t, i) => t.folderId === folder.id ? i : -1).filter(i => i !== -1).pop();
        const insertIndex = lastIndex !== undefined ? lastIndex + 1 : tabs.length;
        tabs.splice(insertIndex, 0, dragged);
        saveTabs();
        renderTabs();
        draggedTabId = null;
      }
    });

    folderEl.appendChild(header);

    const container = document.createElement('div');
    container.className = 'folder-tabs';
    container.dataset.folderId = folder.id;
    tabs.filter(t => t.folderId === folder.id).forEach(tab => {
      container.appendChild(createTabElement(tab));
    });
    container.addEventListener('dragover', (e) => {
      if (!draggedTabId) return;
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY, '.tab');
      dragIndicator.classList.remove('hidden');
      if (afterElement) {
        container.insertBefore(dragIndicator, afterElement);
      } else {
        container.appendChild(dragIndicator);
      }
    });
    container.addEventListener('drop', (e) => {
      if (!draggedTabId) return;
      e.preventDefault();
      dragIndicator.classList.add('hidden');
      dragIndicator.remove();
      const afterElement = getDragAfterElement(container, e.clientY, '.tab');
      const draggedIndex = tabs.findIndex(t => t.id === draggedTabId);
      const [dragged] = tabs.splice(draggedIndex, 1);
      dragged.folderId = folder.id;
      let targetIndex;
      if (afterElement) {
        targetIndex = tabs.findIndex(t => t.id === afterElement.dataset.id);
      } else {
        const lastIndex = tabs.map((t, i) => t.folderId === folder.id ? i : -1).filter(i => i !== -1).pop();
        targetIndex = lastIndex !== undefined ? lastIndex + 1 : tabs.length;
      }
      tabs.splice(targetIndex, 0, dragged);
      saveTabs();
      renderTabs();
      draggedTabId = null;
    });
    folderEl.addEventListener('dragstart', (e) => {
      draggedFolderId = folder.id;
      e.dataTransfer.effectAllowed = 'move';
      folderEl.classList.add('dragging');
    });
    folderEl.addEventListener('dragend', () => {
      draggedFolderId = null;
      folderEl.classList.remove('dragging');
      dragIndicator.classList.add('hidden');
      dragIndicator.remove();
    });
    tabList.appendChild(folderEl);
    folderEl.appendChild(container);
  });
  tabs.filter(t => !t.folderId).forEach(tab => {
    tabList.appendChild(createTabElement(tab));
  });
}

function switchTab(id) {
  currentTab = tabs.find(t => t.id === id);
  const md = currentTab?.content || '';
  rawEditor.value = md;
  setContent(md);
  renderTabs();
}

function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;
  tabs.splice(index, 1);
  if (currentTab?.id === id) {
    currentTab = tabs[0] || null;
    const md = currentTab?.content || '';
    rawEditor.value = md;
    setContent(md);
  }
  saveTabs();
  renderTabs();
}

addTabBtn.addEventListener('click', () => createTab());

function cycleTabs(dir) {
  if (!tabs.length) return;
  let index = tabs.findIndex(t => t.id === currentTab?.id);
  index = (index + dir + tabs.length) % tabs.length;
  switchTab(tabs[index].id);
}

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    createTab();
  } else if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    cycleTabs(e.shiftKey ? -1 : 1);
  }
});

function toggleSettings() {
  const nowHidden = settingsView.classList.toggle('hidden');
  if (!nowHidden) {
    syncDropdownWidths();
  }
}

settingsBtn.addEventListener('click', toggleSettings);
closeSettingsBtn.addEventListener('click', toggleSettings);

gradientSelect.addEventListener('change', (e) => {
  document.body.style.setProperty('--border-gradient', e.target.value);
  gradientPreview.style.background = e.target.value;
  localStorage.setItem('gradient', e.target.value);
  syncDropdownWidths();
});

glowSelect.addEventListener('change', (e) => {
  applyGlow(e.target.value === 'on');
});

gradientOutlineSelect.addEventListener('change', (e) => {
  applyGradientOutline(e.target.value === 'on');
});

fontSelect.addEventListener('change', (e) => {
  document.body.style.setProperty('--app-font', "'" + e.target.value + "', sans-serif");
  localStorage.setItem('font', e.target.value);
});

themeSelect.addEventListener('change', (e) => {
  applyTheme(e.target.value);
});

const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

minBtn.addEventListener('click', () => window.api?.windowControl('minimize'));
maxBtn.addEventListener('click', () => window.api?.windowControl('maximize'));
closeBtn.addEventListener('click', () => {
  if (window.api?.windowControl) {
    window.api.windowControl('close');
  } else {
    window.close();
  }
});

if (tabs.length) {
  renderTabs();
  switchTab(tabs[0].id);
} else {
  createTab();
}

initMilkdown();

