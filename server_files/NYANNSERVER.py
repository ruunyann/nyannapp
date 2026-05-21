"""
NYANN LCTTS Project — Web Backend  v3.1
================================
Flask + Flask-SocketIO backend
หน้าที่: อ่าน ChatLog → ส่ง message event → browser
การแปล / TTS / Settings ทั้งหมดทำใน browser

ติดตั้ง:
  pip install flask flask-socketio gevent gevent-websocket

รัน standalone:
  python NYANNSERVER.py

หรือรันผ่าน NYANNAPP.exe (launcher จะเรียก main() เอง)
"""

from gevent import monkey
monkey.patch_all()

from flask import Flask, render_template_string, send_from_directory
from flask_socketio import SocketIO, emit
import threading, time, os, glob, re, json, sys
from datetime import datetime

# ══════════════════════════════════════════════════════════════════════════════
app    = Flask(__name__)
app.config["SECRET_KEY"] = "nyann-lctts-secret"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

DEFAULT_LOG = os.path.join(
    os.path.expanduser("~"),
    "Documents", "SEGA", "PHANTASYSTARONLINE2", "log_ngs"
)

DEFAULT_LOG_CLASSIC = os.path.join(
    os.path.expanduser("~"),
    "Documents", "SEGA", "PHANTASYSTARONLINE2", "log"
)

LOG_RE = re.compile(
    r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\t\d+\t([A-Za-z]+)\t\d+\t(.+?)\t(.+)$'
)

DEFAULT_CMD_PREFIXES = ["/la","/cla","/e","/c","/item","/s","/w","/p","/t","/g","/mn","/ci","/cf","/stamp","/cos","/cam","/a","/p","/moya"]

# Global state
watcher_thread = None
watcher_stop   = threading.Event()
settings = {
    "log_dir":         DEFAULT_LOG,
    "log_dir_classic": "",           # ว่าง = ไม่ใช้ Classic folder
    "channels":        ["PUBLIC","PARTY","TEAM","GUILD","WHISPER","GROUP"],
    "cmd_prefixes":    list(DEFAULT_CMD_PREFIXES),
    "running":         False,
}

# When running as PyInstaller EXE: EXE is at resources/server/ → go up 2 levels to resources/app/
# When running as .py script, go up one level from .server/ to project root
# frozen (PyInstaller EXE): exe อยู่ที่ resources/server/
#   → .app/ และ .server/ อยู่ใน resources/app.asar.unpacked/
# script (dev): __file__ อยู่ใน .server/ → root = parent
if getattr(sys, "frozen", False):
    _res_dir  = os.path.dirname(os.path.dirname(sys.executable))                      # resources/app.asar.unpacked
    _BASE_DIR = os.path.join(os.path.dirname(_res_dir), "app.asar.unpacked", "app")   # resources/app.asar.unpacked/app/
else:
    _BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app_files")

# Settings → %APPDATA%/NYANNAPP (เขียนได้เสมอ ไม่ติด Program Files permission)
_APPDATA            = os.environ.get("APPDATA") or os.path.expanduser("~")
DIR_SETTINGS        = os.path.join(_APPDATA, "NYANNAPP", "settings")
DIR_SETTINGS_BACKUP = os.path.join(_APPDATA, "NYANNAPP", "settings_backup")
SETTINGS_FILE       = os.path.join(DIR_SETTINGS, "nyannlctts_settings.json")

