const {
  app, BrowserWindow, ipcMain, dialog,
  Tray, Menu, globalShortcut,
} = require('electron')
const path      = require('path')
const fs        = require('fs')
const os        = require('os')
const net       = require('net')
const { spawn, execSync } = require('child_process')
const { autoUpdater }     = require('electron-updater')

// ── Lazy-load Express + Socket.IO (bundled via npm) ──────────────────────────
let httpServer, io   // set in startInProcessServer()

let mainWindow = null
let tray       = null

// ── Hidden state tracking for external apps ──────────────────────────────────
const appHidden = { voicevox: false, bouyomichan: false }

// ─── Detect if a process has no visible window (i.e. was hidden) ─────────────
function isWindowHidden(procName) {
  const baseName = procName.replace(/\.exe$/i, '')
  const psScript = `
$ProgressPreference = 'SilentlyContinue'
$procs = Get-Process -Name '${baseName}' -ErrorAction SilentlyContinue
if (-not $procs) { Write-Output 'notrunning'; exit }
$anyVisible = $false
foreach ($p in $procs) {
  if ($p.MainWindowHandle -ne [IntPtr]::Zero) { $anyVisible = $true; break }
}
if ($anyVisible) { Write-Output 'visible' } else { Write-Output 'hidden' }
`
  try {
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    const out = execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, {
      timeout: 5000, windowsHide: true,
    }).toString().trim()
    return out === 'hidden'
  } catch (_) { return false }
}

// ─── Sync appHidden state with actual window visibility on startup ────────────
function syncHiddenState() {
  appHidden.voicevox    = isWindowHidden('VOICEVOX.exe')
  appHidden.bouyomichan = isWindowHidden('BouyomiChan.exe')
}
// ════════════════════════════════════════════════════════════════════════════
// PATHS
// ════════════════════════════════════════════════════════════════════════════
const APPDATA        = process.env.APPDATA || os.homedir()
const DIR_SETTINGS        = path.join(APPDATA, 'NYANNAPP', 'settings')
const DIR_SETTINGS_BACKUP = path.join(APPDATA, 'NYANNAPP', 'settings_backup')
const SETTINGS_FILE       = path.join(DIR_SETTINGS, 'NYANNAPP_settings.json')

const DEFAULT_LOG = path.join(
  os.homedir(), 'Documents', 'SEGA', 'PHANTASYSTARONLINE2', 'log_ngs'
)

