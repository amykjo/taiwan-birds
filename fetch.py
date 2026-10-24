"""
抓取程式：從 iNaturalist 抓台灣鳥類觀察 → 清理 → 存進 MySQL
執行：python fetch.py
重複執行也沒關係，已經存過的紀錄會自動跳過（去重）
"""
import time
import requests
import pymysql
import config

API = "https://api.inaturalist.org/v1"
HEADERS = {"User-Agent": "taiwan-bird-class-project"}

PAGES = 10       # 抓幾頁
PER_PAGE = 200   # 每頁幾筆（API 上限 200）→ 2 頁 = 最多 400 筆

# 抓取條件
PARAMS = {
    "place_id": 7887,                          # 台灣
    "iconic_taxa": "Aves",                     # 鳥類
    "quality_grade": "research",               # 研究級
    "photos": "true",                          # 要有照片
    "photo_license": "cc0,cc-by,cc-by-nc",     # 只要可以公開使用的照片
    "order_by": "observed_on",
    "order": "desc",                           # 最新的在前面
    "per_page": PER_PAGE,
    "locale": "zh-TW",                         # 中文名
}


def get(path, **params):
    """向 API 要資料。每次先等 1 秒，避免要太快被網站擋下來"""
    time.sleep(1)
    r = requests.get(f"{API}/{path}", params=params, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


# ── 第 1 步：抓觀察紀錄 ─────────────────────────────────
def fetch_observations():
    results = []
    for page in range(1, PAGES + 1):
        data = get("observations", **PARAMS, page=page)
        results += data["results"]
        print(f"第 {page} 頁：拿到 {len(data['results'])} 筆")
    return results


# ── 第 2 步：用祖先 id 查出「目」和「科」 ─────────────────
def lookup_taxa(ids):
    """回傳一個字典：{taxon_id: (階層, 名稱)}，例如 {67561: ('order', '鴴形目')}"""
    info = {}
    ids = list(ids)
    for i in range(0, len(ids), 30):           # 一次最多查 30 個
        chunk = ",".join(str(x) for x in ids[i:i + 30])
        data = get(f"taxa/{chunk}", locale="zh-TW")
        for t in data["results"]:
            name = t.get("preferred_common_name") or t["name"]  # 沒中文名就用學名
            info[t["id"]] = (t["rank"], name)
    return info


# ── 第 3 步：清理，把一筆原始資料整理成要存的欄位 ───────────
def clean(obs, taxa_info):
    taxon = obs.get("taxon")
    photos = obs.get("photos")
    if not taxon or not photos:                 # 沒物種或沒照片 → 過濾掉
        return None
    photo = photos[0]
    if not photo.get("license_code"):           # 保險起見再檢查一次授權
        return None

    # 從祖先裡找出 目(order) 和 科(family)
    order_name = family_name = None
    for aid in taxon.get("ancestor_ids", []):
        rank, name = taxa_info.get(aid, (None, None))
        if rank == "order":
            order_name = name
        elif rank == "family":
            family_name = name

    # 座標原本是 "23.69,120.35" 這樣的文字，切成兩個數字
    lat = lng = None
    if obs.get("location"):
        lat, lng = obs["location"].split(",")

    return (
        obs["id"],
        obs.get("observed_on"),
        taxon["id"],
        taxon.get("name"),
        taxon.get("preferred_common_name"),
        order_name,
        family_name,
        obs.get("place_guess"),
        lat,
        lng,
        photo["url"].replace("square", "medium"),  # 換成中等大小的照片
        photo.get("license_code"),
        photo.get("attribution"),
    )


# ── 主程式 ─────────────────────────────────────────────
def main():
    raw = fetch_observations()

    # 收集所有祖先 id，一次查完（重複的只查一次）
    all_ids = set()
    for obs in raw:
        if obs.get("taxon"):
            all_ids.update(obs["taxon"].get("ancestor_ids", []))
    print(f"查詢 {len(all_ids)} 個分類的名稱……")
    taxa_info = lookup_taxa(all_ids)

    rows = [clean(obs, taxa_info) for obs in raw]
    rows = [r for r in rows if r is not None]
    skipped = len(raw) - len(rows)

    # 寫進 MySQL
    conn = pymysql.connect(
        host=config.DB_HOST, port=config.DB_PORT,
        user=config.DB_USER, password=config.DB_PASSWORD,
        database=config.DB_NAME, charset="utf8mb4",
    )
    try:
        with conn.cursor() as cursor:
            # INSERT IGNORE：obs_id 已經存在就跳過，不會報錯 → 這就是去重
            sql = """
                INSERT IGNORE INTO observations
                (obs_id, observed_on, taxon_id, sci_name, common_name,
                 order_name, family_name, place_guess, latitude, longitude,
                 photo_url, photo_license, photo_attribution)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """
            inserted = cursor.executemany(sql, rows)  # 回傳真正新增的筆數

            # 記錄這次執行的結果
            cursor.execute(
                "INSERT INTO fetch_log (fetched, skipped, inserted, note) VALUES (%s,%s,%s,%s)",
                (len(raw), skipped, inserted, f"抓 {PAGES} 頁，每頁 {PER_PAGE} 筆"),
            )

            cursor.execute("SELECT COUNT(*) FROM observations")
            total = cursor.fetchone()[0]
        conn.commit()
    finally:
        conn.close()

    print("\n===== 這次執行結果 =====")
    print(f"從 API 拿到：{len(raw)} 筆")
    print(f"過濾掉　　：{skipped} 筆")
    print(f"新增　　　：{inserted} 筆（重複的不算）")
    print(f"資料庫總共：{total} 筆")


if __name__ == "__main__":
    main()
