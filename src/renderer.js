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
    const btn = document.createElement('button');
    btn.textContent = tab.title;
    btn.dataset.id = tab.id;
    if (tab.id === currentTab?.id) btn.classList.add('active');
    btn.addEventListener('click', () => switchTab(tab.id));
    tabList.appendChild(btn);
  });
}

function switchTab(id) {
  currentTab = tabs.find(t => t.id === id);
  editor.value = currentTab.content;
  renderMarkdown();
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

// Window controls
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

minBtn.addEventListener('click', () => window.api.windowControl('minimize'));
maxBtn.addEventListener('click', () => window.api.windowControl('maximize'));
closeBtn.addEventListener('click', () => window.api.windowControl('close'));

// Initialize
createTab('Note 1');
