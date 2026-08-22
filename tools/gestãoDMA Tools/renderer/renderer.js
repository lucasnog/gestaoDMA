// ─── Estado ─────────────────────────────────────────────
let modules = [];
let activeModuleId = null;
let activeScript = null;
let runningScripts = new Map();

// ─── DOM refs ──────────────────────────────────────────
const moduleListEl = document.getElementById('module-list');
const moduleTitle = document.getElementById('module-title');
const moduleDesc = document.getElementById('module-desc');
const scriptListEl = document.getElementById('script-list');
const consoleEl = document.getElementById('console');
const btnClear = document.getElementById('btn-clear');
const btnCopy = document.getElementById('btn-copy');

// Inputs
const scriptInputs = document.getElementById('script-inputs');
const inputFolderGroup = document.getElementById('input-folder-group');
const inputFolderLabel = document.getElementById('input-folder-label');
const inputFolder = document.getElementById('input-folder');
const btnBrowseFolder = document.getElementById('btn-browse-folder');
const inputFileGroup = document.getElementById('input-file-group');
const inputFileLabel = document.getElementById('input-file-label');
const inputFile = document.getElementById('input-file');
const btnBrowseFile = document.getElementById('btn-browse-file');
const inputSaidaGroup = document.getElementById('input-saida-group');
const inputSaidaLabel = document.getElementById('input-saida-label');
const inputSaida = document.getElementById('input-saida');
const btnBrowseSaida = document.getElementById('btn-browse-saida');

// ─── Inicialização ─────────────────────────────────────
async function init() {
  modules = await window.gestaoDMA.listModules();
  renderModules();
  if (modules.length > 0) {
    selectModule(modules[0].id);
  }
}

// ─── Renderizar módulos na sidebar ─────────────────────
function renderModules() {
  moduleListEl.innerHTML = '';
  for (const mod of modules) {
    const group = document.createElement('div');
    group.className = 'module-group';

    const btn = document.createElement('button');
    btn.className = 'module-btn' + (mod.id === activeModuleId ? ' active' : '');
    btn.textContent = mod.label;
    btn.dataset.moduleId = mod.id;
    btn.addEventListener('click', () => selectModule(mod.id));
    group.appendChild(btn);
    moduleListEl.appendChild(group);
  }
}

// ─── Selecionar módulo ─────────────────────────────────
function selectModule(moduleId) {
  activeModuleId = moduleId;
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return;

  document.querySelectorAll('.module-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.moduleId === moduleId);
  });

  moduleTitle.textContent = mod.label;
  moduleDesc.textContent = mod.description;

  renderScripts(mod.scripts);
}

// ─── localStorage: salvar último caminho usado ─────────
const STORAGE_PREFIX = 'gestao-dma-tools-';

function loadSaved(key) {
  try { return localStorage.getItem(STORAGE_PREFIX + key) || ''; } catch { return ''; }
}

function saveValue(key, value) {
  try { localStorage.setItem(STORAGE_PREFIX + key, value); } catch {}
}

// ─── Mostrar inputs do script selecionado ──────────────
function showScriptInputs(script) {
  activeScript = script;

  if (script.needsFolder) {
    inputFolderGroup.classList.remove('hidden');
    inputFolderLabel.textContent = script.folderLabel || '📂 Pasta de origem';
    inputFolder.value = loadSaved(script.name + '-folder') || script.folderDefault || '';
  } else {
    inputFolderGroup.classList.add('hidden');
  }

  if (script.needsFile) {
    inputFileGroup.classList.remove('hidden');
    inputFileLabel.textContent = script.fileLabel || '📄 Arquivo de entrada';
    inputFile.value = loadSaved(script.name + '-file') || script.fileDefault || '';
  } else {
    inputFileGroup.classList.add('hidden');
  }

  inputSaidaGroup.classList.remove('hidden');
  inputSaidaLabel.textContent = script.saidaLabel || '💾 Pasta de saída (.md)';
  inputSaida.value = loadSaved(script.name + '-saida') || script.saidaDefault || '';

  const hasInputs = script.needsFolder || script.needsFile;
  scriptInputs.classList.toggle('hidden', !hasInputs);
}

