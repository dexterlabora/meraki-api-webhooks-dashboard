const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1450,
    height: 5000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, 'server.js');
    serverProcess = fork(serverPath);

    serverProcess.on('message', (msg) => {
      if (msg === 'ready') {
        resolve();
      }
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server process:', err);
      reject(err);
    });
  });
}

app.on('ready', async () => {
  try {
    await startServer();
    createWindow();
  } catch (error) {
    console.error('Error starting server:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('App is quitting. Cleaning up...');
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('will-quit', (event) => {
  console.log('Will quit event triggered.');
  // Prevent default behavior if the server hasn't exited yet
  if (serverProcess && !serverProcess.killed) {
    event.preventDefault();
    serverProcess.on('exit', () => {
      app.quit();
    });
    serverProcess.kill();
  }
});

