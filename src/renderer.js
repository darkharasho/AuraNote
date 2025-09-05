let tabs = [];
let currentTab = null;

const tabList = document.getElementById('tab-list');
const addTabBtn = document.getElementById('add-tab');
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const settingsView = document.getElementById('settings-view');
const mainView = document.getElementById('main-view');
const gradientSelect = document.getElementById('gradient-select');
const fontSelect = document.getElementById('font-select');

const renderer = new marked.Renderer();
renderer.heading = (text, level) => {
  return `<div class="md-h${level}">${text}</div>`;
};
marked.setOptions({ breaks: true, renderer });

function createTab(title = 'New Note') {
  const id = Date.now().toString();
  const tab = { id, title, content: '' };
  tabs.push(tab);
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
  editor.value = currentTab.content;
  renderMarkdown();
  renderTabs();
}

function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;
  tabs.splice(index, 1);
  if (currentTab?.id === id) {
    currentTab = tabs[0] || null;
    if (currentTab) {
      editor.value = currentTab.content;
      renderMarkdown();
    } else {
      editor.value = '';
      preview.innerHTML = '';
    }
  }
  renderTabs();
}

function renderMarkdown() {
  if (!currentTab) return;
  const raw = editor.value;
  currentTab.content = raw;
  preview.innerHTML = marked.parse(raw);
}

addTabBtn.addEventListener('click', () => createTab());

editor.addEventListener('input', renderMarkdown);
editor.addEventListener('scroll', () => {
  preview.scrollTop = editor.scrollTop;
  preview.scrollLeft = editor.scrollLeft;
});

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

// Window controls
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

minBtn.addEventListener('click', () => window.api.windowControl('minimize'));
maxBtn.addEventListener('click', () => window.api.windowControl('maximize'));
closeBtn.addEventListener('click', () => window.api.windowControl('close'));

// Initialize
createTab('Note 1');