# ── Log Watcher Thread ────────────────────────────────────────────────────────
def watcher_run(stop_event):
    log_dir         = settings["log_dir"]
    log_dir_classic = settings.get("log_dir_classic", "").strip()
    seen            = {}          # path → line count
    dedup_seen      = set()       # (timestamp, name, msg) → already emitted

    def emit_dbg(msg):
        socketio.emit("debug", {"text": msg})

    def readlines(path):
        for enc in ("utf-16","utf-8","cp932"):
            try:
                with open(path,"r",encoding=enc,errors="strict") as f:
                    return f.readlines()
            except Exception:
                continue
        try:
            with open(path,"r",encoding="utf-8",errors="replace") as f:
                return f.readlines()
        except:
            return []

    def latest_files_from(folder):
        """Return up to the 3 most-recent ChatLog*.txt files from a folder."""
        if not folder or not os.path.isdir(folder):
            return []
        all_f = sorted(glob.glob(os.path.join(folder, "ChatLog*.txt")))
        return all_f[-3:] if len(all_f) > 3 else all_f

    def latest_files():
        """Merge files from NGS folder and (optional) Classic folder."""
        ngs_files     = latest_files_from(log_dir)
        classic_files = latest_files_from(log_dir_classic) if log_dir_classic else []
        return ngs_files + classic_files

    # ── initial snapshot ──────────────────────────────────────────────────────
    for folder_label, folder in [("NGS", log_dir), ("Classic", log_dir_classic)]:
        if not folder or not os.path.isdir(folder):
            if folder:
                emit_dbg(f"[Watcher] {folder_label} folder: {folder}")
                emit_dbg(f"[!] ไม่พบ ChatLog*.txt ใน {folder_label} — ตรวจสอบ path")
            continue
        files = latest_files_from(folder)
        emit_dbg(f"[Watcher] {folder_label} folder: {folder}")
        emit_dbg(f"[Watcher] monitoring latest {len(files)} file(s) [{folder_label}]:")
        for f in files:
            emit_dbg(f"  -> {os.path.basename(f)}")
            lines = readlines(f)
            seen[f] = len(lines)
            # seed dedup_seen with existing lines so we don't replay old msgs
            for raw in lines:
                raw = raw.strip()
                m = LOG_RE.match(raw)
                if m:
                    dt, ch, name, msg = m.groups()
                    dedup_seen.add((dt, name, msg.strip()))

    while not stop_event.is_set():
        for path in latest_files():
            lines = readlines(path)
            if path not in seen:
                seen[path] = len(lines)
                emit_dbg(f"[Watcher] new file: {os.path.basename(path)}")
                continue
            prev = seen.get(path, len(lines))
            if len(lines) <= prev:
                seen[path] = len(lines)
                continue
            new_lines = lines[prev:]
            seen[path] = len(lines)
            for line in new_lines:
                raw = line.strip()
                if not raw: continue
                m = LOG_RE.match(raw)
                if not m:
                    emit_dbg(f"[skip] {raw[:80]}")
                    continue
                dt, ch, name, msg = m.groups()
                ch  = ch.upper()
                ch  = {"GUILD": "TEAM", "REPLY": "WHISPER"}.get(ch, ch)
                ts  = dt[11:19]
                if ch not in set(settings["channels"]): continue

                # ── deduplication (timestamp + name + msg) ────────────────
                dedup_key = (dt, name, msg.strip())
                if dedup_key in dedup_seen:
                    emit_dbg(f"[dedup] skipped duplicate: {name}: {msg[:50]}")
                    continue
                dedup_seen.add(dedup_key)
                # ── cap dedup_seen size to avoid unbounded growth ─────────
                if len(dedup_seen) > 5000:
                    # drop oldest 1000 (set has no order, so just trim by rebuild)
                    trimmed = sorted(dedup_seen)[-4000:]
                    dedup_seen.clear()
                    dedup_seen.update(trimmed)

                # ── Command + argument stripper ───────────────────────────
                # แต่ละ entry คือ (regex_pattern, n_args_to_consume)
                # n_args_to_consume = จำนวน token หลัง command ที่ต้อง skip เพิ่ม
                # -1 = consume ทุก arg ที่เป็น ASCII-word/number ที่ตามมา (greedy)
                CMD_ARG_TABLE = [
                    # /cf variants  (/cf on|off|all|sync|rev + param commands)
                    (re.compile(r'^/cf$', re.I),                   -1),   # /cf greedy
                    # /ce variants
                    (re.compile(r'^/ce$', re.I),                   -1),   # /ce [stop] [off] [off <sec>]
                    (re.compile(r'^/ceall$', re.I),                -1),   # /ceall [off]
                    # /background
                    (re.compile(r'^/background$', re.I),            2),   # /background dr on|off
                    # /pr
                    (re.compile(r'^/pr$', re.I),                    2),   # /pr <weather> <time>
                    # /uioff
                    (re.compile(r'^/uioff$', re.I),                 1),   # /uioff [sec]
                    # /face /fc
                    (re.compile(r'^/face\d+$', re.I),               0),
                    (re.compile(r'^/fc(\d+|off)$', re.I),           0),
                    # /vo
                    (re.compile(r'^/vo\d+$', re.I),                 0),
                    # /mn /ms /myset
                    (re.compile(r'^/mn\d+$', re.I),                 0),
                    (re.compile(r'^/ms\d+$', re.I),                 0),
                    (re.compile(r'^/myset\d+$', re.I),              0),
                    # /spal /subpalette
                    (re.compile(r'^/spal\d+$', re.I),               0),
                    (re.compile(r'^/subpalette\d+$', re.I),         0),
                    # /bl
                    (re.compile(r'^/bl$', re.I),                    0),
                    # generic: any /command — consume ASCII-only word/number args (greedy -1)
                    (re.compile(r'^/.+$'),                          -1),
                ]

                # arg token = pure ASCII word/number/decimal (ไม่ใช่ภาษาอื่น)
                def is_cmd_arg(tok):
                    return bool(re.match(r'^[a-zA-Z0-9_\-\.]+\+?$', tok)) and all(ord(c) < 128 for c in tok)

                tokens = msg.split(" ")
                clean_tokens = []
                i = 0
                while i < len(tokens):
                    tok = tokens[i]
                    if not tok:
                        i += 1
                        continue

                    if tok.startswith("/"):
                        # หา rule ที่ match
                        consume = -1  # default greedy
                        for pat, n in CMD_ARG_TABLE:
                            if pat.match(tok):
                                consume = n
                                break
                        i += 1  # skip command token itself
                        if consume == -1:
                            # greedy: skip ต่อไปเรื่อยๆ จนเจอ token ที่ไม่ใช่ ASCII arg
                            while i < len(tokens) and tokens[i] and is_cmd_arg(tokens[i]):
                                i += 1
                        else:
                            # skip ตาม n_args
                            skipped = 0
                            while i < len(tokens) and skipped < consume:
                                if tokens[i]:
                                    skipped += 1
                                i += 1
                        continue

                    clean_tokens.append(tok)
                    i += 1

                clean_msg = " ".join(clean_tokens).strip()

                if not clean_msg:
                    emit_dbg(f"[filter] {name}: all commands, skipped: {msg[:50]}")
                    continue

                emit_dbg(f"[line] {ts} {ch} {name}: {msg[:50]}")
                if clean_msg != msg.strip():
                    emit_dbg(f"[strip] cleaned: {clean_msg[:50]}")

                socketio.emit("message", {
                    "ts": ts, "name": name, "ch": ch,
                    "orig": clean_msg,
                    "clean": clean_msg,
                    "tl": None
                })

        time.sleep(0.4)

