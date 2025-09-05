let tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
let currentTab = null;

const tabList = document.getElementById('tab-list');
const addTabBtn = document.getElementById('add-tab');
const editorContainer = document.getElementById('editor');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const settingsView = document.getElementById('settings-view');
const mainView = document.getElementById('main-view');
const gradientSelect = document.getElementById('gradient-select');
const fontSelect = document.getElementById('font-select');
const logsBtn = document.getElementById('logs-btn');
const logPanel = document.getElementById('log-panel');
const logOutput = document.getElementById('log-output');

const isDev = process.env.NODE_ENV !== 'production';
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

function createTab(title = 'New Note') {
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
    if (tab.id === currentTab?.id) tabEl.classList.add('active');

    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = tab.title;

    const startRename = (e) => {
      e.stopPropagation();
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
    };

    titleSpan.addEventListener('dblclick', startRename);
    tabEl.addEventListener('dblclick', startRename);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-tab';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    tabEl.appendChild(titleSpan);
    tabEl.appendChild(closeBtn);
    tabEl.addEventListener('click', () => switchTab(tab.id));
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

settingsBtn.addEventListener('click', () => {
  mainView.classList.add('hidden');
  settingsView.classList.remove('hidden');
});

backBtn.addEventListener('click', () => {
  settingsView.classList.add('hidden');
  mainView.classList.remove('hidden');
});

gradientSelect.addEventListener('change', (e) => {
  document.body.style.setProperty('--border-gradient', e.target.value);
});

fontSelect.addEventListener('change', (e) => {
  document.body.style.setProperty('--app-font', "'" + e.target.value + "', sans-serif");
});

const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

minBtn.addEventListener('click', () => window.api.windowControl('minimize'));
maxBtn.addEventListener('click', () => window.api.windowControl('maximize'));
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
  createTab('Note 1');
}

initMilkdown();