function getHtmlPath() {
  if (app.isPackaged) {
    const candidates = [
      path.join(process.resourcesPath, 'app.asar.unpacked', 'app_files', 'NYANNAPP.html'),
      path.join(process.resourcesPath, 'app_files', 'NYANNAPP.html'),
      path.join(path.dirname(app.getPath('exe')), 'resources', 'app_files', 'NYANNAPP.html'),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
    return candidates[0] // fallback (will show error naturally)
  }
  return path.join(__dirname, 'app_files', 'NYANNAPP.html')
}

function getIconPath() {
  if (app.isPackaged) {
    const candidates = [
      path.join(process.resourcesPath, 'app.asar.unpacked', 'app_files', 'icon.ico'),
      path.join(process.resourcesPath, 'app_files', 'icon.ico'),
      path.join(path.dirname(app.getPath('exe')), 'resources', 'app_files', 'icon.ico'),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
    return candidates[0]
  }
  return path.join(__dirname, 'app_files', 'icon.ico')
}

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════════════════════
const DEFAULT_CMD_PREFIXES = [
  '/la','/cla','/e','/c','/item','/s','/w','/p','/t','/g',
  '/mn','/ci','/cf','/stamp','/cos','/cam','/a','/moya',
]

const settings = {
  log_dir:         DEFAULT_LOG,
  log_dir_classic: '',
  channels:        ['PUBLIC','PARTY','TEAM','GUILD','WHISPER','GROUP'],
  cmd_prefixes:    [...DEFAULT_CMD_PREFIXES],
  running:         false,
}

function loadSettings() {
  fs.mkdirSync(DIR_SETTINGS,        { recursive: true })
  fs.mkdirSync(DIR_SETTINGS_BACKUP, { recursive: true })
  try {
    const d = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
    Object.assign(settings, d)
    settings.running = false
  } catch (_) {}
}

function saveSettings() {
  try {
    fs.mkdirSync(DIR_SETTINGS, { recursive: true })
    const { running: _r, ...rest } = settings   // exclude runtime state
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(rest, null, 2), 'utf8')
  } catch (e) {
    console.error('[Settings] save error:', e.message)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// LOG WATCHER
// ════════════════════════════════════════════════════════════════════════════
const LOG_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\t\d+\t([A-Za-z]+)\t(\d+)\t(.+?)\t(.+)$/

let watcherTimer = null
let seenBytes    = {}     // filePath → byte offset already processed
let dedupSeen    = new Set()

// ─── Command-arg stripping (ported from Python CMD_ARG_TABLE) ────────────────
const CMD_ARG_TABLE = [
  [/^\/cf$/i,           -1],
  [/^\/ce$/i,           -1],
  [/^\/ceall$/i,        -1],
  [/^\/background$/i,    2],
  [/^\/pr$/i,            2],
  [/^\/uioff$/i,         1],
  [/^\/face\d+$/i,       0],
  [/^\/fc(\d+|off)$/i,   0],
  [/^\/vo\d+$/i,         0],
  [/^\/mn\d+$/i,         0],
  [/^\/ms\d+$/i,         0],
  [/^\/myset\d+$/i,      0],
  [/^\/spal\d+$/i,       0],
  [/^\/subpalette\d+$/i, 0],
  [/^\/bl$/i,            0],
  [/^\/.+/,             -1],   // generic: any /command — greedy
]

function isCmdArg(tok) {
  return /^[a-zA-Z0-9_\-.]+\+?$/.test(tok) && [...tok].every(c => c.charCodeAt(0) < 128)
}

function stripCommands(msg) {
  const tokens = msg.split(' ')
  const out    = []
  let i        = 0
  while (i < tokens.length) {
    const tok = tokens[i]
    if (!tok) { i++; continue }
    if (tok.startsWith('/')) {
      let consume = -1
      for (const [pat, n] of CMD_ARG_TABLE) {
        if (pat.test(tok)) { consume = n; break }
      }
      i++
      if (consume === -1) {
        while (i < tokens.length && tokens[i] && isCmdArg(tokens[i])) i++
      } else {
        let skipped = 0
        while (i < tokens.length && skipped < consume) { if (tokens[i]) skipped++; i++ }
      }
      continue
    }
    out.push(tok)
    i++
  }
  return out.join(' ').trim()
}

// ─── Read new bytes from a file since last seen offset ───────────────────────
// PSO2 NGS writes ChatLog in UTF-16LE with BOM (FF FE) at the very start.
// We track the byte offset already processed and decode only the new chunk.
// This avoids the trailing-newline line-count off-by-one bug entirely.
function readNewLines(filePath, prevBytes) {
  let raw
  try { raw = fs.readFileSync(filePath) } catch (_) { return { lines: [], totalBytes: prevBytes } }

  const totalBytes = raw.length
  if (totalBytes <= prevBytes) return { lines: [], totalBytes }

  const isUtf16le = raw.length >= 2 && raw[0] === 0xFF && raw[1] === 0xFE

  let text
  if (isUtf16le) {
    if (prevBytes < 2) {
      // First read — decode whole file and strip BOM
      text = raw.toString('utf16le').replace(/^\uFEFF/, '')
    } else {
      // Subsequent reads — slice from byte offset (keep alignment even)
      const offset = prevBytes % 2 === 0 ? prevBytes : prevBytes - 1
      text = raw.slice(offset).toString('utf16le')
    }
  } else {
    // UTF-8 fallback
    text = raw.slice(prevBytes).toString('utf8')
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim())
  return { lines, totalBytes }
}

// ─── Get up to 3 latest ChatLog*.txt from a folder ──────────────────────────
function latestFilesFrom(folder) {
  if (!folder) return []
  try { if (!fs.statSync(folder).isDirectory()) return [] } catch (_) { return [] }
  return fs.readdirSync(folder)
    .filter(f => f.startsWith('ChatLog') && f.endsWith('.txt'))
    .sort()
    .slice(-3)
    .map(f => path.join(folder, f))
}

function latestFiles() {
  return [
    ...latestFilesFrom(settings.log_dir),
    ...latestFilesFrom(settings.log_dir_classic),
  ]
}

// ─── Channel alias map ───────────────────────────────────────────────────────
const CH_ALIAS = { GUILD: 'TEAM', REPLY: 'WHISPER' }

// ─── Emit helper ─────────────────────────────────────────────────────────────
function emitDebug(text) { io?.emit('debug', { text }) }

// ─── Snapshot: read all existing content, mark as seen, seed dedup ───────────
function snapshotFiles() {
  for (const f of latestFiles()) {
    const { lines, totalBytes } = readNewLines(f, 0)
    seenBytes[f] = totalBytes
    for (const raw of lines) {
      const m = LOG_RE.exec(raw.trim())
      if (m) {
        const [, dt, , , name, msg] = m   // [full, dt, chRaw(skip), player_id(skip), name, msg]
        dedupSeen.add(`${dt}\x00${name}\x00${msg.trim()}`)
      }
    }
    emitDebug(`[Watcher] snapshot: ${path.basename(f)} (${totalBytes} bytes, ${lines.length} lines)`)
  }
}

// ─── Poll tick ───────────────────────────────────────────────────────────────
function watcherTick() {
  for (const filePath of latestFiles()) {
    const prev = seenBytes[filePath] ?? 0
    const { lines: newLines, totalBytes } = readNewLines(filePath, prev)

    if (!(filePath in seenBytes)) {
      emitDebug(`[Watcher] new file: ${path.basename(filePath)}`)
    }
    seenBytes[filePath] = totalBytes   // set AFTER the check above

    for (const raw of newLines) {
      const line = raw.trim()
      if (!line) continue
      const m = LOG_RE.exec(line)
      if (!m) { emitDebug(`[skip] ${line.slice(0, 80)}`); continue }

      const [, dt, chRaw, player_id, name, msg] = m
      const ch = CH_ALIAS[chRaw.toUpperCase()] || chRaw.toUpperCase()
      const ts = dt.slice(11, 19)

      if (!settings.channels.includes(ch)) continue

      const key = `${dt}\x00${name}\x00${msg.trim()}`
      if (dedupSeen.has(key)) { emitDebug(`[dedup] ${name}: ${msg.slice(0, 50)}`); continue }
      dedupSeen.add(key)
      if (dedupSeen.size > 5000) {
        // Take a stable snapshot first, then delete — avoids mutating Set during iteration
        const toDelete = Array.from(dedupSeen).slice(0, 1000)
        for (const k of toDelete) dedupSeen.delete(k)
      }

      const cleanMsg = stripCommands(msg)
      if (!cleanMsg) { emitDebug(`[filter] ${name}: all commands: ${msg.slice(0, 50)}`); continue }

      emitDebug(`[line] ${ts} ${ch} ${name}: ${msg.slice(0, 50)}`)
      if (cleanMsg !== msg.trim()) emitDebug(`[strip] cleaned: ${cleanMsg.slice(0, 50)}`)

      io?.emit('message', { ts, name, ch, orig: cleanMsg, clean: cleanMsg, tl: null, player_id })
    }
  }
}

// ─── Start / Stop watcher ────────────────────────────────────────────────────
function startWatcher(data) {
  const prevDir         = settings.log_dir
  const prevDirClassic  = settings.log_dir_classic
  Object.assign(settings, data)
  saveSettings()
  const dirChanged = (prevDir !== settings.log_dir) || (prevDirClassic !== settings.log_dir_classic)

  if (settings.running && !dirChanged) return   // nothing to do

  if (watcherTimer) { clearInterval(watcherTimer); watcherTimer = null }
  seenBytes = {}
  dedupSeen = new Set()

  const logDir         = settings.log_dir
  const logDirClassic  = settings.log_dir_classic || ''

  for (const [label, folder] of [['NGS', logDir], ['Classic', logDirClassic]]) {
    if (!folder) continue
    const files = latestFilesFrom(folder)
    emitDebug(`[Watcher] ${label} folder: ${folder}`)
    emitDebug(`[Watcher] monitoring ${files.length} file(s) [${label}]:`)
    files.forEach(f => emitDebug(`  -> ${path.basename(f)}`))
  }

  snapshotFiles()
  watcherTimer = setInterval(watcherTick, 400)
  settings.running = true
  io?.emit('status', { running: true })
}

function stopWatcher() {
  if (watcherTimer) { clearInterval(watcherTimer); watcherTimer = null }
  settings.running = false
  io?.emit('status', { running: false })
}

// ════════════════════════════════════════════════════════════════════════════
// IN-PROCESS HTTP + SOCKET.IO SERVER  (replaces Python entirely)
// ════════════════════════════════════════════════════════════════════════════
async function startInProcessServer() {
  // require here so Electron main bundle doesn't need them at top level
  const express  = require('express')
  const http     = require('http')
  const { Server } = require('socket.io')

  const expressApp = express()
  expressApp.use(express.json())

  // ── Serve HTML ────────────────────────────────────────────────────────────
  expressApp.get('/', (_req, res) => {
    const htmlPath = getHtmlPath()
    if (!fs.existsSync(htmlPath)) {
      return res.status(404).send(`<h2>Not found</h2><p>${htmlPath}</p>`)
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.send(fs.readFileSync(htmlPath, 'utf8'))
  })

  // ── /save_appsettings ─────────────────────────────────────────────────────
  expressApp.post('/save_appsettings', (req, res) => {
    try {
      fs.mkdirSync(DIR_SETTINGS, { recursive: true })
      const p = path.join(DIR_SETTINGS, 'appsettings.json')
      fs.writeFileSync(p, JSON.stringify(req.body, null, 2), 'utf8')
      res.json({ ok: true })
    } catch (e) { res.json({ ok: false, error: e.message }) }
  })

  // ── /load_appsettings ─────────────────────────────────────────────────────
  expressApp.get('/load_appsettings', (_req, res) => {
    try {
      const p = path.join(DIR_SETTINGS, 'appsettings.json')
      if (!fs.existsSync(p)) return res.status(404).json({ error: 'not found' })
      res.json(JSON.parse(fs.readFileSync(p, 'utf8')))
    } catch (e) { res.json({ error: e.message }) }
  })

  // ── /bouyomi_running ─────────────────────────────────────────────────────
  expressApp.get('/bouyomi_running', (req, res) => {
    const port = parseInt(req.query.port || '50080', 10)
    // reuse the already-required http module (no re-require needed)
    let answered = false
    const done = (running) => { if (!answered) { answered = true; res.json({ running }) } }
    const request = http.get(`http://127.0.0.1:${port}/`, (r) => {
      r.resume()
      done(true)
    })
    request.setTimeout(800, () => { request.destroy(); done(false) })
    request.on('error', () => done(false))
  })

  // ── /launch_bouyomi ───────────────────────────────────────────────────────
  expressApp.post('/launch_bouyomi', (req, res) => {
    const exePath = (req.body.path || '').trim()
    if (!exePath)                return res.json({ ok: false, error: 'ไม่มี path' })
    if (!fs.existsSync(exePath)) return res.json({ ok: false, error: `ไม่พบไฟล์: ${exePath}` })
    try {
      spawn(exePath, [], { cwd: path.dirname(exePath), detached: true, stdio: 'ignore' }).unref()
      res.json({ ok: true })
    } catch (e) { res.json({ ok: false, error: e.message }) }
  })

  // ── /auto_launch_bouyomi ─────────────────────────────────────────────────
  expressApp.post('/auto_launch_bouyomi', (req, res) => {
    const exePath = (req.body.path || '').trim()
    const port    = parseInt(req.body.port || '50080', 10)
    if (!exePath)                return res.json({ ok: false, error: 'ไม่มี path' })
    if (!fs.existsSync(exePath)) return res.json({ ok: false, error: `ไม่พบไฟล์: ${exePath}` })

    // check if already running via HTTP (avoids TCP EndOfStreamException in BouyomiChan)
    // reuse the already-required http module (no re-require needed)
    let answered = false
    const launch = () => {
      if (answered) return
      answered = true
      let resSent = false
      try {
        // Launch normally so the app can fully init and create its tray icon,
        // then SW_HIDE the window after 3 s (guarantees tray icon is registered first)
        const psLaunch = `Start-Process -FilePath '${exePath.replace(/'/g, "''")}' -WorkingDirectory '${path.dirname(exePath).replace(/'/g, "''")}' -WindowStyle Normal`
        const encodedLaunch = Buffer.from(psLaunch, 'utf16le').toString('base64')
        execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encodedLaunch}`, { timeout: 6000, windowsHide: true })
        resSent = true
        res.json({ ok: true, skipped: false })
        // Deferred hide — let the app finish initializing before hiding
        const baseName = exePath.replace(/\\/g, '/').split('/').pop().replace(/\.exe$/i, '')
        setTimeout(() => {
          try {
            const psHide = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class NyannAutoHideB { [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n); }
'@
foreach ($p in (Get-Process -Name '${baseName}' -ErrorAction SilentlyContinue)) {
  if ($p.MainWindowHandle -ne [IntPtr]::Zero) { [NyannAutoHideB]::ShowWindow($p.MainWindowHandle, 0) | Out-Null }
}`
            const encodedHide = Buffer.from(psHide, 'utf16le').toString('base64')
            execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encodedHide}`, { timeout: 6000, windowsHide: true })
          } catch (_) {}
        }, 3000)
      } catch (e) { if (!resSent) res.json({ ok: false, error: e.message }) }
    }
    const request = http.get(`http://127.0.0.1:${port}/`, (r) => {
      r.resume()
      if (!answered) { answered = true; res.json({ ok: true, skipped: true, reason: 'already running' }) }
    })
    request.setTimeout(500, () => { request.destroy(); launch() })
    request.on('error', () => launch())
  })

  // ── /launch_voicevox ─────────────────────────────────────────────────────
  expressApp.post('/launch_voicevox', (req, res) => {
    const exePath = (req.body.path || '').trim()
    if (!exePath)                return res.json({ ok: false, error: 'ไม่มี path' })
    if (!fs.existsSync(exePath)) return res.json({ ok: false, error: `ไม่พบไฟล์: ${exePath}` })
    try {
      spawn(exePath, [], { cwd: path.dirname(exePath), detached: true, stdio: 'ignore' }).unref()
      res.json({ ok: true })
    } catch (e) { res.json({ ok: false, error: e.message }) }
  })

  // ── /auto_launch_voicevox ────────────────────────────────────────────────
  expressApp.post('/auto_launch_voicevox', (req, res) => {
    const exePath = (req.body.path || '').trim()
    const port    = parseInt(req.body.port || '50021', 10)
    if (!exePath)                return res.json({ ok: false, error: 'ไม่มี path' })
    if (!fs.existsSync(exePath)) return res.json({ ok: false, error: `ไม่พบไฟล์: ${exePath}` })

    let answered = false
    const launch = () => {
      if (answered) return
      answered = true
      let resSent = false
      try {
        // Launch normally so the app can fully init and create its tray icon,
        // then SW_HIDE the window after 3 s (guarantees tray icon is registered first)
        const psLaunch = `Start-Process -FilePath '${exePath.replace(/'/g, "''")}' -WorkingDirectory '${path.dirname(exePath).replace(/'/g, "''")}' -WindowStyle Normal`
        const encodedLaunch = Buffer.from(psLaunch, 'utf16le').toString('base64')
        execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encodedLaunch}`, { timeout: 6000, windowsHide: true })
        resSent = true
        res.json({ ok: true, skipped: false })
        // Deferred hide — let the app finish initializing before hiding
        const baseName = exePath.replace(/\\/g, '/').split('/').pop().replace(/\.exe$/i, '')
        setTimeout(() => {
          try {
            const psHide = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class NyannAutoHideV { [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n); }
'@
foreach ($p in (Get-Process -Name '${baseName}' -ErrorAction SilentlyContinue)) {
  if ($p.MainWindowHandle -ne [IntPtr]::Zero) { [NyannAutoHideV]::ShowWindow($p.MainWindowHandle, 0) | Out-Null }
}`
            const encodedHide = Buffer.from(psHide, 'utf16le').toString('base64')
            execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encodedHide}`, { timeout: 6000, windowsHide: true })
          } catch (_) {}
        }, 3000)
      } catch (e) { if (!resSent) res.json({ ok: false, error: e.message }) }
    }
    const request = http.get(`http://127.0.0.1:${port}/`, (r) => {
      r.resume()
      if (!answered) { answered = true; res.json({ ok: true, skipped: true, reason: 'already running' }) }
    })
    request.setTimeout(800, () => { request.destroy(); launch() })
    request.on('error', () => launch())
  })

  // ── /minimize_app ─────────────────────────────────────────────────────────
  // Minimize all visible windows whose process name matches (case-insensitive)
  // Uses PowerShell -EncodedCommand + Win32 ShowWindow(hWnd, SW_MINIMIZE=6)
  expressApp.post('/minimize_app', (req, res) => {
    const procName = (req.body.process || '').trim()   // e.g. "VOICEVOX.exe"
    if (!procName) return res.json({ ok: false, error: 'process name required' })

    const baseName = procName.replace(/\.exe$/i, '')

    const psScript = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class NyannWin32 {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@
$procs = Get-Process -Name '${baseName}' -ErrorAction SilentlyContinue
$count = 0
foreach ($p in $procs) {
  if ($p.MainWindowHandle -ne [IntPtr]::Zero) {
    [NyannWin32]::ShowWindow($p.MainWindowHandle, 6) | Out-Null
    $count++
  }
}
Write-Output $count
`
    // Encode as UTF-16LE Base64 for -EncodedCommand (avoids all quote/newline issues)
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')

    try {
      const out = execSync(
        `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 6000, encoding: 'utf8', windowsHide: true }
      ).trim()
      const count = parseInt(out) || 0
      res.json({ ok: true, minimized: count })
    } catch (e) {
      res.json({ ok: false, error: e.message })
    }
  })

  // ── /hide_app ─────────────────────────────────────────────────────────────
  // Hide all visible windows of a process from Taskbar (SW_HIDE = 0)
  // Window remains running; app's own tray icon stays visible
  expressApp.post('/hide_app', (req, res) => {
    const procName = (req.body.process || '').trim()
    if (!procName) return res.json({ ok: false, error: 'process name required' })

    const baseName = procName.replace(/\.exe$/i, '')

    const psScript = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class NyannWin32Hide {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@
$procs = Get-Process -Name '${baseName}' -ErrorAction SilentlyContinue
$count = 0
foreach ($p in $procs) {
  if ($p.MainWindowHandle -ne [IntPtr]::Zero) {
    [NyannWin32Hide]::ShowWindow($p.MainWindowHandle, 0) | Out-Null
    $count++
  }
}
Write-Output $count
`
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')

    try {
      const out = execSync(
        `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 6000, encoding: 'utf8', windowsHide: true }
      ).trim()
      const count = parseInt(out) || 0
      res.json({ ok: true, hidden: count })
    } catch (e) {
      res.json({ ok: false, error: e.message })
    }
  })

  // ── /backup_settings ─────────────────────────────────────────────────────
  expressApp.post('/backup_settings', (req, res) => {
    try {
      fs.mkdirSync(DIR_SETTINGS_BACKUP, { recursive: true })
      const now  = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '_')
      const name = `settings_backup_${now}.json`
      fs.writeFileSync(path.join(DIR_SETTINGS_BACKUP, name), JSON.stringify(req.body, null, 2), 'utf8')
      res.json({ ok: true, filename: name })
    } catch (e) { res.json({ ok: false, error: e.message }) }
  })

  // ── /open_folder ─────────────────────────────────────────────────────────
  expressApp.post('/open_folder', (req, res) => {
    const folderMap = {
      settings:        DIR_SETTINGS,
      settings_backup: DIR_SETTINGS_BACKUP,
    }
    const target = folderMap[req.body.folder]
    if (!target) return res.json({ ok: false, error: 'ไม่รู้จัก folder' })
    try {
      fs.mkdirSync(target, { recursive: true })
      if (process.platform === 'win32')   spawn('explorer', [target], { detached: true }).unref()
      else if (process.platform === 'darwin') spawn('open', [target], { detached: true }).unref()
      else spawn('xdg-open', [target], { detached: true }).unref()
      res.json({ ok: true, path: target })
    } catch (e) { res.json({ ok: false, error: e.message }) }
  })

  // ── Create HTTP server + Socket.IO ────────────────────────────────────────
  httpServer = http.createServer(expressApp)
  io = new Server(httpServer, { cors: { origin: '*' } })

  io.on('connection', (socket) => {
    socket.emit('settings', settings)
    socket.emit('debug', { text: '[WS] Client connected' })
    if (settings.running) {
      socket.emit('status', { running: true })
      socket.emit('debug', { text: '[Web] Watcher ยังทำงานอยู่ — ไม่ต้อง Start ใหม่' })
    }

    socket.on('start', (data) => startWatcher(data))
    socket.on('stop',  ()     => stopWatcher())

    socket.on('save_settings', (data) => {
      const prevDir        = settings.log_dir
      const prevDirClassic = settings.log_dir_classic
      Object.assign(settings, data)
      saveSettings()
      socket.emit('settings', settings)
      // restart watcher if folder changed and running
      const dirChanged = (prevDir !== settings.log_dir) || (prevDirClassic !== settings.log_dir_classic)
      if (settings.running && dirChanged) {
        startWatcher({ ...settings })
        emitDebug(`[Watcher] restarted → NGS: ${settings.log_dir} | Classic: ${settings.log_dir_classic || '(ปิด)'}`)
      }
    })
  })

  await new Promise((resolve, reject) => {
    httpServer.listen(5514, '127.0.0.1', resolve)
    httpServer.on('error', reject)
  })

  console.log('[Server] Node.js in-process server started at http://127.0.0.1:5514')
}