# ── Settings persistence ──────────────────────────────────────────────────────
def load_settings():
    os.makedirs(DIR_SETTINGS, exist_ok=True)
    os.makedirs(DIR_SETTINGS_BACKUP, exist_ok=True)
    try:
        with open(SETTINGS_FILE,"r",encoding="utf-8") as f:
            d = json.load(f)
            settings.update(d)
            settings["running"] = False
    except: pass

def save_settings():
    try:
        os.makedirs(DIR_SETTINGS, exist_ok=True)
        # บันทึกทุก field ที่ไม่ใช่ runtime state
        exclude = {"running"}
        d = {k: v for k, v in settings.items() if k not in exclude}
        with open(SETTINGS_FILE,"w",encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
    except: pass

# ── SocketIO Events ───────────────────────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    emit("settings", settings)
    emit("debug", {"text": "[Web] Client connected"})
    if settings["running"]:
        emit("status", {"running": True})
        emit("debug", {"text": "[Web] Watcher ยังทำงานอยู่ — ไม่ต้อง Start ใหม่"})

@socketio.on("start")
def on_start(data):
    global watcher_thread, watcher_stop
    old_log_dir         = settings.get("log_dir", "")
    old_log_dir_classic = settings.get("log_dir_classic", "")
    settings.update(data)
    save_settings()
    new_log_dir         = settings.get("log_dir", "")
    new_log_dir_classic = settings.get("log_dir_classic", "")
    # ถ้า watcher รันอยู่แล้ว และ ทั้ง 2 folder ไม่ได้เปลี่ยน → ไม่ต้องทำอะไร
    if settings["running"] and old_log_dir == new_log_dir and old_log_dir_classic == new_log_dir_classic:
        return
    # ถ้า folder เปลี่ยน → หยุด watcher เก่าก่อนแล้ว restart
    if settings["running"]:
        watcher_stop.set()
        if watcher_thread and watcher_thread.is_alive():
            watcher_thread.join(timeout=2)
        settings["running"] = False
    watcher_stop = threading.Event()
    watcher_thread = threading.Thread(
        target=watcher_run, args=(watcher_stop,), daemon=True)
    watcher_thread.start()
    settings["running"] = True
    emit("status", {"running": True})

@socketio.on("stop")
def on_stop():
    global watcher_stop
    watcher_stop.set()
    settings["running"] = False
    emit("status", {"running": False})

@socketio.on("save_settings")
def on_save_settings(data):
    global watcher_thread, watcher_stop
    old_log_dir         = settings.get("log_dir", "")
    old_log_dir_classic = settings.get("log_dir_classic", "")
    settings.update(data)
    save_settings()
    emit("settings", settings)
    # ถ้า folder เปลี่ยนและ watcher รันอยู่ → restart อัตโนมัติ
    new_log_dir         = settings.get("log_dir", "")
    new_log_dir_classic = settings.get("log_dir_classic", "")
    folders_changed = (old_log_dir != new_log_dir) or (old_log_dir_classic != new_log_dir_classic)
    if settings["running"] and folders_changed:
        watcher_stop.set()
        if watcher_thread and watcher_thread.is_alive():
            watcher_thread.join(timeout=2)
        watcher_stop = threading.Event()
        watcher_thread = threading.Thread(
            target=watcher_run, args=(watcher_stop,), daemon=True)
        watcher_thread.start()
        emit("debug", {"text": f"[Watcher] restarted → NGS: {new_log_dir} | Classic: {new_log_dir_classic or '(ปิด)'}"})

# ── Launch BouyomiChan ────────────────────────────────────────────────────────
from flask import request, jsonify, make_response
import subprocess

@app.route("/save_appsettings", methods=["POST"])
def save_appsettings():
    try:
        os.makedirs(DIR_SETTINGS, exist_ok=True)
        data = request.get_json()
        path = os.path.join(DIR_SETTINGS, "appsettings.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

@app.route("/load_appsettings")
def load_appsettings():
    try:
        path = os.path.join(DIR_SETTINGS, "appsettings.json")
        if not os.path.exists(path):
            return jsonify({"ok": False, "error": "not found"})
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify({"ok": True, "data": data})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

@app.route("/launch_bouyomi", methods=["POST"])
def launch_bouyomi():
    try:
        data = request.get_json()
        path = data.get("path", "").strip()
        if not path:
            return jsonify({"ok": False, "error": "ไม่มี path"})
        if not os.path.exists(path):
            return jsonify({"ok": False, "error": f"ไม่พบไฟล์: {path}"})
        subprocess.Popen([path], cwd=os.path.dirname(path))
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

@app.route("/auto_launch_bouyomi", methods=["POST"])
def auto_launch_bouyomi():
    """Launch BouyomiChan hidden (no taskbar) — only if not already running."""
    try:
        data     = request.get_json()
        exe_path = data.get("path", "").strip()
        port     = int(data.get("port", 50080))
        if not exe_path:
            return jsonify({"ok": False, "error": "ไม่มี path"})
        if not os.path.exists(exe_path):
            return jsonify({"ok": False, "error": f"ไม่พบไฟล์: {exe_path}"})

        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            already_up = (s.connect_ex(("127.0.0.1", port)) == 0)
        if already_up:
            return jsonify({"ok": True, "skipped": True, "reason": "already running"})

        if sys.platform == "win32":
            si = subprocess.STARTUPINFO()
            si.dwFlags    |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = 0  # SW_HIDE
            subprocess.Popen(
                [exe_path],
                cwd=os.path.dirname(exe_path),
                startupinfo=si,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
        else:
            subprocess.Popen([exe_path], cwd=os.path.dirname(exe_path))

        return jsonify({"ok": True, "skipped": False})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})


@app.route("/bouyomi_running")
def bouyomi_running():
    """Check if BouyomiChan HTTP port is reachable."""
    import socket
    port = int(request.args.get("port", 50080))
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.8)
            up = (s.connect_ex(("127.0.0.1", port)) == 0)
        return jsonify({"running": up})
    except Exception:
        return jsonify({"running": False})

