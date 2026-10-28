# 上下文資訊文件：台灣鳥類觀察

給 AI（和換電腦的自己）接續開發用。每次開新對話先貼這份，讓 AI 知道專案現在的狀態、技術邊界和已經做過的決定。更新於 2026-10-27。

---

## 0. 一句話解釋專案目的

本專案幫助民眾在遇到落地或受傷的鳥時做出正確處理，並用台灣近期觀察資料判斷鳥的類群，給出對應的救傷提醒。（主軸：救傷為主，資料是工具；2026-10-27 定案）

## 1. 專案全局認知與技術堆疊

**技術限制（AI 必須遵守）**
- 後端只用 Python 3.12，套件只用 `requests`、`PyMySQL`；不要引入 pandas、SQLAlchemy、Flask 等其他套件
- 資料庫用 MySQL，資料庫名稱 `taiwan_birds`，編碼 `utf8mb4`
- 網頁只用 HTML、CSS、原生 JavaScript：**不使用框架、不從 CDN 載入任何東西**（展示用的電腦可能沒網路）
- 網頁必須能**直接雙擊 index.html 開啟**，不需要伺服器；所以資料匯出成 `data.js`（`const BIRDS = [...]`），不是 JSON
- 寫入資料庫一律用 `%s` 參數化，不可把字串拼進 SQL
- 動態文字一律用 `textContent` 或 `escapeHTML()`，不可把資料直接放進 `innerHTML`
- 資料庫密碼只放 `config.py`（已在 .gitignore），範本是 `config.example.py`
- 文字檔一律存 UTF-8（PowerShell 的 `>` 會存成 UTF-16，要注意）
- 介面文字用繁體中文

**救傷內容的限制**
- 只能使用交接文件「第一層定稿」「第二層定稿」裡的句子，可以縮短，不能新增沒有出處的內容
- 不可加回「刻意不收的內容」：給水方法、臨時鳥巢、猛禽與鷺鷥的抓取方式等
- `鳥類救傷建議整理表.xlsx` 是舊版，不可當內容來源

**工作方式**
- 改程式前先說要改哪些檔案、怎麼改，確認後再動手
- 較大的改動在 Git 分支上做，main 保持可展示

## 2. 資料庫綱要（Database Schema）

**observations（觀察紀錄）**：每一列代表一筆「有人在台灣拍到一隻鳥」的 iNaturalist 研究級觀察紀錄。

| 欄位 | 型別 | 說明 |
|---|---|---|
| obs_id | BIGINT, Primary Key | iNaturalist 觀察編號；主鍵＋`INSERT IGNORE` 達成去重 |
| observed_on | DATE | 觀察日期 |
| taxon_id | INT | 物種編號 |
| sci_name | VARCHAR(150) | 學名 |
| common_name | VARCHAR(100) | 中文名 |
| order_name | VARCHAR(100) | 目（中文） |
| family_name | VARCHAR(100) | 科（中文；沒有中文名時是拉丁名，如 Glareolidae） |
| place_guess | VARCHAR(255) | 地點描述（可能是中文地址、英文地址或只寫 Taiwan） |
| latitude, longitude | DECIMAL(9,6) | 座標（保育類可能被模糊化；目前 export.py 沒有匯出） |
| photo_url | VARCHAR(500) | 照片網址（medium 尺寸） |
| photo_license | VARCHAR(20) | 照片授權 |
| photo_attribution | VARCHAR(255) | 照片標示文字 |
| fetched_at | DATETIME | 抓進來的時間（自動填） |

**fetch_log（抓取紀錄）**：每一列代表執行一次 fetch.py 的結果。

| 欄位 | 型別 | 說明 |
|---|---|---|
| log_id | INT, Primary Key, AUTO_INCREMENT | 流水號 |
| run_at | DATETIME | 執行時間 |
| fetched / skipped / inserted | INT | 拿到、過濾、真正新增的筆數 |
| note | VARCHAR(255) | 備註（抓幾頁、每頁幾筆） |

## 3. 目錄結構

```
taiwan-birds/
├── step1_explore.py        探索 API（地點代碼、欄位）
├── step1b_check.py         補充測試（授權、死亡個體、目科）
├── sample.json             探索時的原始資料範例
├── schema.sql              建資料庫與資料表
├── config.example.py       資料庫設定範本（config.py 不上傳）
├── fetch.py                抓取 → 清理 → 寫入 MySQL（PAGES = 10，約 2000 筆）
├── export.py               MySQL → web/data.js
├── stats.sql               9 段統計與品質檢查
├── requirements.txt
├── README.md
├── docs/
│   ├── MVP.md              最小可行性產品文件
│   └── CONTEXT.md          本文件
└── web/
    ├── index.html          版面（首頁救傷入口、近期觀察、詳細視窗）
    ├── style.css           樣式（第 1 行 [hidden] 規則不可刪）
    ├── script.js           SITUATIONS、GROUP_NOTES、SOURCES 與互動
    └── data.js             export.py 自動產生，不手動修改
```

