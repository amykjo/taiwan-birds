-- ============================================
-- 台灣鳥類觀察專案：建立資料庫與資料表
-- 用法：在 MySQL Workbench 開新的 SQL 分頁，整份貼上，按閃電圖示執行
-- ============================================

-- 建立資料庫（已經有就跳過）
-- utf8mb4 讓中文鳥名、地名不會變成問號
CREATE DATABASE IF NOT EXISTS taiwan_birds CHARACTER SET utf8mb4;
USE taiwan_birds;

-- --------------------------------------------
-- 資料表 1：observations（觀察紀錄）
-- 一列 = 一筆有人在台灣拍到鳥的紀錄
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS observations (
    obs_id            BIGINT PRIMARY KEY,   -- iNaturalist 的觀察編號；設成主鍵 = 不能重複，去重就靠它
    observed_on       DATE,                 -- 觀察日期
    taxon_id          INT,                  -- 物種編號
    sci_name          VARCHAR(150),         -- 學名，例如 Himantopus himantopus
    common_name       VARCHAR(100),         -- 中文名，例如 高蹺鴴
    order_name        VARCHAR(100),         -- 目，例如 鴴形目（救傷提示用）
    family_name       VARCHAR(100),         -- 科，例如 長腳鷸科
    place_guess       VARCHAR(255),         -- 地點描述，例如 雲林縣土庫鎮
    latitude          DECIMAL(9,6),         -- 緯度
    longitude         DECIMAL(9,6),         -- 經度
    photo_url         VARCHAR(500),         -- 照片網址（存 medium 尺寸）
    photo_license     VARCHAR(20),          -- 照片授權，例如 cc-by
    photo_attribution VARCHAR(255),         -- 照片標示文字，網頁上要顯示
    fetched_at        DATETIME DEFAULT CURRENT_TIMESTAMP  -- 這筆資料是什麼時候抓進來的（自動填）
);

-- --------------------------------------------
-- 資料表 2：fetch_log（抓取紀錄）
-- 一列 = 執行一次抓取程式的結果，用來證明資料流可以追蹤
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS fetch_log (
    log_id     INT AUTO_INCREMENT PRIMARY KEY,      -- 流水號，自動加 1
    run_at     DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 執行時間（自動填）
    fetched    INT,                                 -- 這次從 API 拿到幾筆
    skipped    INT,                                 -- 過濾掉幾筆（沒照片等）
    inserted   INT,                                 -- 真正新增幾筆（重複的不算）
    note       VARCHAR(255)                         -- 備註，例如抓了哪個日期範圍
);

-- 執行完可以用這兩行確認資料表建好了
SHOW TABLES;
DESCRIBE observations;
