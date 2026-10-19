// ===== 設定 =====
const PAGE_SIZE = 60;   // 一次顯示幾張卡片

// ===== 找到網頁上要操作的元素 =====
const searchInput = document.getElementById("search");
const grid        = document.getElementById("grid");
const countText   = document.getElementById("count");
const emptyText   = document.getElementById("empty");
const moreButton  = document.getElementById("more");
const summaryText = document.getElementById("summary");

// ===== 目前狀態 =====
let filtered = BIRDS;     // 符合搜尋條件的鳥（BIRDS 來自 data.js）
let shown = PAGE_SIZE;    // 目前顯示幾張


// 把文字裡的特殊符號轉換掉，避免資料裡的 < > 被瀏覽器當成 HTML 執行
// （地點、攝影者名稱是網友填的，要防範這種情況）
function escapeHTML(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


// 把一筆鳥的資料變成一張卡片的 HTML
// data-id 記住這張卡片是哪一筆，點的時候才知道要打開誰
function cardHTML(bird) {
  const place = [bird.date, bird.county].filter(Boolean).join(" · ");
  return `
    <article class="card" data-id="${bird.id}" tabindex="0">
      <img src="${escapeHTML(bird.photo)}" alt="${escapeHTML(bird.name)}" loading="lazy">
      <div class="card-body">
        <h2>${escapeHTML(bird.name)}</h2>
        <p class="sci">${escapeHTML(bird.sci)}</p>
        ${bird.order ? `<span class="tag">${escapeHTML(bird.order)}</span>` : ""}
        <p class="meta">${escapeHTML(place)}</p>
        <p class="credit">${escapeHTML(bird.credit)}</p>
      </div>
    </article>
  `;
}


// ===== 詳細視窗 =====
const detail = document.getElementById("detail");

// 救傷提示：目前先放通用建議，之後依「目」換成不同內容
const DEFAULT_HELP =
  "先觀察，不要急著撿起來。羽毛已長齊的幼鳥落地通常是在學飛，親鳥多半就在附近。" +
  "若明顯受傷或有立即危險，可用紙箱輕輕裝起放在安靜陰暗處，不要餵食或餵水，並盡快聯絡救傷單位。";

function openDetail(bird) {
  // 照片換成大尺寸
  document.getElementById("detail-photo").src = bird.photo.replace("medium", "large");
  document.getElementById("detail-photo").alt = bird.name;
  // 用 textContent 填文字，瀏覽器不會把它當 HTML，所以不用 escape
  document.getElementById("detail-name").textContent   = bird.name;
  document.getElementById("detail-sci").textContent    = bird.sci;
  document.getElementById("detail-taxon").textContent  = [bird.order, bird.family].filter(Boolean).join(" › ") || "—";
  document.getElementById("detail-date").textContent   = bird.date;
  document.getElementById("detail-place").textContent  = bird.place || "—";
  document.getElementById("detail-credit").textContent = `${bird.credit}（${bird.license}）`;
  document.getElementById("detail-link").href          = bird.url;
  document.getElementById("detail-help").textContent   = DEFAULT_HELP;
  detail.showModal();   // 打開視窗，背景會變暗
}

// 點卡片：找出被點的是哪一筆，打開它
grid.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (!card) return;
  const bird = BIRDS.find((b) => String(b.id) === card.dataset.id);
  openDetail(bird);
});

// 用鍵盤選到卡片按 Enter 也能打開
grid.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.classList.contains("card")) {
    event.target.click();
  }
});

// 關閉視窗：按 × 或點視窗外面的暗色區域（按 Esc 瀏覽器會自動關）
document.getElementById("close").addEventListener("click", () => detail.close());
detail.addEventListener("click", (event) => {
  if (event.target === detail) detail.close();
});


// 依照目前狀態重新畫出卡片
function render() {
  const visible = filtered.slice(0, shown);           // 只取前 shown 筆
  grid.innerHTML = visible.map(cardHTML).join("");

  countText.textContent = `共 ${filtered.length} 筆紀錄，顯示 ${visible.length} 筆`;
  emptyText.hidden  = filtered.length > 0;            // 有結果就藏起「找不到」
  moreButton.hidden = shown >= filtered.length;       // 全部顯示完就藏起按鈕
}


// 搜尋：每次輸入文字就重新篩選
searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.trim().toLowerCase();
  filtered = BIRDS.filter((bird) => {
    const text = [bird.name, bird.sci, bird.county, bird.place].join(" ").toLowerCase();
    return text.includes(keyword);
  });
  shown = PAGE_SIZE;   // 換關鍵字時，從頭開始顯示
  render();
});


// 「顯示更多」：多顯示一頁
moreButton.addEventListener("click", () => {
  shown += PAGE_SIZE;
  render();
});


// 標題下方的資料概況：幾筆、幾種鳥、日期範圍
const species = new Set(BIRDS.map((b) => b.name)).size;
const dates = BIRDS.map((b) => b.date).sort();
summaryText.textContent =
  `${BIRDS.length} 筆觀察紀錄 · ${species} 種鳥 · ${dates[0]} 至 ${dates[dates.length - 1]}`;

// 一打開網頁就先畫一次
render();
