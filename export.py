"""
匯出程式：從 MySQL 讀出鳥類資料 → 存成 web/data.js 給網頁使用
執行：python export.py
每次跑完 fetch.py 抓了新資料，就再跑一次這支，網頁就會更新
"""
import os
import re
import json
import pymysql
import config

# 1. 連上資料庫
conn = pymysql.connect(
    host=config.DB_HOST, port=config.DB_PORT,
    user=config.DB_USER, password=config.DB_PASSWORD,
    database=config.DB_NAME, charset="utf8mb4",
    cursorclass=pymysql.cursors.DictCursor,  # 讓每一筆資料變成字典，用欄位名稱取值
)

# 2. 把資料讀出來，最新的觀察排在前面
try:
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT obs_id, observed_on, common_name, sci_name,
                   order_name, family_name, place_guess,
                   photo_url, photo_license, photo_attribution
            FROM observations
            ORDER BY observed_on DESC
        """)
        rows = cursor.fetchall()
finally:
    conn.close()


def find_county(place):
    """從地點描述找出縣市，例如「633台灣雲林縣土庫鎮」→「雲林縣」；找不到就回傳空字串"""
    if not place:
        return ""
    m = re.search(r"(..[縣市])", place)
    return m.group(1).replace("台", "臺") if m else ""


# 3. 整理成網頁要用的格式（欄位名稱取短一點，網頁寫起來比較方便）
birds = []
for r in rows:
    birds.append({
        "id": r["obs_id"],
        "name": r["common_name"] or r["sci_name"],  # 沒中文名就用學名
        "sci": r["sci_name"],
        "order": r["order_name"] or "",
        "family": r["family_name"] or "",
        "date": str(r["observed_on"]),               # 日期轉成文字，例如 "2026-10-17"
        "county": find_county(r["place_guess"]),
        "place": r["place_guess"] or "",
        "photo": r["photo_url"],
        "license": r["photo_license"],
        "credit": r["photo_attribution"],
        "url": f"https://www.inaturalist.org/observations/{r['obs_id']}",  # 原始紀錄連結（標示來源）
    })

# 4. 寫成 data.js：內容是「const BIRDS = [...];」
#    網頁用 <script src="data.js"> 載入，直接雙擊 index.html 就能讀到，不需要伺服器
os.makedirs("web", exist_ok=True)
with open("web/data.js", "w", encoding="utf-8") as f:
    f.write("// 這個檔案由 export.py 自動產生，請不要手動修改\n")
    f.write("const BIRDS = ")
    json.dump(birds, f, ensure_ascii=False, indent=2)  # ensure_ascii=False 讓中文正常顯示
    f.write(";\n")

print(f"已匯出 {len(birds)} 筆資料到 web/data.js")