// ════════════════════════════════════════════════════════════════════════════
// AUTO UPDATER
// ════════════════════════════════════════════════════════════════════════════
autoUpdater.autoDownload         = true
autoUpdater.autoInstallOnAppQuit = false

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater] error:', err?.message ?? err)
})

autoUpdater.on('update-available', () => mainWindow?.webContents.send('update-available'))
autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded')
  tray?.displayBalloon({
    title:    'NYANN App New Update Available!',
    content:  'Click "Restart & Update" in the App.',
    iconType: 'info',
  })
})

ipcMain.handle('install-update', () => {
  app.isQuitting = true
  autoUpdater.quitAndInstall()
})
// ════════════════════════════════════════════════════════════════════════════
// HELPERS — Show / Kill external app windows
// ════════════════════════════════════════════════════════════════════════════
function showAppWindow(procName) {
  const baseName = procName.replace(/\.exe$/i, '')
  const psScript = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public class NyannShowWin2 {
  public delegate bool EnumWndProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWndProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int  GetWindowLong(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll")] public static extern bool RedrawWindow(IntPtr hWnd, IntPtr lprcUpdate, IntPtr hrgnUpdate, uint flags);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int maxCount);
  public static List<IntPtr> GetAllWindowsForPid(uint pid) {
    var list = new List<IntPtr>();
    EnumWindows((hWnd, _) => {
      uint wndPid;
      GetWindowThreadProcessId(hWnd, out wndPid);
      if (wndPid == pid && GetParent(hWnd) == IntPtr.Zero) {
        int style = GetWindowLong(hWnd, -16);
        bool hasCaption = (style & 0xC00000) != 0;
        // ต้องมี title เท่านั้น — กรอง internal/offscreen Electron windows ออก
        var sb = new StringBuilder(256);
        GetWindowText(hWnd, sb, 256);
        if (hasCaption && sb.Length > 0)
          list.Add(hWnd);
      }
      return true;
    }, IntPtr.Zero);
    return list;
  }
}
'@
foreach ($p in (Get-Process -Name '${baseName}' -ErrorAction SilentlyContinue)) {
  foreach ($hWnd in [NyannShowWin2]::GetAllWindowsForPid([UInt32]$p.Id)) {
    [NyannShowWin2]::ShowWindow($hWnd, 9)  | Out-Null
    [NyannShowWin2]::ShowWindow($hWnd, 5)  | Out-Null
    [NyannShowWin2]::RedrawWindow($hWnd, [IntPtr]::Zero, [IntPtr]::Zero, 0x0181) | Out-Null
    [NyannShowWin2]::SetForegroundWindow($hWnd) | Out-Null
  }
}`
  try {
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 5000, windowsHide: true })
  } catch (_) {}
}


function hideAppWindow(procName) {
  const baseName = procName.replace(/\.exe$/i, '')
  const psScript = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class NyannTrayHide { [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n); }
'@
foreach ($p in (Get-Process -Name '${baseName}' -ErrorAction SilentlyContinue)) {
  if ($p.MainWindowHandle -ne [IntPtr]::Zero) { [NyannTrayHide]::ShowWindow($p.MainWindowHandle, 0) | Out-Null }
}`
  try {
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { timeout: 5000, windowsHide: true })
  } catch (_) {}
}

