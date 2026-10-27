USE taiwan_birds;
SELECT order_name AS 目, family_name AS 科, COUNT(*) AS 筆數
FROM observations
WHERE order_name IN ('鵜形目','鶴形目','鴴形目','雁形目','鴿形目')
GROUP BY order_name, family_name
ORDER BY order_name, 筆數 DESC;


USE taiwan_birds;
SELECT common_name AS 鳥名, observed_on AS 日期, place_guess AS 地點, COUNT(*) AS 筆數
FROM observations
GROUP BY common_name, observed_on, place_guess
HAVING COUNT(*) >= 3
ORDER BY 筆數 DESC
LIMIT 20;

SELECT COUNT(*) AS 筆數
FROM observations
WHERE photo_attribution REGEXP '^\\(c\\) st[0-9]+';