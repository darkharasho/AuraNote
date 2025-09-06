let tabs = [];
try {
  tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
} catch {
  localStorage.removeItem('tabs');
}
let currentTab = null;

const tabList = document.getElementById('tab-list');
const addTabBtn = document.getElementById('add-tab');
const editorContainer = document.getElementById('editor');
const noteArea = document.getElementById('note-area');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const settingsView = document.getElementById('settings-view');
settingsView.classList.add('hidden');
const gradientSelect = document.getElementById('gradient-select');
const gradientPreview = document.getElementById('gradient-preview');
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

function applyGlow(enabled, persist = true) {
  document.body.style.setProperty('--glow-opacity', enabled ? defaultGlowOpacity : '0');
  if (persist) {
    localStorage.setItem('glow', enabled ? 'on' : 'off');
  }
}

const savedGlow = localStorage.getItem('glow') || 'on';
glowSelect.value = savedGlow;
applyGlow(savedGlow === 'on', false);

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

function createTab(title) {
  if (!title) {
    let index = 1;
    const base = 'Note ';
    while (tabs.some(t => t.title === base + index)) index++;
    title = base + index;
  }
  const id = Date.now().toString();
  const tab = { id, title, content: '' };
  tabs.push(tab);
  saveTabs();
  renderTabs();
  switchTab(id);
}

function renderTabs() {
  tabList.innerHTML = '';
  tabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.id = tab.id;
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

    let clickTimer = null;
    tabEl.addEventListener('click', () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        if (currentTab?.id !== tab.id) {
          switchTab(tab.id);
          setTimeout(() => renameTab(tab.id), 0);
        } else {
          renameTab(tab.id);
        }
      } else {
        clickTimer = setTimeout(() => {
          if (currentTab?.id !== tab.id) switchTab(tab.id);
          clickTimer = null;
        }, 200);
      }
    });

    tabList.appendChild(tabEl);
  });

}

function switchTab(id) {
  currentTab = tabs.find(t => t.id === id);
  const md = currentTab?.content || '';
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
    setContent(md);
  }
  saveTabs();
  renderTabs();
}

addTabBtn.addEventListener('click', () => createTab());

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