## 4. 已完成進度（截至 2026-10-27）

**已完成**
- 資料流全部完成：fetch.py → MySQL → export.py → data.js → 網頁
- 已擴容到 2000 筆（10/10–10/24）、216 種鳥；去重驗證：拿到 2000、新增 1600、總共 2000
- 主軸定為救傷；首頁改版：最上方是救傷專線與三張情境卡片，下方是「從近期觀察找找看」
- 網頁：卡片、搜尋、詳細視窗、救傷區塊（三張情境卡片、特徵表、黃色框、聯絡列、資料來源）；有黃色框的鳥，一般做法預設收起
- 救傷內容已在 rescue-content 分支完成並合併回 main
- 學校桌機、筆電都能跑；config.example.py、requirements.txt（UTF-8）已補上
- README、MVP、CONTEXT 文件已更新為救傷主軸

**已知狀況（不要重複踩）**
- iNaturalist 的中文科名是「鴨科」不是「雁鴨科」，程式兩個都比對
- 775 筆（39%）判斷不出縣市；「竹北市」等鄉鎮市會被誤當成縣市
- 約 0.25% 是不同帳號上傳同一張照片，決定不處理
- CSS 的 display 會蓋過 hidden，已在 style.css 第 1 行加 `[hidden] { display: none !important; }`

**目前狀態**
- 功能與資料已凍結：資料停在 2026-10-24 的快照，繳交（10/29）前不重抓、不加新功能
- 報告準備中：簡報定稿、講稿、錄 Demo、備份資料庫

## 5. API 規格

本專案沒有自己的後端 API，這裡記錄「用到的外部 API」和「網頁讀的資料格式」。

### 5-1 iNaturalist API（fetch.py 使用）

`GET https://api.inaturalist.org/v1/observations`

| 參數 | 值 | 用途 |
|---|---|---|
| place_id | 7887 | 台灣（國家層級；7888 是省層級，會漏掉直轄市） |
| iconic_taxa | Aves | 只要鳥 |
| quality_grade | research | 研究級 |
| photos | true | 要有照片 |
| photo_license | cc0,cc-by,cc-by-nc | 只要可公開使用的照片 |
| order_by / order | observed_on / desc | 最新的在前 |
| per_page / page | 200 / 1–10 | 每頁上限 200 |
| locale | zh-TW | 回傳中文名 |

`GET https://api.inaturalist.org/v1/taxa/{id,id,...}?locale=zh-TW`：用觀察紀錄的 `ancestor_ids` 查出目、科的中文名，一次最多 30 個。

每次呼叫前等 1 秒；請求帶 `User-Agent: taiwan-bird-class-project`。

### 5-2 web/data.js 格式（export.py 產生，script.js 讀取）

```javascript
const BIRDS = [
  {
    "id": 408817034,              // obs_id
    "name": "高蹺鴴",             // 中文名，沒有就用學名
    "sci": "Himantopus himantopus",
    "order": "鴴形目",
    "family": "長腳鷸科",
    "date": "2026-10-17",
    "county": "雲林縣",           // 從地點描述判斷，判斷不出為 ""
    "place": "633台灣雲林縣土庫鎮南平里",
    "photo": "https://.../medium.jpg",
    "license": "cc-by-nc",
    "credit": "(c) ...",
    "url": "https://www.inaturalist.org/observations/408817034"
  }
];
```

### 5-3 script.js 的救傷資料結構

- `SITUATIONS`：`hint`（卡片下方提示、特徵對照表）、`chick`、`fledgling`、`injured`
- `GROUP_NOTES`：每個類群有 `label`、`match(bird)`、`title(bird)`、`items`、`sources`
  - `raptor` 猛禽：order 是鷹形目、隼形目、鴞形目
  - `heron` 鷺鷥類：family 是鷺科（朱鷺科不算）
  - `precocial` 早熟型水鳥：family 是秧雞科、長腳鷸科、鴴科、鷸科、鴨科（雁鴨科）
  - `pigeon` 鴿子：sci 開頭是 Columba livia
- `findGroup(bird)` 依序比對，回傳第一個符合的，所以每隻鳥最多一個黃色框
- `createPicker`：三張情境卡片的元件，首頁和詳細視窗共用（呼叫兩次）
- `SOURCES`：來源編號 → 名稱、網址