// ════════════════════════════════════════════════════════════════════════════
// TRAY
// ════════════════════════════════════════════════════════════════════════════
function rebuildTrayMenu() {
  if (!tray) return
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'NYANN APP', click: () => { mainWindow.show(); mainWindow.focus() } },
    { type: 'separator' },
    {
      label: 'Hide APP',
      submenu: [
        {
          label: appHidden.voicevox ? '[Unhide] VOICEVOX' : '[Hide] VOICEVOX',
          click: () => {
            if (appHidden.voicevox) {
              showAppWindow('VOICEVOX.exe')
              appHidden.voicevox = false
            } else {
              hideAppWindow('VOICEVOX.exe')
              appHidden.voicevox = true
            }
            rebuildTrayMenu()
          },
        },
        {
          label: appHidden.bouyomichan ? '[Unhide] BouyomiChan' : '[Hide] BouyomiChan',
          click: () => {
            if (appHidden.bouyomichan) {
              showAppWindow('BouyomiChan.exe')
              appHidden.bouyomichan = false
            } else {
              hideAppWindow('BouyomiChan.exe')
              appHidden.bouyomichan = true
            }
            rebuildTrayMenu()
          },
        },
      ],
    },
    { type: 'separator' },
    { label: 'Check for Updates', click: () => { autoUpdater.checkForUpdates() } },
    { type: 'separator' },
    { label: 'Quit NYANN APP', click: () => { app.isQuitting = true; app.quit() } },
  ]))
}

