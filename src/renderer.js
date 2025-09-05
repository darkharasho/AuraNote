let tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
let currentTab = null;

const tabList = document.getElementById('tab-list');
const addTabBtn = document.getElementById('add-tab');
const editor = document.getElementById('editor');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const settingsView = document.getElementById('settings-view');
const mainView = document.getElementById('main-view');
const gradientSelect = document.getElementById('gradient-select');
const fontSelect = document.getElementById('font-select');

const processor = markedSequentialHooks({
  htmlHooks: [
    (html) => html.replace(/<p>/g, '<div>').replace(/<\/p>/g, '</div>')
  ]
});

marked.use(processor);
marked.setOptions({ breaks: true });

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
  editor.innerText = currentTab?.content || '';
  renderMarkdown();
  renderTabs();
}

function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;
  tabs.splice(index, 1);
  if (currentTab?.id === id) {
    currentTab = tabs[0] || null;
    editor.innerText = currentTab?.content || '';
    renderMarkdown();
  }
  saveTabs();
  renderTabs();
}

function getCaretCharacterOffsetWithin(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

function setCaretPosition(element, offset) {
  const range = document.createRange();
  const selection = window.getSelection();
  let current = 0;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    const next = current + node.length;
    if (offset <= next) {
      range.setStart(node, offset - current);
      break;
    }
    current = next;
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function renderMarkdown() {
  if (!currentTab) return;
  const caret = getCaretCharacterOffsetWithin(editor);
  const raw = editor.innerText;
  const html = marked.parse(raw);
  editor.innerHTML = html;
  setCaretPosition(editor, caret);

  currentTab.content = raw;
  saveTabs();
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
if (tabs.length) {
  renderTabs();
  switchTab(tabs[0].id);
} else {
  createTab('Note 1');
}
