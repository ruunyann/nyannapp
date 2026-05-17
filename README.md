## Folder Structure
## フォルダ構成
## โครงสร้างโฟลเดอร์

```
PSO2NGS_LCT/
├── main.js                      ← Electron main process
├── preload.js                   ← Electron preload (electronAPI)
├── package.json
├── PSO2NGS_LCT_server.spec      ← PyInstaller spec (hiddenimports, icon)
├── server.ico                   ← Icon สำหรับ EXE และ System Tray
├── build.bat                    ← Build script (Windows)
├── app_files/
│   └── PSO2NGS_LCT.html         ← Frontend UI
└── server_files/
    ├── PSO2NGS_LCT_server.py    ← Flask backend (source)
    └── PSO2NGS_LCT_server.exe   ← (หลัง build)
```

---
## English

### Notes
- Clicking **X** on the window → The app will continue running in the **System Tray**  
- Clicking **Quit** in the System Tray → Closes both the App and Server  

## 日本語

### 注意事項
- ウィンドウの **X** を押しても、アプリは **System Tray** 上で動作し続けます  
- System Tray の **Quit** を押すと、App と Server の両方が終了します  

## ไทย

### หมายเหตุ
- กด **X** ที่หน้าต่าง → App ยังทำงานอยู่ใน **System Tray**  
- กด **Quit** ใน System Tray → ปิด App และ Server พร้อมกัน  