function createTray() {
  tray = new Tray(getIconPath())
  tray.setToolTip('NYANN APP Project')
  rebuildTrayMenu()
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus() })
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN WINDOW
// ════════════════════════════════════════════════════════════════════════════
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 750, height: 800, minWidth: 550, minHeight: 550,
    frame: false, backgroundColor: '#010a18',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, autoHideMenuBar: true,
    icon: getIconPath(),
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
      tray.displayBalloon({
        title:    'NYANN APP Project',
        content:  'Still running in the system tray.',
        iconType: 'info',
      })
    }
  })

  mainWindow.on('maximize',   () => mainWindow.webContents.send('win-state', { maximized: true }))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('win-state', { maximized: false }))

  // Block DevTools in production
  if (app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (_e, input) => {
      const isDevTools =
        (input.key === 'F12') ||
        (input.control && input.shift && input.key === 'I') ||
        (input.control && input.shift && input.key === 'J')
      if (isDevTools) _e.preventDefault()
    })
  }

  // Server is already running (in-process) — just load directly
  const tryLoad = (attempt = 0) => {
    const http = require('http')
    http.get('http://127.0.0.1:5514', () => {
      mainWindow.loadURL('http://127.0.0.1:5514')
    }).on('error', () => {
      if (attempt < 20) setTimeout(() => tryLoad(attempt + 1), 300)
      else mainWindow.loadURL(
        'data:text/html,<h2 style="color:red;font-family:sans-serif;padding:40px">Cannot connect to server.<br><small>Please restart the app.</small></h2>'
      )
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (app.isPackaged) {
      setTimeout(() => autoUpdater.checkForUpdates(), 3000)
      setInterval(()  => autoUpdater.checkForUpdates(), 30 * 60 * 1000)
    }
  })

  tryLoad()
}

