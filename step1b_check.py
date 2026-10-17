"""
補充測試：確認兩件事
1. 只抓「可以公開使用」授權的照片，還剩多少筆
2. 排除死亡個體的正確寫法
3. 祖先 id 能不能查出「目」和「科」的名字
執行：python step1b_check.py
"""
import requests

API = "https://api.inaturalist.org/v1"
HEADERS = {"User-Agent": "taiwan-bird-class-project"}

# 每次查詢都會用到的共同條件
BASE = {"place_id": 7887, "iconic_taxa": "Aves", "quality_grade": "research", "per_page": 1}


def count(**extra):
    """回傳符合條件的總筆數"""
    params = {**BASE, **extra}
    r = requests.get(f"{API}/observations", params=params, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()["total_results"]


total = count()
print(f"全部研究級鳥類紀錄：{total}")

# ── 1. 照片授權 ───────────────────────────────────────
# cc0 = 完全公開；cc-by = 標示作者即可使用；cc-by-nc = 標示作者、非商業使用
licensed = count(photo_license="cc0,cc-by,cc-by-nc")
print(f"照片可公開使用的紀錄：{licensed}")

# ── 2. 排除死亡個體（這次只用 without_term_value_id）──────
no_dead = count(without_term_value_id=19)
print(f"排除死亡個體後：{no_dead}（被排除 {total - no_dead} 筆）")

# 兩個條件一起用，就是之後真正要抓的範圍
final = count(photo_license="cc0,cc-by,cc-by-nc", without_term_value_id=19)
print(f"兩個條件都加上：{final}")

# ── 3. 用祖先 id 查目、科 ─────────────────────────────
# 高蹺鴴那筆的祖先 id，一次查完
ids = "48460,1,2,355675,3,67561,71361,4831,4835"
r = requests.get(f"{API}/taxa/{ids}", params={"locale": "zh-TW"}, headers=HEADERS, timeout=30)
print("\n=== 祖先分類 ===")
for t in r.json()["results"]:
    print(f"{t['rank']:<10} {t['name']:<25} {t.get('preferred_common_name', '')}")
