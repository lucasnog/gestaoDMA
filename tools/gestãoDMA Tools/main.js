const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// ─── Raiz dos projetos ─────────────────────────────────────
const GESTAO_DMA_ROOT = path.resolve('C://projetos//Projeto GOINFRA//gestaoDMA');
const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const BACKEND_DB = path.resolve('C://projetos//Projeto GOINFRA//GEMOC-ANALYTICS1//database//database.sqlite');

// ─── Módulos ────────────────────────────────────────────
const MODULES = [
  {
    id: 'texto-md',
    label: '📄 Texto → Markdown (LGPD)',
    description: 'Converte texto para .md removendo dados pessoais protegidos pela LGPD',
    scripts: [
      {
        name: 'converter-md-lgpd.mjs',
        label: '🛡️ Converter texto → .md (sanitizado)',
        description: 'Lê um arquivo de texto, converte para Markdown e remove automaticamente dados sensíveis (CPF, CNPJ, e-mail, telefone, RG, CNS, nome próprio, endereço). Gera o .md limpo + relatório do que foi removido.',
        path: path.join(SCRIPTS_DIR, 'converter-md-lgpd.mjs'),
        ext: '.mjs',
        needsFile: true,
        fileLabel: '📄 Arquivo de texto de entrada (.txt)',
      },
      {
        name: 'converter-md-lgpd.mjs',
        label: '📁 Converter pasta de textos → .md',
        description: 'Converte todos os .txt de uma pasta para .md sanitizados (1:1), gerando um relatório consolidado.',
        path: path.join(SCRIPTS_DIR, 'converter-md-lgpd.mjs'),
        ext: '.mjs',
        needsFolder: true,
        folderLabel: '📂 Pasta com os arquivos .txt',
      },
    ]
  },
];

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Gestão DMA Tools',
    autoHideMenuBar: true,
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── IPC: Listar módulos ───────────────────────────────

ipcMain.handle('list-modules', () => MODULES);

// ─── IPC: Executar script ──────────────────────────────

ipcMain.handle('run-script', async (_event, scriptPath, scriptName, args = []) => {
  const ext = path.extname(scriptPath);

  return new Promise((resolve, reject) => {
    const cwd = path.dirname(scriptPath);
    const child = ext === '.py'
      ? spawn('python', [scriptPath, ...args], { cwd, shell: false, env: { ...process.env }, windowsHide: true })
      : spawn('node', [scriptPath, ...args], { cwd, shell: false, env: { ...process.env }, windowsHide: true });

    let output = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      win?.webContents.send('script-output', { scriptName, text });
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      win?.webContents.send('script-output', { scriptName, text, isError: true });
    });

    child.on('close', (code) => {
      win?.webContents.send('script-done', { scriptName, code });
      resolve({ code, output });
    });

    child.on('error', (err) => {
      reject(err.message);
    });
  });
});

// ─── IPC: Diálogos ─────────────────────────────────────

ipcMain.handle('pick-folder', async (_event, defaultPath) => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Selecione uma pasta',
    defaultPath: defaultPath || undefined,
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('pick-file', async (_event, defaultPath) => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    title: 'Selecione o arquivo de texto',
    defaultPath: defaultPath || undefined,
    filters: [{ name: 'Texto', extensions: ['txt', 'md', 'log', 'json'] }],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('pick-save-file', async (_event, defaultPath) => {
  const result = await dialog.showSaveDialog(win, {
    title: 'Salvar arquivo como...',
    defaultPath: defaultPath || 'output.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});
