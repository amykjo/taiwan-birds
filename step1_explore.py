"""
第一步：探索 iNaturalist API
目標：確認台灣地點代碼、看懂一筆觀察紀錄有哪些欄位，並順便測試幾個「待確認」事項。
執行：pip install requests  →  python step1_explore.py
"""
import json
import requests

API = "https://api.inaturalist.org/v1"
HEADERS = {"User-Agent": "taiwan-bird-class-project"}  # 加上識別，對 API 比較禮貌


def get(path, **params):
    r = requests.get(f"{API}/{path}", params=params, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


# ── 待確認 1：台灣的地點代碼 ────────────────────────────
print("=== 地點搜尋：Taiwan ===")
for p in get("places/autocomplete", q="Taiwan")["results"]:
    print(p["id"], "|", p.get("display_name"), "| admin_level:", p.get("admin_level"))

# 看完上面的輸出後，把正確的 id 填在這裡（應該是國家層級那一筆）
PLACE_ID = int(input("\n請輸入台灣的 place_id："))

# ── 抓一頁鳥類觀察 ─────────────────────────────────────
data = get(
    "observations",
    place_id=PLACE_ID,
    iconic_taxa="Aves",          # 只要鳥類
    quality_grade="research",    # 研究級，物種鑑定較可靠
    photos="true",
    order_by="observed_on",
    order="desc",
    per_page=30,
    locale="zh-TW",              # 讓物種俗名回傳中文
)
print(f"\n符合條件的總筆數：{data['total_results']}")

with open("sample.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("原始資料已存到 sample.json，可以打開來看完整欄位")

# ── 看第一筆有哪些欄位可以進資料表 ──────────────────────
obs = data["results"][0]
taxon = obs["taxon"]
photo = obs["photos"][0] if obs["photos"] else {}
print("\n=== 第一筆紀錄 ===")
print("觀察 id      :", obs["id"])
print("觀察日期     :", obs.get("observed_on"))
print("學名         :", taxon.get("name"))
print("中文名       :", taxon.get("preferred_common_name"))
print("地點描述     :", obs.get("place_guess"))
print("座標         :", obs.get("location"))
print("place_ids    :", obs.get("place_ids"))   # 用來判斷能否對應縣市
print("祖先 taxon id:", taxon.get("ancestor_ids"))  # 待確認 2：科／目要從這裡反查
print("照片網址     :", photo.get("url"))
print("照片授權     :", photo.get("license_code"))  # 待確認 5
print("照片標示     :", photo.get("attribution"))

# ── 待確認 3：能否用起訖日期抓特定月份 ──────────────────
sept = get("observations", place_id=PLACE_ID, iconic_taxa="Aves",
           quality_grade="research", d1="2026-09-01", d2="2026-09-30", per_page=1)
print(f"\n2026 年 9 月鳥類研究級紀錄數：{sept['total_results']}")

# ── 待確認 4：排除死亡個體 ─────────────────────────────
# iNaturalist 的「Alive or Dead」註記；17 與 19 這兩個代碼請以官方 API 文件再核對一次
alive = get("observations", place_id=PLACE_ID, iconic_taxa="Aves",
            quality_grade="research", without_term_value_id=19, term_id=17, per_page=1)
print(f"排除標為死亡後的紀錄數：{alive['total_results']}（和上面總筆數比較，差距就是被排除的數量）")
