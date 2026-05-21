const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize:    () => ipcRenderer.invoke('win-minimize'),
  maximize:    () => ipcRenderer.invoke('win-maximize'),
  isMaximized: () => ipcRenderer.invoke('win-is-maximized'),
  close:       () => ipcRenderer.invoke('win-close'),

  // File/Folder pickers
  pickFolder:  () => ipcRenderer.invoke('pick-folder'),
  pickFile:    (opts) => ipcRenderer.invoke('pick-file', opts),

  // Window state
  onWinState:  (cb) => ipcRenderer.on('win-state', (_e, data) => cb(data)),

  // Auto-Update
  onUpdateAvailable:  (cb) => ipcRenderer.on('update-available',  () => cb()),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb()),
  installUpdate:      ()   => ipcRenderer.invoke('install-update'),
  checkForUpdates:    ()   => ipcRenderer.invoke('check-for-updates'),

  // Bookmarks persistence
  bookmarksLoad: ()       => ipcRenderer.invoke('bookmarks-load'),
  bookmarksSave: (data)   => ipcRenderer.invoke('bookmarks-save', data),

  // Folder existence check
  checkFolderExists: (folderPath) => ipcRenderer.invoke('check-folder-exists', folderPath),

  // Custom App Icon
  pickIconFile:    ()          => ipcRenderer.invoke('pick-icon-file'),
  setCustomIcon:   (dataUrl)   => ipcRenderer.invoke('set-custom-icon', dataUrl),
})