@app.route("/backup_settings", methods=["POST"])
def backup_settings_route():
    try:
        os.makedirs(DIR_SETTINGS_BACKUP, exist_ok=True)
        now = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"settings_backup_{now}.json"
        backup_path = os.path.join(DIR_SETTINGS_BACKUP, backup_name)
        data = request.get_json()
        with open(backup_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return jsonify({"ok": True, "filename": backup_name})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

@app.route("/open_folder", methods=["POST"])
def open_folder():
    try:
        data = request.get_json()
        folder = data.get("folder", "").strip()
        folder_map = {
            "settings":        DIR_SETTINGS,
            "settings_backup": DIR_SETTINGS_BACKUP,
        }
        target = folder_map.get(folder)
        if not target:
            return jsonify({"ok": False, "error": "ไม่รู้จัก folder"})
        os.makedirs(target, exist_ok=True)
        if sys.platform == "win32":
            subprocess.Popen(["explorer", target])
        elif sys.platform == "darwin":
            subprocess.Popen(["open", target])
        else:
            subprocess.Popen(["xdg-open", target])
        return jsonify({"ok": True, "path": target})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})

@app.route("/")
def index():
    html_path = os.path.join(_BASE_DIR, "NYANNAPP.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            content = f.read()
        resp = make_response(content)
        resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp
    return f"<h1>Not found</h1><p>Looking for: {html_path}</p><p>EXE: {sys.executable}</p>"

# ══════════════════════════════════════════════════════════════════════════════
# ▼▼▼  เพิ่ม main() เพื่อให้ launcher.py เรียกได้  ▼▼▼
def main():
    load_settings()
    print("=" * 55)
    print("  NYANN LCTTS Project Web Server")
    print("  http://localhost:5514")
    print("=" * 55)
    socketio.run(app, host="0.0.0.0", port=5514, debug=False)

if __name__ == "__main__":
    main()
