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

let editor = null;
let setContent = (content) => {
  editorContainer.textContent = content;
};

async function initMilkdown() {
  try {
    const { Editor, rootCtx, defaultValueCtx } = await import('@milkdown/core');
    const { commonmark } = await import('@milkdown/preset-commonmark');
    const { nord } = await import('@milkdown/theme-nord');
    const { listener, listenerCtx } = await import('@milkdown/plugin-listener');
    const { replaceAll } = await import('@milkdown/utils');

    editor = await Editor.make()
      .use(nord)
      .use(commonmark)
      .use(listener)
      .config((ctx) => {
        ctx.set(rootCtx, editorContainer);
        ctx.set(defaultValueCtx, currentTab?.content || '');
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          if (!currentTab) return;
          currentTab.content = markdown;
          saveTabs();
        });
      })
      .create();

    setContent = (md) => {
      editor.action(replaceAll(md));
    };
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
closeBtn.addEventListener('click', () => window.api.windowControl('close'));

if (tabs.length) {
  renderTabs();
  switchTab(tabs[0].id);
} else {
  createTab('Note 1');
}

initMilkdown();

