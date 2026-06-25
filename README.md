# NYANNAPP!! Z z z

> PSO2: New Genesis Live Chat Viewer

## Web DEMO : [NYANNAPP DEMO](https://ruunyann.github.io/nyannapp/) 

## DL Setup : [NYANNAPP-Setup-0.42.3.zip](https://github.com/ruunyann/nyannapp/releases/download/v0.42.3/NYANNAPP-Setup-0.45.1.zip) 

---

## 📋 目次 / Table of Contents / สารบัญ

- [日本語](#日本語) - [English](#english) - [ภาษาไทย](#ภาษาไทย)

---

# 日本語

## ✅ PSO2: NGS のゲームルールに違反しない理由

SEGA の PSO2: NGS における利用規約・チートツール規制の観点から、本アプリは以下の理由により **完全にセーフ** です。

1. ゲームのメモリ・プロセスに一切触れない
2. ゲームが公式に出力するログファイルのみを読む（PSO2: NGS が自動生成するファイルで、ユーザー自身がメモ帳等で開けるテキストファイルです）
3. ゲームの通信・サーバーに干渉しない
4. ゲームクライアントを改変しない
5. 自動操作・マクロ機能は持たない

---

## NYANN!! APP!! とは

**NYANN!! APP!!** は、PSO2: New Genesis のチャットログをリアルタイムで読み取り、表示・読み上げ（TTS）・翻訳（ON/OFF 可能）を行う **ローカル動作のデスクトップアプリ** です。

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

---

## ✨ 主な機能

| 機能 | 説明 |
|------|------|
| **リアルタイム表示** | ゲームが書き出す `ChatLog*.txt` を監視し、新着メッセージのみ表示 |
| **チャンネルフィルター** | PARTY / WHISPER / PUBLIC / TEAM / GUILD を個別に ON/OFF |
| **スパム対策フィルター** | 重複メッセージ・連投（Flood）を自動スキップ |
| **Regex フィルター** | 正規表現でメッセージを細かくフィルタリング（インポート/エクスポート対応）。[棒読みちゃん](https://chi.usamimi.info/Program/Application/BouyomiChan/) および [PSO2yomi](https://plan301e.web.fc2.com/plan/psuyomi3.html) のフィルター仕様を参考にしています |
| **ブロックリスト** | 特定プレイヤーのメッセージを非表示にする永続ブロック機能 |
| **翻訳** | Google Unofficial / MyMemory / Groq AI / OpenAI GPT / Google Gemini / Anthropic Claude 対応（要インターネット） |
| **TTS 読み上げ** | [VOICEVOX](https://voicevox.hiroshiba.jp/) / [棒読みちゃん](https://chi.usamimi.info/Program/Application/BouyomiChan/) / Web Speech API 対応 |
| **VOICEVOX キャッシュ** | 読み上げ音声をローカルキャッシュして通信量と待機時間を削減 |
| **VOICEVOX 単語置換** | 読み上げ前にテキストを置換するルールを自由に設定（棒読みちゃんのデフォルト辞書を内蔵） |
| **DLC / プラグイン** | `.zip` ファイルからプラグインをインストール・管理。プラグイン UI をアプリ内に直接埋め込み表示。自動起動 ON/OFF も設定可能 |
| **NYANN Browser** | アプリ内ブラウザウィンドウ。外部ページをテーマに合わせて表示。UI は日本語 / English 切替対応 |
| **翻訳テキストの色分け** | 翻訳結果の表示色を「言語別」または「チャット（プレイヤー / チャンネル）別」に設定可能。設定変更は即時反映 |
| **チャット履歴** | 起動時に過去 N 時間分のログを自動読み込み。NGS / Classic 両対応。次回から同じ設定を記憶するオプション付き。 |
| **テーマ / カスタマイズ** | 8種類のプリセットテーマ + カスタムカラー対応 |
| **背景画像** | URL または ローカルファイルで背景画像を設定可能 |
| **フォントサイズ調整** | スライダーでメッセージ文字サイズをリアルタイム変更 |
| **カスタムアプリアイコン** | 好きな画像をアプリアイコンに設定可能 |
| **多言語 UI** | 日本語 / English / ภาษาไทย / 繁體中文 に対応 |
| **自動アップデート** | GitHub Releases からバージョンアップを自動検出・適用 |
| **デバッグログ** | 動作状況をリアルタイムで確認可能 |
| **テストチャット** | ログファイルなしで UI の動作確認ができるテスト送信機能 |

### 🎨 テーマ & カラー

プリセットテーマが複数用意されており、さらに **アクセントカラーを自由に変更** することも可能です。

---

## 🚀 使い方

### 1. ログフォルダの設定

アプリ起動時に `Documents\SEGA\PHANTASYSTARONLINE2\log_ngs` が **自動で入力されます**。

- ゲームをデフォルトの場所にインストールしている場合 → そのまま使えます。フォルダを選択する必要はありません
- パスが合わない場合（別ドライブにインストール済み・PSO2 Classic を使用中など）→ **PSO2 LOG FOLDER** 欄をクリックして正しいフォルダを手動で選択してください

### 2. チャンネルのフィルタリング

ツールバーのチャンネルボタン（PUBLIC / PARTY / WHISPER / TEAM / GUILD）をクリックして表示/非表示を切り替えます。

### 3. TTS（読み上げ）の設定

- **[VOICEVOX](https://voicevox.hiroshiba.jp/)** を使う場合: あらかじめ VOICEVOX を起動しておき、設定タブで話者とポートを指定してください。
- **[棒読みちゃん](https://chi.usamimi.info/Program/Application/BouyomiChan/)** を使う場合: 棒読みちゃんを起動した状態でアプリを使用してください。
- **Web Speech API** を使う場合: 追加インストール不要です。ブラウザ内蔵の音声を使用します。

### 4. 翻訳の設定

設定タブの翻訳セクションで翻訳エンジン・翻訳元言語・翻訳先言語を選択してください。Groq AI / OpenAI / Gemini / Claude を使う場合は各 API キーが必要です。Google Unofficial と MyMemory はキー不要で無料で使用できます。

### 5. チャット履歴の読み込み

起動時に「Chat History」モーダルが表示されます。読み込む時間数を選択するか、スキップ可能です。「Remember」をチェックすると次回から同じ設定で自動適用されます。

### 6. DLC / プラグインの管理

ツールバーの **DLC** ボタンからプラグインパネルを開けます。

- **＋ Add DLC (.zip)**: `.zip` 形式のプラグインをインストール
- 各プラグインで **RUN** / **STOP** の切り替え、**自動起動 ON/OFF**、フォルダを開く、アンインストールが可能
- プラグイン UI はアプリ内に直接埋め込んで表示できます

### 7. 背景画像の変更

#### URL を使って背景を設定する

1. 設定タブ → **Theme & Color Tones** を開く
2. 背景画像の入力欄に **画像の直接 URL** を貼り付ける
3. ✅ ボタンで適用

> 💡 **X（旧 Twitter）の画像 URL について**
>
> X の画像 URL（`https://pbs.twimg.com/media/...?format=jpg&name=4096x4096` など）は、そのままコピーして貼り付けるだけで背景として使用できます。

#### ローカルファイルを使って背景を設定する

1. 背景画像入力欄の横にあるフォルダアイコンをクリック
2. ローカルの画像ファイルを選択

---

## 🔒 プライバシー & アップデート

### データの収集について

本アプリは**ユーザーデータを一切収集・送信しません**。

- 設定・ブックマーク・ブロックリスト・VOICEVOX キャッシュはすべて `%APPDATA%\NYANNAPP\` にローカル保存のみ
- analytics・telemetry などの外部送信は一切なし
- 翻訳機能を使用した場合のみ、選択した翻訳 API へメッセージが送信されます（翻訳 OFF 時は送信なし）

---

## 🛠️ 技術スタック

- **Electron** — デスクトップアプリフレームワーク
- **Node.js** — ログ監視 / WebSocket サーバー
- **HTML / CSS / JavaScript** — UI
- **Socket.IO** — リアルタイム通信（localhost のみ）
- **Express** — 組み込み HTTP サーバー（API）
- **Bootstrap Icons** — UI アイコン（MIT License）
- **[VOICEVOX](https://voicevox.hiroshiba.jp/) / [棒読みちゃん](https://chi.usamimi.info/Program/Application/BouyomiChan/) / Web Speech API** — TTS エンジン

---

## 📁 対応ログ

| 種別 | フォルダ |
|------|---------|
| PSO2 NGS | `PHANTASYSTARONLINE2\log_ngs\ChatLog*.txt` |
| PSO2 Classic | `PHANTASYSTARONLINE2\log\ChatLog*.txt` |

---

# English

## ✅ Why This App Does NOT Violate PSO2: NGS Rules

From the perspective of SEGA's Terms of Service and anti-cheat regulations, this application is **completely safe** for the following reasons:

1. Zero access to game memory or processes
2. Reads only the official log files the game writes itself (plain text files that PSO2: NGS generates automatically — anyone can open them in Notepad)
3. No interference with game network or servers
4. Does not modify the game client
5. No automation or macro functionality

---

## What is NYANN!! APP!!?

**NYANN!! APP!!** is a **locally-running desktop application** that reads PSO2: New Genesis chat logs in real time, with display, TTS (text-to-speech), and optional translation support.

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

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Real-time display** | Monitors `ChatLog*.txt` written by the game, shows only new messages |
| **Channel filter** | Toggle PARTY / WHISPER / PUBLIC / TEAM / GUILD individually |
| **Anti-spam filter** | Auto-skips duplicate messages and flood (rapid repeat) messages |
| **Regex filter** | Fine-grained message filtering with regular expressions (import/export supported). Filter design inspired by [棒読みちゃん](https://chi.usamimi.info/Program/Application/BouyomiChan/) and [PSO2yomi](https://plan301e.web.fc2.com/plan/psuyomi3.html) |
| **Block list** | Permanently hide messages from specific players |
| **Translation** | Google Unofficial / MyMemory / Groq AI / OpenAI GPT / Google Gemini / Anthropic Claude (requires internet) |
| **TTS** | [VOICEVOX](https://voicevox.hiroshiba.jp/) / [Bouyomi-chan](https://chi.usamimi.info/Program/Application/BouyomiChan/) / Web Speech API support |
| **VOICEVOX audio cache** | Caches synthesized audio locally to reduce latency and network usage |
| **VOICEVOX word replacements** | Define custom text substitution rules applied before TTS. Ships with Bouyomi-chan's default dictionary built-in |
| **DLC / Plugins** | Install plugins from `.zip` files, manage them from a side panel, and embed plugin UIs directly inside the app. Per-plugin auto-start toggle supported |
| **NYANN Browser** | Built-in browser window for external pages, themed to match the app. UI supports Japanese / English switching |
| **Translated-text color** | Color translated text by **language** or by **chat (player / channel)**. Changes apply instantly |
| **Chat history** | Load the past N hours of chat on startup, from NGS and/or Classic logs |
| **Theme / Customization** | 8 preset themes + custom accent color |
| **Background image** | Set background via URL or local file |
| **Font size control** | Adjust message text size in real time with a slider |
| **Custom app icon** | Set your own image as the app window icon |
| **Multi-language UI** | 日本語 / English / ภาษาไทย / 繁體中文 |
| **Auto-update** | Detects and installs new versions from GitHub Releases |
| **Debug log** | Monitor app activity in real time |
| **Test chat** | Send test messages to preview the UI without a log file |

### 🎨 Theme & Color

Includes several preset themes, and you can also **customize the accent color freely** to your liking.

---

## 🚀 How to Use

### 1. Set up the log folder

The app **automatically pre-fills** the log folder path as `Documents\SEGA\PHANTASYSTARONLINE2\log_ngs` on first launch.

- If the game is installed at the default location → it works right away, no folder selection needed
- If the path doesn't match (e.g. game installed on a different drive, or using PSO2 Classic) → click the **PSO2 LOG FOLDER** field and manually select the correct folder

### 2. Filter channels

Click the channel buttons in the toolbar (PUBLIC / PARTY / WHISPER / TEAM / GUILD) to toggle each one on or off.

### 3. Set up TTS

- **[VOICEVOX](https://voicevox.hiroshiba.jp/)**: Launch VOICEVOX first, then set the speaker and port in the Settings tab.
- **[Bouyomi-chan](https://chi.usamimi.info/Program/Application/BouyomiChan/)**: Launch Bouyomi-chan before using the app.
- **Web Speech API**: No installation needed — uses the built-in browser speech engine.

### 4. Set up translation

In the Settings tab, choose your translation engine, source language, and target language. Groq AI, OpenAI GPT, Google Gemini, and Anthropic Claude require their respective API keys. Google Unofficial and MyMemory are free with no API key needed.

### 5. Load chat history

A **Chat History** prompt appears on startup. Choose how many hours back to load, or skip it. Check **Remember** to apply the same choice automatically next time.

### 6. Manage DLC / Plugins

Click the **DLC** button in the toolbar to open the plugin panel.

- **＋ Add DLC (.zip)**: Install a plugin from a `.zip` file
- Each plugin supports **RUN / STOP** toggle, **auto-start on launch** toggle, open folder, and uninstall
- Plugin UIs can be embedded directly inside the app window

### 7. Change the background image

#### Using a URL

1. Go to Settings → **Theme & Color Tones**
2. Paste a **direct image URL** into the background image field
3. Click ✅ to apply

> 💡 **X (formerly Twitter) image URLs**
>
> X image URLs (`https://pbs.twimg.com/media/...?format=jpg&name=4096x4096`) can be pasted directly into the background image field and will work as-is.

#### Using a local file

Click the folder icon next to the background image input and select an image file from your computer.

---

## 🔒 Privacy & Updates

### Data Collection

This app **does not collect or transmit any user data**.

- All settings, bookmarks, block list, and VOICEVOX cache are stored locally in `%APPDATA%\NYANNAPP\` only
- No analytics or telemetry of any kind
- If translation is enabled, messages are sent only to the translation API you selected — nothing is sent when translation is off

---

## 🛠️ Tech Stack

- **Electron** — Desktop app framework
- **Node.js** — Log watcher / WebSocket server
- **HTML / CSS / JavaScript** — UI
- **Socket.IO** — Real-time communication (localhost only)
- **Express** — Embedded HTTP server (API)
- **Bootstrap Icons** — UI icons (MIT License)
- **[VOICEVOX](https://voicevox.hiroshiba.jp/) / [Bouyomi-chan](https://chi.usamimi.info/Program/Application/BouyomiChan/) / Web Speech API** — TTS engines

---

## 📁 Supported Logs

| Type | Folder |
|------|--------|
| PSO2 NGS | `PHANTASYSTARONLINE2\log_ngs\ChatLog*.txt` |
| PSO2 Classic | `PHANTASYSTARONLINE2\log\ChatLog*.txt` |

---

# ภาษาไทย

## ✅ ทำไมแอปนี้ไม่ผิดกฎของ PSO2: NGS

1. ไม่แตะหน่วยความจำหรือ process ของเกมเลย
2. อ่านเฉพาะไฟล์ log ที่ PSO2: NGS สร้างขึ้นเองโดยอัตโนมัติ ซึ่งเป็นไฟล์ข้อความธรรมดาที่ผู้เล่นสามารถเปิดดูด้วย Notepad ได้อยู่แล้ว
3. ไม่รบกวนการสื่อสารหรือ server ของเกม
4. ไม่แก้ไข game client
5. ไม่มีระบบ automation หรือ macro

---

## NYANN!! APP!! คืออะไร?

**NYANN!! APP!!** คือแอปพลิเคชันเดสก์ท็อปที่ **ทำงานบนเครื่องโดยตรง** สำหรับอ่านข้อความแชทจากเกม PSO2: New Genesis แบบเรียลไทม์ พร้อมระบบแสดงผล อ่านออกเสียง (TTS) และแปลภาษา (เปิด/ปิดได้)

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

---

## ✨ ฟีเจอร์ทั้งหมด

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **แสดงผลเรียลไทม์** | ติดตามไฟล์ `ChatLog*.txt` ที่เกมสร้าง แสดงเฉพาะข้อความใหม่ |
| **กรองช่องแชท** | เปิด/ปิด PARTY / WHISPER / PUBLIC / TEAM / GUILD แยกได้ |
| **Anti-Spam** | ข้ามข้อความซ้ำและการส่งซ้ำถี่ (Flood) อัตโนมัติ |
| **Regex Filter** | กรองข้อความด้วย Regular Expression (นำเข้า/ส่งออกได้) ได้รับแรงบันดาลใจจาก [棒読みちゃん](https://chi.usamimi.info/Program/Application/BouyomiChan/) และ [PSO2yomi](https://plan301e.web.fc2.com/plan/psuyomi3.html) |
| **Block List** | บล็อกผู้เล่นที่ไม่ต้องการเห็นข้อความแบบถาวร |
| **แปลภาษา** | รองรับ Google Unofficial / MyMemory / Groq AI / OpenAI GPT / Google Gemini / Anthropic Claude (ต้องมีอินเทอร์เน็ต) |
| **TTS อ่านออกเสียง** | รองรับ [VOICEVOX](https://voicevox.hiroshiba.jp/) / [棒読みちゃん](https://chi.usamimi.info/Program/Application/BouyomiChan/) / Web Speech API |
| **VOICEVOX Cache** | แคชเสียงที่สังเคราะห์แล้วไว้ในเครื่อง ลดเวลารอและ traffic |
| **VOICEVOX Word Replacements** | กำหนดกฎแทนที่คำก่อนอ่านออกเสียง พร้อมพจนานุกรมเริ่มต้นจาก 棒読みちゃん |
| **DLC / Plugin** | ติดตั้งปลั๊กอินจากไฟล์ `.zip` จัดการผ่าน panel ด้านข้าง แสดง UI ของปลั๊กอินแบบฝังในแอปได้ ตั้งค่าเปิดอัตโนมัติได้ |
| **NYANN Browser** | หน้าต่างเบราว์เซอร์ในแอป ใช้ธีมเดียวกับแอปหลัก รองรับสลับภาษา 日本語 / English |
| **สีข้อความแปล** | กำหนดสีข้อความแปลแยกตาม **ภาษา** หรือแยกตาม **แชท (ผู้เล่น / ช่อง)** การเปลี่ยนแปลงมีผลทันที |
| **Chat History** | โหลดข้อความย้อนหลัง N ชั่วโมงตอนเปิดแอป รองรับทั้ง NGS และ Classic |
| **ธีม / ปรับแต่ง** | 8 ธีมสำเร็จ + กำหนดสีเองได้ |
| **ภาพพื้นหลัง** | ตั้งพื้นหลังจาก URL หรือไฟล์ในเครื่อง |
| **ปรับขนาดตัวอักษร** | เปลี่ยนขนาดข้อความแบบเรียลไทม์ด้วย Slider |
| **ไอคอนแอปแบบกำหนดเอง** | ตั้งรูปของตัวเองเป็นไอคอนหน้าต่างได้ |
| **UI หลายภาษา** | 日本語 / English / ภาษาไทย / 繁體中文 |
| **อัปเดตอัตโนมัติ** | ตรวจสอบและติดตั้งเวอร์ชันใหม่จาก GitHub Releases |
| **Debug Log** | ดูสถานะการทำงานของแอปแบบเรียลไทม์ |
| **Test Chat** | ส่งข้อความทดสอบเพื่อดูหน้าตา UI โดยไม่ต้องมีไฟล์ log |

### 🎨 ธีมและสีสัน

มีธีมสำเร็จรูปให้เลือกหลายแบบ และยังสามารถ **กำหนดสี Accent เองได้ตามใจชอบ** อีกด้วย

---

## 🚀 วิธีใช้งาน

### 1. ตั้งค่าโฟลเดอร์ Log

แอปจะ **กรอก path ให้อัตโนมัติ** เป็น `Documents\SEGA\PHANTASYSTARONLINE2\log_ngs` เมื่อเปิดครั้งแรก

- ถ้าติดตั้งเกมไว้ที่ตำแหน่งปกติ → ใช้ได้เลย ไม่ต้องเลือกโฟลเดอร์เพิ่มเติม
- ถ้า path ไม่ตรง เช่น ติดตั้งเกมไว้คนละ Drive หรือใช้ PSO2 Classic → คลิกที่ช่อง **PSO2 LOG FOLDER** แล้วเลือกโฟลเดอร์ที่ถูกต้องเอง

### 2. กรองช่องแชท

คลิกปุ่มช่องแชทในแถบเครื่องมือ (PUBLIC / PARTY / WHISPER / TEAM / GUILD) เพื่อเปิด/ปิดแต่ละช่อง

### 3. ตั้งค่า TTS

- **[VOICEVOX](https://voicevox.hiroshiba.jp/)**: เปิด VOICEVOX ก่อน จากนั้นตั้งค่า Speaker และ Port ในแท็บ Settings
- **[棒読みちゃん (Bouyomi-chan)](https://chi.usamimi.info/Program/Application/BouyomiChan/)**: เปิดโปรแกรมไว้ก่อนใช้งาน
- **Web Speech API**: ไม่ต้องติดตั้งอะไรเพิ่ม ใช้เสียงที่มีในระบบได้เลย

### 4. ตั้งค่าการแปลภาษา

ไปที่แท็บ Settings เลือก Engine แปล ภาษาต้นทาง และภาษาปลายทาง Groq AI / OpenAI GPT / Google Gemini / Anthropic Claude ต้องใช้ API Key ของแต่ละบริการ ส่วน Google Unofficial และ MyMemory ใช้ฟรีไม่ต้องมี Key

### 5. โหลด Chat History

เมื่อเปิดแอปจะมีหน้าต่าง **Chat History** ให้เลือกจำนวนชั่วโมงที่ต้องการโหลดย้อนหลัง หรือจะกด Skip ก็ได้ ถ้าเช็ก **Remember** แอปจะจำค่านี้ไว้ใช้ครั้งต่อไปอัตโนมัติ

### 6. จัดการ DLC / Plugin

คลิกปุ่ม **DLC** ในแถบเครื่องมือเพื่อเปิด panel จัดการปลั๊กอิน

- **＋ Add DLC (.zip)**: ติดตั้งปลั๊กอินจากไฟล์ `.zip`
- แต่ละปลั๊กอินสามารถ **RUN / STOP** เปิดพร้อมแอป (**Auto-start**) เปิดโฟลเดอร์ และถอนการติดตั้งได้
- UI ของปลั๊กอินสามารถแสดงแบบฝังอยู่ในหน้าต่างแอปหลักได้เลย

### 7. เปลี่ยนภาพพื้นหลัง

#### ใช้ URL

1. ไปที่ Settings → **Theme & Color Tones**
2. วาง **URL ของรูปภาพโดยตรง** ลงในช่องภาพพื้นหลัง
3. กด ✅ เพื่อใช้งาน

> 💡 **URL รูปภาพจาก X (Twitter เดิม)**
>
> URL รูปภาพจาก X (`https://pbs.twimg.com/media/...?format=jpg&name=4096x4096`) สามารถวางลงในช่องภาพพื้นหลังได้เลย ใช้งานได้ทันที

#### ใช้ไฟล์ในเครื่อง

คลิกไอคอนโฟลเดอร์ข้างช่องภาพพื้นหลัง แล้วเลือกไฟล์รูปภาพจากเครื่อง

---

## 🔒 ความเป็นส่วนตัวและการอัปเดต

### การเก็บข้อมูล

แอปนี้ **ไม่มีการเก็บหรือส่งข้อมูลผู้ใช้ใดๆ ทั้งสิ้น**

- ข้อมูลทั้งหมด (settings, bookmark, blocklist, VOICEVOX cache) เก็บไว้ใน `%APPDATA%\NYANNAPP\` ในเครื่องเท่านั้น
- ไม่มี analytics หรือ telemetry ใดๆ
- หากเปิดใช้การแปลภาษา ข้อความจะถูกส่งไปยัง API ที่เลือกเท่านั้น — หากปิดการแปล จะไม่มีการส่งข้อมูลออกไป

---

## 🛠️ เทคโนโลยีที่ใช้

- **Electron** — Framework สำหรับแอปเดสก์ท็อป
- **Node.js** — ระบบติดตาม log / WebSocket server
- **HTML / CSS / JavaScript** — UI
- **Socket.IO** — การสื่อสารเรียลไทม์ (localhost เท่านั้น)
- **Express** — HTTP server ในตัว (API)
- **Bootstrap Icons** — ไอคอน UI (MIT License)
- **[VOICEVOX](https://voicevox.hiroshiba.jp/) / [棒読みちゃん](https://chi.usamimi.info/Program/Application/BouyomiChan/) / Web Speech API** — TTS engine

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
