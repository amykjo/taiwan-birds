-- ============================================
-- 台灣鳥類觀察專案：SQL 統計查詢
-- 用法：在 MySQL Workbench 開啟這個檔案
--       游標放在想執行的那一段裡，按 Ctrl + Enter 只執行那一段
--       （按大閃電會全部執行，結果會分成很多個分頁）
-- 注意：這裡的數字都是「觀察紀錄數」，代表有多少人拍到並上傳，
--       不等於野外的鳥有多少隻（常見、好拍的鳥會被拍比較多次）
-- ============================================

USE taiwan_birds;


-- 1. 資料概況：總共幾筆、幾種鳥、涵蓋哪幾天
SELECT
    COUNT(*)                    AS 紀錄數,
    COUNT(DISTINCT common_name) AS 鳥種數,
    MIN(observed_on)            AS 最早日期,
    MAX(observed_on)            AS 最新日期
FROM observations;


-- 2. 觀察紀錄數前 10 名的鳥
--    GROUP BY = 按鳥名分堆；COUNT(*) = 數每堆幾筆；ORDER BY ... DESC = 由多到少
SELECT common_name AS 鳥名, sci_name AS 學名, COUNT(*) AS 紀錄數
FROM observations
GROUP BY common_name, sci_name
ORDER BY 紀錄數 DESC
LIMIT 10;


-- 3. 各「目」的紀錄數與鳥種數
SELECT
    order_name                  AS 目,
    COUNT(*)                    AS 紀錄數,
    COUNT(DISTINCT common_name) AS 鳥種數
FROM observations
GROUP BY order_name
ORDER BY 紀錄數 DESC;


-- 4. 紀錄數前 10 名的「科」
SELECT family_name AS 科, order_name AS 所屬目, COUNT(*) AS 紀錄數
FROM observations
GROUP BY family_name, order_name
ORDER BY 紀錄數 DESC
LIMIT 10;


-- 5. 各縣市的紀錄數
--    REGEXP_SUBSTR 從地點描述抓出「XX縣」或「XX市」；REPLACE 把「台」統一成「臺」
SELECT
    REPLACE(REGEXP_SUBSTR(place_guess, '..[縣市]'), '台', '臺') AS 縣市,
    COUNT(*) AS 紀錄數
FROM observations
GROUP BY 縣市
ORDER BY 紀錄數 DESC;


-- 6. 每天的紀錄數（看資料分布在哪幾天）
SELECT observed_on AS 日期, COUNT(*) AS 紀錄數
FROM observations
GROUP BY observed_on
ORDER BY observed_on DESC;


-- 7. 照片授權的分布（確認全部都是可公開使用的授權）
SELECT photo_license AS 授權, COUNT(*) AS 紀錄數
FROM observations
GROUP BY photo_license
ORDER BY 紀錄數 DESC;


-- 8. 資料品質檢查：有幾筆缺中文名、缺目、缺科、缺縣市
--    SUM(條件) 會把符合條件的算 1、不符合算 0 再加總
SELECT
    SUM(common_name IS NULL)                         AS 缺中文名,
    SUM(order_name IS NULL)                          AS 缺目,
    SUM(family_name IS NULL)                         AS 缺科,
    SUM(REGEXP_SUBSTR(place_guess, '..[縣市]') IS NULL) AS 無法判斷縣市
FROM observations;


-- 9. 抓取紀錄：每次執行 fetch.py 的結果
SELECT log_id AS 編號, run_at AS 執行時間, fetched AS 拿到,
       skipped AS 過濾, inserted AS 新增, note AS 備註
FROM fetch_log
ORDER BY run_at;
