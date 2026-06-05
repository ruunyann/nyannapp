# NYANN!! APP!! 🐾

> PSO2: New Genesis Live Chat Viewer — Read, Filter, Translate & TTS

---

## 📋 目次 / Table of Contents / สารบัญ

- [日本語](#日本語)
- [English](#english)
- [ภาษาไทย](#ภาษาไทย)

---

# 日本語

## NYANN!! APP!! とは

**NYANN!! APP!!** は、PSO2: New Genesis のチャットログをリアルタイムで読み取り、表示・翻訳・読み上げ（TTS）を行う **ローカル動作のデスクトップアプリ** です。

Electron + Node.js で動作し、ゲームのメモリやプロセスには一切アクセスしません。

---

## ⚙️ 動作の仕組み

```
PSO2 NGS がローカルに書き出す ChatLog*.txt
         ↓
  Watcher（Node.js）が新しい行を検出
         ↓
  WebSocket 経由で UI（HTML/JS）へ送信
         ↓
  フィルタリング → 表示 → 翻訳 / TTS
```

### 主な機能

| 機能 | 説明 |
|------|------|
| **リアルタイム表示** | ゲームが書き出す `ChatLog*.txt` を監視し、新着メッセージのみ表示 |
| **チャンネルフィルター** | PARTY / WHISPER / PUBLIC / TEAM / GUILD を個別に ON/OFF |
| **スパム対策フィルター** | 重複メッセージ・連投（Flood）を自動スキップ |
| **Regex フィルター** | 正規表現でメッセージを細かくフィルタリング |
| **翻訳** | Google / DeepL / MyMemory / LibreTranslate 対応（要インターネット） |
| **TTS 読み上げ** | VOICEVOX / 棒読みちゃん / Web Speech API 対応 |
| **テーマ / カスタマイズ** | カラーテーマ・フォントサイズ・背景画像など |
| **デバッグログ** | 動作状況をリアルタイムで確認可能 |

---

## ✅ PSO2: NGS のゲームルールに違反しない理由

SEGA の PSO2: NGS における利用規約・チートツール規制の観点から、本アプリは以下の理由により **完全にセーフ** です。

### 1. ゲームのメモリ・プロセスに一切触れない
- ゲームの実行ファイル・メモリ・プロセスへのアクセスは **ゼロ**
- インジェクション・フック・オーバーレイ描画は **一切行わない**

### 2. ゲームが公式に出力するログファイルのみを読む
- PSO2 NGS はチャットログを `ChatLog*.txt` としてローカルに**公式出力**している
- 本アプリはそのテキストファイルを**読み取るだけ**（書き込みなし）
- ファイルへのアクセスは OS の通常ファイル読み取りと同一

### 3. ゲームの通信・サーバーに干渉しない
- SEGA のサーバーへの通信は **一切行わない**
- ゲームのネットワークパケットの傍受・改ざんは **しない**

### 4. ゲームクライアントを改変しない
- ゲームファイルの改変・パッチ適用は **しない**
- 動作はゲームとは完全に独立したプロセス

### 5. 自動操作・マクロ機能は持たない
- キャラクター操作・チャット送信・ゲーム内アクションの自動化機能は **ない**
- 本アプリはあくまで「読む・見せる・読み上げる」だけのツール

### 📌 類似する公認ツールとの比較

PSO2 公式も **ACT (Advanced Combat Tracker)** 等のログ読み取りツールの存在を長年認識しており、ログファイルの出力はプレイヤーへの公式提供機能です。本アプリはそれと同等のアプローチを採用しています。

---

## 🛠️ 技術スタック

- **Electron** — デスクトップアプリフレームワーク
- **Node.js** — ログ監視 / WebSocket サーバー
- **HTML / CSS / JavaScript** — UI
- **Socket.IO** — リアルタイム通信（localhost のみ）
- **VOICEVOX / 棒読みちゃん / Web Speech API** — TTS エンジン

---

## 📁 対応ログ

| 種別 | フォルダ |
|------|---------|
| PSO2 NGS | `PHANTASYSTARONLINE2\log_ngs\ChatLog*.txt` |
| PSO2 Classic | `PHANTASYSTARONLINE2\log\ChatLog*.txt` |

---

# English

## What is NYANN!! APP!!?

**NYANN!! APP!!** is a **locally-running desktop application** that reads PSO2: New Genesis chat logs in real time, with display, translation, and TTS (text-to-speech) support.

Built with Electron + Node.js. It does **not** access game memory or processes in any way.

---

## ⚙️ How It Works

```
PSO2 NGS writes ChatLog*.txt to local disk
         ↓
  Watcher (Node.js) detects new lines
         ↓
  Sends to UI (HTML/JS) via WebSocket
         ↓
  Filter → Display → Translate / TTS
```

### Features

| Feature | Description |
|---------|-------------|
| **Real-time display** | Monitors `ChatLog*.txt` written by the game, shows only new messages |
| **Channel filter** | Toggle PARTY / WHISPER / PUBLIC / TEAM / GUILD individually |
| **Anti-spam filter** | Auto-skips duplicate messages and flood (rapid repeat) messages |
| **Regex filter** | Fine-grained message filtering with regular expressions |
| **Translation** | Google / DeepL / MyMemory / LibreTranslate (requires internet) |
| **TTS** | VOICEVOX / Bouyomi-chan / Web Speech API support |
| **Theme / Customization** | Color themes, font size, background image, and more |
| **Debug log** | Monitor app activity in real time |

---

## ✅ Why This App Does NOT Violate PSO2: NGS Rules

From the perspective of SEGA's Terms of Service and anti-cheat regulations, this application is **completely safe** for the following reasons:

### 1. Zero access to game memory or processes
- **No** access to the game's executable, memory, or process
- **No** injection, hooking, or overlay rendering of any kind

### 2. Reads only the official log files the game writes itself
- PSO2 NGS **officially outputs** chat logs as `ChatLog*.txt` on local disk
- This app **only reads** those text files — no writing, no modification
- File access is identical to any normal OS file read operation

### 3. No interference with game network or servers
- **Zero** communication with SEGA's servers
- **No** interception or modification of game network packets

### 4. Does not modify the game client
- **No** modification or patching of any game files
- Runs as a completely independent process from the game

### 5. No automation or macro functionality
- **No** automated character control, chat sending, or in-game actions
- This app only **reads, displays, and speaks** — nothing more

### 📌 Comparison with Recognized Tools

SEGA has long been aware of log-reading tools such as **ACT (Advanced Combat Tracker)** in the PSO2 ecosystem. The game's log file output is an officially provided feature for players. This application follows the same approach.

---

## 🛠️ Tech Stack

- **Electron** — Desktop app framework
- **Node.js** — Log watcher / WebSocket server
- **HTML / CSS / JavaScript** — UI
- **Socket.IO** — Real-time communication (localhost only)
- **VOICEVOX / Bouyomi-chan / Web Speech API** — TTS engines

---

## 📁 Supported Logs

| Type | Folder |
|------|--------|
| PSO2 NGS | `PHANTASYSTARONLINE2\log_ngs\ChatLog*.txt` |
| PSO2 Classic | `PHANTASYSTARONLINE2\log\ChatLog*.txt` |

---

# ภาษาไทย

## NYANN!! APP!! คืออะไร?

**NYANN!! APP!!** คือแอปพลิเคชันเดสก์ท็อปที่ **ทำงานบนเครื่องโดยตรง** สำหรับอ่านข้อความแชทจากเกม PSO2: New Genesis แบบเรียลไทม์ พร้อมระบบแสดงผล แปลภาษา และอ่านออกเสียง (TTS)

พัฒนาด้วย Electron + Node.js และ **ไม่มีการเข้าถึงหน่วยความจำหรือ process ของเกมแต่อย่างใด**

---

## ⚙️ การทำงานของแอป

```
PSO2 NGS บันทึก ChatLog*.txt ลงในเครื่อง
         ↓
  Watcher (Node.js) ตรวจจับบรรทัดใหม่
         ↓
  ส่งมายัง UI (HTML/JS) ผ่าน WebSocket
         ↓
  กรอง → แสดงผล → แปลภาษา / อ่านออกเสียง
```

### ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **แสดงผลเรียลไทม์** | ติดตามไฟล์ `ChatLog*.txt` ที่เกมสร้าง แสดงเฉพาะข้อความใหม่ |
| **กรองช่องแชท** | เปิด/ปิด PARTY / WHISPER / PUBLIC / TEAM / GUILD แยกได้ |
| **Anti-Spam** | ข้ามข้อความซ้ำและการส่งซ้ำถี่ (Flood) อัตโนมัติ |
| **Regex Filter** | กรองข้อความด้วย Regular Expression ได้ละเอียด |
| **แปลภาษา** | รองรับ Google / DeepL / MyMemory / LibreTranslate (ต้องมีอินเทอร์เน็ต) |
| **TTS อ่านออกเสียง** | รองรับ VOICEVOX / 棒読みちゃん / Web Speech API |
| **ธีม / ปรับแต่ง** | เปลี่ยนสี, ขนาดฟอนต์, ภาพพื้นหลัง และอื่นๆ |
| **Debug Log** | ดูสถานะการทำงานของแอปแบบเรียลไทม์ |

---

## ✅ ทำไมแอปนี้ไม่ผิดกฎของ PSO2: NGS

เมื่อพิจารณาจากข้อกำหนดการใช้งานและระบบป้องกันการโกงของ SEGA แอปนี้ **ปลอดภัยอย่างสมบูรณ์** ด้วยเหตุผลดังนี้

### 1. ไม่แตะหน่วยความจำหรือ process ของเกมเลย
- **ไม่มี** การเข้าถึง executable, หน่วยความจำ หรือ process ของเกม
- **ไม่มี** การ inject, hook หรือวาด overlay ใดๆ ทั้งสิ้น

### 2. อ่านเฉพาะไฟล์ log ที่เกมสร้างขึ้นเองอย่างเป็นทางการ
- PSO2 NGS **บันทึกข้อความแชทลงไฟล์** `ChatLog*.txt` ไว้ในเครื่องอยู่แล้วโดยทางการ
- แอปนี้ **อ่านไฟล์ text เท่านั้น** — ไม่เขียน ไม่แก้ไข
- การเข้าถึงไฟล์เหมือนกับการเปิดไฟล์ text ทั่วไปบน OS

### 3. ไม่รบกวนการสื่อสารหรือ server ของเกม
- **ไม่มี** การติดต่อกับ server ของ SEGA
- **ไม่มี** การดักจับหรือแก้ไข network packet ของเกม

### 4. ไม่แก้ไข game client
- **ไม่มี** การแก้ไขหรือ patch ไฟล์เกมใดๆ
- ทำงานเป็น process แยกต่างหากจากเกมโดยสมบูรณ์

### 5. ไม่มีระบบ automation หรือ macro
- **ไม่มี** การควบคุมตัวละคร, ส่งแชท หรือกระทำใดๆ ในเกมแบบอัตโนมัติ
- แอปนี้ทำได้เพียง **อ่าน แสดงผล และอ่านออกเสียง** เท่านั้น

### 📌 เปรียบเทียบกับเครื่องมือที่ชุมชนยอมรับ

SEGA รับทราบถึงการมีอยู่ของเครื่องมืออ่าน log อย่าง **ACT (Advanced Combat Tracker)** ในชุมชน PSO2 มาอย่างยาวนาน การที่เกมบันทึกไฟล์ log ออกมาถือเป็นฟีเจอร์ที่ SEGA มอบให้ผู้เล่นอย่างเป็นทางการ แอปนี้ใช้แนวทางเดียวกัน

---

## 🛠️ เทคโนโลยีที่ใช้

- **Electron** — Framework สำหรับแอปเดสก์ท็อป
- **Node.js** — ระบบติดตาม log / WebSocket server
- **HTML / CSS / JavaScript** — UI
- **Socket.IO** — การสื่อสารเรียลไทม์ (localhost เท่านั้น)
- **VOICEVOX / 棒読みちゃん / Web Speech API** — TTS engine

---

## 📁 Log ที่รองรับ

| ประเภท | โฟลเดอร์ |
|--------|---------|
| PSO2 NGS | `PHANTASYSTARONLINE2\log_ngs\ChatLog*.txt` |
| PSO2 Classic | `PHANTASYSTARONLINE2\log\ChatLog*.txt` |

---

> 本アプリは非公式のファンメイドツールです。SEGA および PSO2: NGS とは一切関係ありません。
>
> This application is an unofficial fan-made tool. It is not affiliated with SEGA or PSO2: NGS in any way.
>
> แอปนี้เป็นเครื่องมือที่สร้างโดยแฟนเกม ไม่มีความเกี่ยวข้องกับ SEGA หรือ PSO2: NGS แต่อย่างใด