// ─── Renderizar scripts ────────────────────────────────
function renderScripts(scripts) {
  scriptListEl.innerHTML = '';
  scriptInputs.classList.add('hidden');

  for (const script of scripts) {
    const card = document.createElement('div');
    card.className = 'script-card';
    card.dataset.scriptName = script.name;

    const status = runningScripts.get(script.name);
    const statusClass = status === 'running' ? 'running' :
                        status === 'success' ? 'success' :
                        status === 'error' ? 'error' : 'idle';

    card.innerHTML = `
      <div class="script-name">
        <span class="run-indicator ${statusClass}"></span>
        ${script.label}
      </div>
      <div class="script-desc">${script.description}</div>
      <div class="script-meta">
        <span>📄 ${script.name}</span>
      </div>
      <button class="btn-run" data-path="${script.path}" data-name="${script.name}">
        ▶ Executar
      </button>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        showScriptInputs(script);
      }
    });

    const btnRun = card.querySelector('.btn-run');
    btnRun.addEventListener('click', (e) => {
      e.stopPropagation();
      showScriptInputs(script);
      runScript(script);
    });

    scriptListEl.appendChild(card);
  }
}

// ─── Montar argumentos CLI ────────────────────────────
function buildScriptArgs(script) {
  const args = [];
  if (script.needsFolder && inputFolder.value) {
    args.push(inputFolder.value);
  } else if (script.needsFile && inputFile.value) {
    args.push(inputFile.value);
  }
  if (inputSaida.value) {
    args.push('--saida', inputSaida.value);
    saveValue(script.name + '-saida', inputSaida.value);
  }
  if (script.needsFolder && inputFolder.value) saveValue(script.name + '-folder', inputFolder.value);
  if (script.needsFile && inputFile.value) saveValue(script.name + '-file', inputFile.value);
  return args;
}

// ─── Executar script ───────────────────────────────────
async function runScript(script) {
  const btnRun = document.querySelector(`[data-name="${script.name}"]`);
  if (btnRun?.disabled) return;

  runningScripts.set(script.name, 'running');
  btnRun.disabled = true;
  btnRun.textContent = '⏳ Executando...';
  updateIndicators(script.name);

  const args = buildScriptArgs(script);
  appendToConsole(`\n═══════ Executando: ${script.name} ${args.join(' ')} ═══════\n`, 'highlight');

  try {
    const result = await window.gestaoDMA.runScript(script.path, script.name, args);

    if (result.code === 0) {
      runningScripts.set(script.name, 'success');
      appendToConsole(`\n✅ Concluído (código ${result.code})\n`, 'success');
    } else {
      runningScripts.set(script.name, 'error');
      appendToConsole(`\n❌ Erro (código ${result.code})\n`, 'error');
    }
  } catch (err) {
    runningScripts.set(script.name, 'error');
    appendToConsole(`\n❌ ${err}\n`, 'error');
  }

  btnRun.disabled = false;
  btnRun.textContent = '▶ Executar';
  updateIndicators(script.name);

  consoleEl.scrollTop = consoleEl.scrollHeight;
}

// ─── Atualizar indicadores de status ──────────────────
function updateIndicators(scriptName) {
  document.querySelectorAll('.script-card').forEach(card => {
    const name = card.dataset.scriptName;
    if (name === scriptName || !scriptName) {
      const indicator = card.querySelector('.run-indicator');
      const status = runningScripts.get(name) || 'idle';
      indicator.className = `run-indicator ${status}`;
    }
  });
}

// ─── Console ──────────────────────────────────────────
function appendToConsole(text, className = '') {
  const span = document.createElement('span');
  if (className) span.className = className;
  span.textContent = text;
  consoleEl.appendChild(span);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

btnClear.addEventListener('click', () => {
  consoleEl.innerHTML = '<span class="dim">Console limpo.</span>';
});

btnCopy.addEventListener('click', () => {
  const text = consoleEl.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btnCopy.textContent = '✅ Copiado';
    setTimeout(() => { btnCopy.textContent = 'Copiar'; }, 1500);
  });
});

// ─── Browse ────────────────────────────────────────────
async function browseFolder(inputEl, key) {
  const folder = await window.gestaoDMA.pickFolder(inputEl.value || undefined);
  if (folder) {
    inputEl.value = folder;
    if (activeScript) saveValue(activeScript.name + key, folder);
  }
}

async function browseFile(inputEl, key) {
  const file = await window.gestaoDMA.pickFile(inputEl.value || undefined);
  if (file) {
    inputEl.value = file;
    if (activeScript) saveValue(activeScript.name + key, file);
  }
}

async function browseSaida(inputEl, key) {
  const folder = await window.gestaoDMA.pickFolder(inputEl.value || undefined);
  if (folder) {
    inputEl.value = folder;
    if (activeScript) saveValue(activeScript.name + key, folder);
  }
}

btnBrowseFolder.addEventListener('click', () => browseFolder(inputFolder, '-folder'));
inputFolder.addEventListener('click', () => browseFolder(inputFolder, '-folder'));
btnBrowseFile.addEventListener('click', () => browseFile(inputFile, '-file'));
inputFile.addEventListener('click', () => browseFile(inputFile, '-file'));
btnBrowseSaida.addEventListener('click', () => browseSaida(inputSaida, '-saida'));
inputSaida.addEventListener('click', () => browseSaida(inputSaida, '-saida'));

// ─── Eventos do Electron ──────────────────────────────
window.gestaoDMA.onScriptOutput(({ scriptName, text, isError }) => {
  appendToConsole(text, isError ? 'error' : '');
});

// ─── Iniciar ──────────────────────────────────────────
init();
