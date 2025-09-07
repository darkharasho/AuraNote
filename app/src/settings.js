let tabs = [];
try {
  tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
} catch {
  localStorage.removeItem('tabs');
}

window.api?.getVersion?.().then(version => {
  const titleEl = document.getElementById('app-title');
  if (titleEl) titleEl.textContent = `AuraNote v${version}`;
});

const tabButtons = document.querySelectorAll('#tabs .tab');
const sections = document.querySelectorAll('.settings-section');
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + btn.dataset.section).classList.add('active');
  });
});

const confirmCloseSelect = document.getElementById('confirm-close-select');
confirmCloseSelect.value = localStorage.getItem('confirm-close') || 'off';
confirmCloseSelect.addEventListener('change', e => {
  localStorage.setItem('confirm-close', e.target.value);
});

const checkUpdateBtn = document.getElementById('check-update-btn');
checkUpdateBtn.addEventListener('click', () => window.api?.checkForUpdates?.());

function showToast(msg, action) {
  const toast = document.createElement('div');
  toast.className = action ? 'toast toast-action' : 'toast';
  toast.textContent = msg;
  if (action) {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      action.onClick();
      toast.remove();
    });
    toast.appendChild(btn);
    setTimeout(() => toast.remove(), 10000);
  } else {
    setTimeout(() => toast.remove(), 3000);
  }
  document.body.appendChild(toast);
}

window.api?.onUpdateNotAvailable?.(() => {
  showToast('You are up to date');
});

window.api?.onUpdateDownloaded?.(() => {
  showToast('Update ready', {
    label: 'Install',
    onClick: () => window.api.installUpdate()
  });
});

const gradientSelect = document.getElementById('gradient-select');
const gradientPreview = document.getElementById('gradient-preview');
const gradientOutlineSelect = document.getElementById('gradient-outline-select');
const glowSelect = document.getElementById('glow-select');
const fontSelect = document.getElementById('font-select');
const themeSelect = document.getElementById('theme-select');

const defaultGlowOpacity = '0.35';
const defaultGradientOpacity = '0.5';

function applyGlow(enabled, persist = true) {
  document.body.style.setProperty('--glow-opacity', enabled ? defaultGlowOpacity : '0');
  if (persist) localStorage.setItem('glow', enabled ? 'on' : 'off');
}

function applyGradientOutline(enabled, persist = true) {
  document.body.style.setProperty('--gradient-opacity', enabled ? defaultGradientOpacity : '0');
  if (persist) localStorage.setItem('gradient-outline', enabled ? 'on' : 'off');
}

function applyTheme(theme, persist = true) {
  document.body.classList.remove('theme-dark', 'theme-light', 'theme-acrylic', 'theme-kurzgesagt', 'theme-deep-ocean');
  if (theme === 'light-mica') {
    document.body.classList.add('theme-light');
  } else if (theme === 'acrylic') {
    document.body.classList.add('theme-acrylic');
  } else if (theme === 'kurzgesagt') {
    document.body.classList.add('theme-kurzgesagt');
    document.body.classList.add('theme-dark');
  } else if (theme === 'deep-ocean') {
    document.body.classList.add('theme-deep-ocean');
    document.body.classList.add('theme-dark');
  } else {
    document.body.classList.add('theme-dark');
  }
  if (window.api?.setTheme) window.api.setTheme(theme);
  if (persist) localStorage.setItem('theme', theme);
}

const savedGradient = localStorage.getItem('gradient') || gradientSelect.value;
gradientSelect.value = savedGradient;
document.body.style.setProperty('--border-gradient', savedGradient);
gradientPreview.style.background = savedGradient;

const savedFont = localStorage.getItem('font');
if (savedFont) {
  fontSelect.value = savedFont;
  document.body.style.setProperty('--app-font', "'" + savedFont + "', sans-serif");
}

const savedGlow = localStorage.getItem('glow') || 'on';
glowSelect.value = savedGlow;
applyGlow(savedGlow === 'on', false);

const savedGradientOutline = localStorage.getItem('gradient-outline') || 'on';
gradientOutlineSelect.value = savedGradientOutline;
applyGradientOutline(savedGradientOutline === 'on', false);

const savedTheme = localStorage.getItem('theme') || 'dark-mica';
themeSelect.value = savedTheme;
applyTheme(savedTheme, false);

gradientSelect.addEventListener('change', e => {
  document.body.style.setProperty('--border-gradient', e.target.value);
  gradientPreview.style.background = e.target.value;
  localStorage.setItem('gradient', e.target.value);
});

glowSelect.addEventListener('change', e => applyGlow(e.target.value === 'on'));

gradientOutlineSelect.addEventListener('change', e => applyGradientOutline(e.target.value === 'on'));

fontSelect.addEventListener('change', e => {
  document.body.style.setProperty('--app-font', "'" + e.target.value + "', sans-serif");
  localStorage.setItem('font', e.target.value);
});

themeSelect.addEventListener('change', e => applyTheme(e.target.value));

function renderExportList() {
  const list = document.getElementById('export-list');
  list.innerHTML = '';
  tabs.forEach(tab => {
    const div = document.createElement('div');
    div.className = 'export-item';
    const span = document.createElement('span');
    span.textContent = tab.title;
    const btn = document.createElement('button');
    btn.textContent = 'Export';
    btn.className = 'gradient-btn';
    btn.addEventListener('click', () => window.api.exportTab(tab));
    div.appendChild(span);
    div.appendChild(btn);
    list.appendChild(div);
  });
}

renderExportList();

document.getElementById('import-btn').addEventListener('click', async () => {
  const result = await window.api.importMd();
  if (!result) return;
  const id = Date.now().toString();
  tabs.push({ id, title: result.name, content: result.content, folderId: null });
  localStorage.setItem('tabs', JSON.stringify(tabs));
  renderExportList();
});

window.addEventListener('storage', e => {
  if (e.key === 'tabs') {
    tabs = JSON.parse(localStorage.getItem('tabs') || '[]');
    renderExportList();
  }
});

const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');
const settingsBtn = document.getElementById('settings-btn');

minBtn.addEventListener('click', () => window.api.windowControl('minimize'));
maxBtn.addEventListener('click', () => window.api.windowControl('maximize'));
settingsBtn.addEventListener('click', () => window.api.openMain());
closeBtn.addEventListener('click', () => {
  if (window.api?.windowControl) {
    window.api.windowControl('close');
  } else {
    window.close();
  }
});