// ════════════════════════════════════════════════════════════════════════════
// IPC — Window Controls
// ════════════════════════════════════════════════════════════════════════════
ipcMain.handle('win-minimize',     () => mainWindow?.minimize())
ipcMain.handle('win-maximize',     () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.handle('win-is-maximized', () => mainWindow?.isMaximized() ?? false)
ipcMain.handle('win-close',        () => mainWindow?.hide())

ipcMain.handle('check-folder-exists', (_e, folderPath) => {
  try { return fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory() }
  catch { return false }
})

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select PSO2NGS Chat Log Folder',
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('pick-file', async (_e, opts) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title:   opts?.title   || 'Select File',
    filters: opts?.filters || [{ name: 'All Files', extensions: ['*'] }],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('check-for-updates', () => { autoUpdater.checkForUpdates() })

// ── Bookmarks ────────────────────────────────────────────────────────────────
const BOOKMARKS_PATH = () => path.join(app.getPath('userData'), 'bookmarks.json')

ipcMain.handle('bookmarks-load', () => {
  try {
    const p = BOOKMARKS_PATH()
    if (!fs.existsSync(p)) return []
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch { return [] }
})

ipcMain.handle('bookmarks-save', (_e, data) => {
  try { fs.writeFileSync(BOOKMARKS_PATH(), JSON.stringify(data), 'utf8'); return true }
  catch { return false }
})

// ── Custom App Icon ───────────────────────────────────────────────────────────
const CUSTOM_ICON_PATH = () => path.join(app.getPath('userData'), 'custom_icon.png')

ipcMain.handle('pick-icon-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select App Icon',
    filters: [{ name: 'Images', extensions: ['png', 'ico', 'jpg', 'jpeg'] }],
  })
  if (result.canceled) return null
  const data = fs.readFileSync(result.filePaths[0])
  const ext  = path.extname(result.filePaths[0]).toLowerCase()
  const mime = { '.png': 'image/png', '.ico': 'image/x-icon',
                 '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }[ext] || 'image/png'
  return `data:${mime};base64,` + data.toString('base64')
})

ipcMain.handle('set-custom-icon', (_e, dataUrl) => {
  try {
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(CUSTOM_ICON_PATH(), Buffer.from(base64, 'base64'))
    const { nativeImage } = require('electron')
    const img = nativeImage.createFromPath(CUSTOM_ICON_PATH())
    mainWindow?.setIcon(img)
    tray?.setImage(img)
    return true
  } catch (e) { console.error('[Icon]', e.message); return false }
})

// ── Block List ────────────────────────────────────────────────────────────────
const BLOCKLIST_PATH = () => path.join(DIR_SETTINGS, 'blocklist.json')

ipcMain.handle('blocklist-load', () => {
  try {
    const p = BLOCKLIST_PATH()
    if (!fs.existsSync(p)) return []
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch { return [] }
})

ipcMain.handle('blocklist-save', (_e, data) => {
  try {
    fs.mkdirSync(DIR_SETTINGS, { recursive: true })
    fs.writeFileSync(BLOCKLIST_PATH(), JSON.stringify(data), 'utf8')
    return true
  } catch { return false }
})

// ════════════════════════════════════════════════════════════════════════════
// APP LIFECYCLE
// ════════════════════════════════════════════════════════════════════════════
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show(); mainWindow.focus()
    }
  })

  app.isQuitting = false

  app.whenReady().then(async () => {
    loadSettings()
    await startInProcessServer()   // ← Node.js server เริ่มก่อน (แทน Python spawn)
    syncHiddenState()              // ← sync window visibility state before building tray
    createTray()
    createWindow()

    // Register Ctrl+R only while the app window is focused (not system-wide)
    mainWindow.on('focus', () => {
      if (!globalShortcut.isRegistered('Control+R')) {
        globalShortcut.register('Control+R', () => {
          mainWindow.webContents.reload()
          autoUpdater.checkForUpdates()
        })
      }
    })
    mainWindow.on('blur', () => {
      globalShortcut.unregister('Control+R')
    })
  })

  app.on('window-all-closed', () => {})

  app.on('before-quit', () => {
    app.isQuitting = true
    globalShortcut.unregisterAll()
    stopWatcher()
    if (httpServer) httpServer.close()
    // ถ้าซ่อนอยู่ → show คืนก่อนออก, ถ้าไม่ซ่อน → ปล่อยไว้
    if (appHidden.voicevox)    showAppWindow('VOICEVOX.exe')
    if (appHidden.bouyomichan) showAppWindow('BouyomiChan.exe')
  })
}
