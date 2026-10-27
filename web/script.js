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
// 標籤：屬於第二層類群的鳥顯示黃色類群名（例如「鷺鷥類」），其他的顯示目
function cardHTML(bird) {
  const place = [bird.date, bird.county].filter(Boolean).join(" · ");
  const group = findGroup(bird);
  let tag = "";
  if (group) {
    tag = `<span class="tag tag-group">${escapeHTML(group.label)}</span>`;
  } else if (bird.order) {
    tag = `<span class="tag">${escapeHTML(bird.order)}</span>`;
  }
  return `
    <article class="card" data-id="${bird.id}" tabindex="0">
      <img src="${escapeHTML(bird.photo)}" alt="${escapeHTML(bird.name)}" loading="lazy">
      <div class="card-body">
        <h3>${escapeHTML(bird.name)}</h3>
        <p class="sci">${escapeHTML(bird.sci)}</p>
        ${tag}
        <p class="meta">${escapeHTML(place)}</p>
        <p class="credit">${escapeHTML(bird.credit)}</p>
      </div>
    </article>
  `;
}


// ============================================================
// 遇到牠怎麼辦？內容
// 文字全部來自「階段二交接_救傷內容.md」的第一層、第二層定稿（可縮短，不新增）
// 每一段後面的 sources 是用到的來源編號，對應下方 SOURCES
// ============================================================

// ----- 第一層：分辨提示＋三種情境（每隻鳥都顯示）-----
const SITUATIONS = {
  // 分辨提示：卡片上的短說明、「分不出來時」、詳細特徵對照表
  hint: {
    unsure: "分不出來時：先放到附近高處，再聯絡救傷單位。",
    table: {
      columns: ["雛鳥", "幼鳥", "成鳥"],
      rows: [
        ["羽毛", "光禿無毛，或只有絨毛、羽毛沒長齊", "羽毛大致長齊，可能還夾雜絨毛；尾羽短", "體型和羽色都已長成"],
        ["站立和移動", "腳沒力氣，站不起來", "會跳、會拍翅膀，但飛不遠", "正常會飛；待在地上不飛走通常有狀況"],
        ["嘴角", "黃白色", "仍是黃白色", "—"],
        ["眼睛和體型", "眼睛可能還沒張開；比親鳥小很多", "眼睛張開；和親鳥差不多或略小", "和親鳥一樣"],
      ],
    },
    sources: ["S1", "S8", "S9", "S12"],
  },

  chick: {
    name: "雛鳥",
    short: "沒有毛或只有絨毛，站不穩",
    lead: "看得到巢就放回去，找不到就打電話",
    items: [
      "沒受傷又看得到鳥巢，就盡快放回巢中，並確認是牠的巢。",
      "找不到巢或巢太高很常見，請打電話給救傷單位，描述外觀和行為請他們判斷。",
      "巢被破壞、受傷或親鳥已死亡，送野鳥救傷單位。",
      "人碰過不會被拋棄：鳥比較注重聲音和外型，不靠氣味。",
    ],
    sources: ["S1", "S7", "S8", "S2", "S24", "S4", "S13", "S3"],
  },

  fledgling: {
    name: "幼鳥",
    short: "已長羽毛，會跳但飛不遠",
    lead: "多半是在學飛，先退遠觀察，不要撿走",
    items: [
      "最常被撿到的就是幼鳥。飛一小段又掉下來是在學飛，在地上待幾天是正常的。",
      "有活力、沒受傷、環境安全：退遠一點，讓親鳥回來餵。",
      "位置危險時，放到附近高處（樹枝、牆上），留在聽得到叫聲的範圍內。",
      "離開一段時間再回來看（台北市野鳥學會建議約半小時）。親鳥沒帶走或牠精神不好，送救傷單位。",
      "人碰過不會被拋棄。",
    ],
    sources: ["S1", "S2", "S7", "S8", "S9", "S12", "S24", "S4", "S13"],
  },

  injured: {
    name: "受傷或生病",
    short: "有傷口、沒活力，或成鳥待在地上不飛走",
    lead: "保暖、安靜、別餵食，盡快聯絡救傷單位",
    note: "成鳥正常會飛；待在地上不飛走，多半是受傷或生病。",
    columns: [
      {
        title: "判斷",
        items: [
          "先顧自己的安全，車多時別勉強。",
          "徵兆：外傷或出血、撞擊、羽毛蓬鬆沒活力、摸起來比手冷、呼吸急促。",
          "嘴和爪子可能傷人，沒把握就直接打電話。",
        ],
      },
      {
        title: "安置",
        items: [
          "戴手套，用毛巾連頭輕輕蓋住再抱起。",
          "放進打洞紙箱，底部鋪揉皺報紙，放在陰暗安靜處。",
          "寶特瓶裝溫水包布保暖，與鳥保持距離。",
          "不要一直打開箱子看。",
        ],
      },
      {
        title: "不要做",
        items: [
          "不要急著餵食，可能有內出血。",
          "不要灌水，水可能嗆進肺裡；箱子裡也不要放食物和水。",
          "不要用塑膠盒或塑膠袋裝。",
          "不要自己養：有些野鳥是保育類，依《野生動物保育法》不得飼養。",
        ],
      },
    ],
    footer: "盡快送醫；處理完用肥皂洗手。",
    sources: ["S1", "S7", "S8", "S9", "S10", "S11", "S23", "S25", "S14", "S15", "S16"],
  },
};

// 三張卡片的順序
const SITUATION_ORDER = ["chick", "fledgling", "injured"];


// ----- 第二層：類群注意事項（黃色框，每隻鳥最多一個）-----
// match(bird) 回傳 true 代表這隻鳥屬於這個類群
// title(bird) 是黃色框標題；items 每一條可以有 bold（粗體開頭）和 onlyIf（只對特定的鳥顯示）
const GROUP_NOTES = {
  raptor: {
    label: "猛禽",
    match: (bird) => ["鷹形目", "隼形目", "鴞形目"].includes(bird.order),
    title: (bird) => `${bird.name}屬於猛禽，請特別注意`,
    items: [
      { text: "常見的猛禽如鳳頭蒼鷹、黑鳶、領角鴞都是保育類，不能自己飼養。" },
      { bold: "不要自己抓。", text: "猛禽的爪子有力，處理需要專業；請拍照、記下地點，直接通報。" },
      {
        text: "貓頭鷹幼鳥落巢很常見，牠們會自己慢慢跳回樹枝。請在附近觀察，別讓貓狗、車輛靠近，不要撿走。",
        onlyIf: (bird) => bird.order === "鴞形目",
      },
    ],
    sources: ["S17", "S18", "S19", "S6", "S20", "S14"],
  },

  heron: {
    label: "鷺鷥類",
    match: (bird) => bird.family === "鷺科",
    title: (bird) => `${bird.name}屬於鷺鷥類，請特別注意`,
    items: [
      { bold: "不要自己抓。", text: "鷺鷥類的嘴又長又尖，受驚時會朝人的臉和眼睛啄；請拍照、記下地點，直接通報。" },
      {
        text: "黑冠麻鷺不怕人，常在公園、校園草地上走動找蚯蚓，還會伸長脖子靜止不動來偽裝。這些都是正常行為，不代表受傷。",
        onlyIf: isNightHeron,
      },
    ],
    // 只在黑冠麻鷺的「受傷或生病」區塊多加一句
    adultNote: {
      text: "但黑冠麻鷺本來就常在草地上走動、靜止不動，請先看上方黃色框。",
      onlyIf: isNightHeron,
    },
    sources: ["S23", "S22", "S21", "S26", "S27", "S28"],
  },

  precocial: {
    label: "早熟型水鳥",
    // iNaturalist 的中文科名是「鴨科」；「雁鴨科」一起列，以防擴容後出現
    match: (bird) => ["秧雞科", "長腳鷸科", "鴴科", "鷸科", "鴨科", "雁鴨科"].includes(bird.family),
    title: () => "毛茸茸、會跟著親鳥走的水鳥寶寶（紅冠水雞、高蹺鴴等）",
    items: [
      { text: "這類寶寶一出生就有絨毛、會走，跟著親鳥找食物，本來就不待在巢裡。下方的分辨提示和「放回巢中」都不適用。" },
      { bold: "不要撿走。", text: "牠們要跟著親鳥才知道吃什麼。請保持距離、不要驚擾，親鳥通常就在附近。" },
      { text: "如果已經撿起來了，就放回原地附近的地面或水邊，然後立刻離開。" },
      { text: "牠們很脆弱，不要摸、不要逗弄。確定附近沒有親鳥，或牠受傷了，就放進紙箱保持溫暖安靜，再聯絡救傷單位。" },
    ],
    sources: ["S1", "S29", "S30", "S9", "S12", "S31", "S32", "S33"],
  },

  pigeon: {
    label: "鴿子",
    // 學名開頭是 Columba livia（含家鴿亞種 Columba livia domestica）
    match: (bird) => (bird.sci || "").startsWith("Columba livia"),
    title: (bird) => `${bird.name}屬於鴿子，請特別注意`,
    items: [
      { text: "家鴿不是野鳥，野鳥學會不受理，請洽各地動保單位。" },
    ],
    sources: ["S1"],
  },
};

function isNightHeron(bird) {
  return bird.sci === "Gorsachius melanolophus";
}

// 找出這隻鳥屬於哪個類群；依序比對，回傳第一個符合的，所以最多一個黃色框
function findGroup(bird) {
  return Object.values(GROUP_NOTES).find((group) => group.match(bird)) || null;
}


// ----- 資料來源（編號對應交接檔的來源清單）-----
const SOURCES = {
  S1:  ["台北市野鳥學會《伸出援手前，先瞭解牠》（2013）", "https://conservation.forest.gov.tw/File.aspx?fno=65476"],
  S2:  ["公視新聞〈春末初夏幼鳥成長 掉落地面先觀察〉（2018）", "https://news.pts.org.tw/article/390428"],
  S6:  ["台灣猛禽研究會：救傷流程", "https://raptor.org.tw/rescue/procedure"],
  S7:  ["泛科學〈在路上遇到受傷野鳥該怎麼辦？〉（2019）", "https://www.cw.com.tw/article/5096160"],
  S8:  ["NOWnews：撿到小鳥怎麼辦（野生動物急救站，2017）", "https://www.nownews.com/news/20170714/2588861"],
  S9:  ["聯合報：發現落單幼雛鳥別急著帶走（花蓮縣府）", "https://udn.com/news/story/7470/8764380"],
  S10: ["野生動物保育法", "https://laws.gov.taipei/law/LawSearch/LawArticleContent/FL014500"],
  S11: ["法律百科：網路買賣寵物，是否違法？野生動物篇", "https://www.legis-pedia.com/article/environment-hygiene/670"],
  S12: ["新頭殼：新北市動保處談落巢幼雛鳥（2022）", "https://newtalk.tw/news/view/2022-05-28/762123"],
  S17: ["中央社：台中潭子新田步道猛禽出沒（2024）", "https://www.cna.com.tw/news/aloc/202405200311.aspx"],
  S18: ["新頭殼：新北瑞芳領角鴞誤闖民宅（2025）", "https://newtalk.tw/news/view/2025-09-01/991016"],
  S19: ["工商時報：二級保育鳳頭蒼鷹現蹤台東關山（2026）", "https://www.ctee.com.tw/news/20260117700460-431401"],
  S20: ["農業部：領角鴞落巢幼鳥", "https://www.moa.gov.tw/ws.php?id=2501743"],
  S21: ["新頭殼：新北動保處談黑冠麻鷺（2022）", "https://newtalk.tw/news/view/2022-03-08/720160"],
  S22: ["公視：高雄黑冠麻鷺救傷", "https://news.pts.org.tw/article/775226"],
  S23: ["野生動物救傷：停、看、聽（改寫自野生動物急救站）", "https://roadkill.tw/article/30584"],
  S24: ["中華民國野鳥學會：全國野鳥救傷諮詢＆政府單位通訊錄", "https://www.bird.org.tw/basicpage/117"],
  S25: ["野灣野生動物保育協會：救援流程", "https://www.wildonetaiwan.org/rescue"],
  S29: ["國立自然科學博物館：探索新世界的紅冠水雞", "https://www.nmns.edu.tw/ch/learn/museum-education/naturalist/scienceimages/detail/SciencePhotography-07060"],
  S30: ["自由時報：高雄永安濕地高蹺鴴育雛", "https://news.ltn.com.tw/news/life/breakingnews/5508300"],
  S3:  ["Audubon: What to Do With a Baby Bird", "https://www.audubon.org/news/what-do-baby-bird"],
  S4:  ["RSPB: Who should I call if I am concerned about a bird?", "https://www.rspb.org.uk/birds-and-wildlife/if-you-find-an-injured-bird"],
  S13: ["Cornell Lab: I found a baby bird. What do I do?", "https://www.allaboutbirds.org/news/i-found-a-baby-bird-what-do-i-do/"],
  S14: ["Tufts Wildlife Clinic: Sick or Injured Birds of Prey", "https://vet.tufts.edu/what-do-if-you-found-sick-or-injured-birds-prey"],
  S15: ["The Raptor Trust: Found an injured or orphaned wild bird", "https://www.theraptortrust.org/faqs/what-to-do-if-you-have-found-a-bird"],
  S16: ["Carolina Raptor Center: I found an injured animal", "https://carolinaraptorcenter.org/injured-animal/"],
  S26: ["Maine IFW: How to help an injured heron safely", "https://www.maine.gov/ifw/blogs/maine-heron-observation-network/how-help-injured-heron-safely"],
  S27: ["KARE 11：明尼蘇達野生動物復健中心談鷺鷥救援", "https://kare11.com/article/news/local/breaking-the-news/rescue-efforts-end-very-differently-for-loon-heron-injured-fishing-line-hooks/89-2d8668ce-11ee-4f43-bdea-920ddc2edd4d"],
  S28: ["Denver Gazette：博爾德警局救援大藍鷺", "https://denvergazette.com/outtherecolorado/news/watch-your-eyes-crews-rescue-injured-irritated-bird-of-prey/article_b8be953a-24bd-11ee-ab36-2728fc4a5fcc.html"],
  S31: ["Celebrate Urban Birds (Cornell Lab): baby Killdeer, duckling or gosling", "https://celebrateurbanbirds.org/?p=4515"],
  S32: ["Toronto Wildlife Centre: Shore bird", "https://www.torontowildlifecentre.com/wildlife-emergency-rescue-hotline/how-to-help-orphaned-baby-wild-animals/how-to-help-baby-birds/shore-bird/"],
  S33: ["Le Nichoir: Ducklings FAQ", "https://lenichoir.org/?p=11057"],
};


// ============================================================
// 小工具
// ============================================================
const $ = (id) => document.getElementById(id);

// 建立一個元素並填文字（用 textContent，資料不會被當成 HTML）
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// 把一串文字變成 <ul>
function listOf(items) {
  const ul = el("ul");
  items.forEach((item) => ul.append(el("li", "", item)));
  return ul;
}

// 展開鈕：按一下切換 aria-expanded、按鈕文字、目標區塊的 hidden
function setupToggle(button, target, openLabel, closedLabel, labelNode) {
  const labelEl = labelNode || button;
  function set(open) {
    button.setAttribute("aria-expanded", String(open));
    labelEl.textContent = open ? openLabel : closedLabel;
    target.hidden = !open;
  }
  button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true"));
  set(false);
  return set;   // 回傳 set，需要時可以從外面收起
}


// ============================================================
// 「先看牠是哪一種」：三張卡片＋特徵對照表＋做法
// 首頁和詳細視窗各建一份，內容都讀同一個 SITUATIONS
// ============================================================
function createPicker(root, { prefix, headingTag }) {
  // ----- 標題列與「看詳細特徵」按鈕 -----
  const head = el("div", "pick-head");
  const titleBox = el("div");
  const title = el(headingTag, "pick-title", "先看牠是哪一種");
  title.id = `${prefix}-pick-title`;
  titleBox.append(title, el("p", "pick-sub", "點選卡片看做法"));

  const idBtn = el("button", "id-toggle");
  idBtn.type = "button";
  idBtn.setAttribute("aria-controls", `${prefix}-id-table`);
  idBtn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>';
  const idLabel = el("span");
  idBtn.append(idLabel);
  head.append(titleBox, idBtn);

  // ----- 三張卡片（切換鈕）-----
  const cards = el("div", "pick-cards");
  SITUATION_ORDER.forEach((key) => {
    const s = SITUATIONS[key];
    const btn = el("button", "pick-card");
    btn.type = "button";
    btn.dataset.pick = key;
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-controls", `${prefix}-advice`);
    btn.append(el("span", "pick-card-name", s.name), el("span", "pick-card-short", s.short));
    cards.append(btn);
  });

  const hint = el("p", "pick-hint", SITUATIONS.hint.unsure);

  // ----- 詳細特徵對照表 -----
  const tableWrap = el("div", "id-table-wrap");
  tableWrap.id = `${prefix}-id-table`;
  const { columns, rows } = SITUATIONS.hint.table;
  const table = el("table", "id-table");
  const headRow = el("tr");
  ["特徵", ...columns].forEach((c) => {
    const th = el("th", "", c);
    th.setAttribute("scope", "col");
    headRow.append(th);
  });
  const thead = el("thead");
  thead.append(headRow);
  const tbody = el("tbody");
  rows.forEach(([label, ...cells]) => {
    const tr = el("tr");
    const th = el("th", "", label);
    th.setAttribute("scope", "row");
    tr.append(th);
    cells.forEach((c) => tr.append(el("td", "", c)));
    tbody.append(tr);
  });
  table.append(thead, tbody);
  tableWrap.append(table);

  // ----- 做法區 -----
  const advice = el("div", "advice");
  advice.id = `${prefix}-advice`;

  root.classList.add("picker");
  root.setAttribute("aria-labelledby", title.id);
  root.append(head, cards, hint, tableWrap, advice);

  // ----- 狀態與畫面 -----
  let pick = null;   // null / "chick" / "fledgling" / "injured"
  let bird = null;   // 詳細視窗裡的那隻鳥（首頁沒有）
  let group = null;

  function renderAdvice() {
    cards.querySelectorAll(".pick-card").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.pick === pick));
    });
    advice.replaceChildren();
    if (!pick) {
      advice.hidden = true;     // 沒選時不顯示、不預留空間
      return;
    }
    const s = SITUATIONS[pick];
    advice.append(el("p", "advice-lead", s.lead));

    if (pick === "injured") {
      let note = s.note;
      const extra = group && group.adultNote;
      if (bird && extra && extra.onlyIf(bird)) note += extra.text;
      advice.append(el("p", "advice-note", note));

      const cols = el("div", "advice-cols");
      s.columns.forEach((col) => {
        const box = el("div");
        box.append(el("p", "advice-col-title", col.title), listOf(col.items));
        cols.append(box);
      });
      advice.append(cols, el("p", "advice-footer", s.footer));
    } else {
      advice.append(listOf(s.items));
    }
    advice.hidden = false;
  }

  // 再點同一張就收起；點別張就換過去（一次只開一段）
  cards.addEventListener("click", (event) => {
    const btn = event.target.closest(".pick-card");
    if (!btn) return;
    pick = pick === btn.dataset.pick ? null : btn.dataset.pick;
    renderAdvice();
  });

  const setTable = setupToggle(idBtn, tableWrap, "收起詳細特徵", "怎麼分辨？看詳細特徵", idLabel);
  renderAdvice();

  // 詳細視窗每次換一隻鳥時呼叫：重設狀態
  return {
    reset(newBird, newGroup) {
      bird = newBird || null;
      group = newGroup || null;
      pick = null;
      setTable(false);
      renderAdvice();
    },
  };
}


// ============================================================
// 首頁
// ============================================================
createPicker($("home-picker"), { prefix: "home", headingTag: "h2" });
setupToggle($("hero-phones-toggle"), $("hero-phones"), "收起", "其他電話");


// ============================================================
// 詳細視窗
// ============================================================
const detail = $("detail");
const detailPicker = createPicker($("detail-picker"), { prefix: "detail", headingTag: "p" });
const setGeneral = setupToggle(
  $("general-toggle"), $("detail-picker"),
  "收起一般做法", "看一般做法（雛鳥、幼鳥、受傷或生病）",
  $("general-toggle-label")
);
const setPhones = setupToggle($("phones-toggle"), $("phones"), "收起", "其他電話");
const setSources = setupToggle($("sources-toggle"), $("sources"), "收起資料來源", "查看資料來源");

// 類群標籤與黃色框
function renderGroup(bird, group) {
  const tag = $("group-tag");
  const box = $("group-box");
  if (!group) {
    tag.hidden = true;
    box.hidden = true;
    return;
  }
  tag.textContent = group.label;
  tag.hidden = false;

  $("group-box-title").textContent = group.title(bird);
  const ul = $("group-box-list");
  ul.replaceChildren();
  group.items
    .filter((item) => !item.onlyIf || item.onlyIf(bird))
    .forEach((item) => {
      const li = el("li");
      if (item.bold) li.append(el("strong", "", item.bold));
      li.append(item.text);
      ul.append(li);
    });
  box.hidden = false;
}

// 資料來源：第一層＋聯絡列＋這隻鳥的類群用到的，去掉重複
function renderSources(group) {
  const ids = [
    ...SITUATIONS.hint.sources,
    ...SITUATION_ORDER.flatMap((k) => SITUATIONS[k].sources),
    "S19", "S24", "S25",
    ...(group ? group.sources : []),
  ];
  const unique = new Set(ids);
  const ordered = Object.keys(SOURCES).filter((id) => unique.has(id));   // 台灣在前、國外在後

  const ul = $("sources");
  ul.replaceChildren();
  ordered.forEach((id) => {
    const [name, url] = SOURCES[id];
    const a = el("a", "", name);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    const li = el("li");
    li.append(a);
    ul.append(li);
  });
}

function openDetail(bird) {
  // 照片換成大尺寸
  $("detail-photo").src = bird.photo.replace("medium", "large");
  $("detail-photo").alt = bird.name;
  // 用 textContent 填文字，瀏覽器不會把它當 HTML，所以不用 escape
  $("detail-name").textContent   = bird.name;
  $("detail-sci").textContent    = bird.sci;
  $("detail-taxon").textContent  = [bird.order, bird.family].filter(Boolean).join(" › ") || "—";
  $("detail-date").textContent   = bird.date;
  $("detail-place").textContent  = bird.place || "—";
  $("detail-credit").textContent = `${bird.credit}（${bird.license}）`;
  $("detail-link").href          = bird.url;

  // 救傷區塊：依這隻鳥的類群重畫，展開的東西都收起來
  const group = findGroup(bird);
  renderGroup(bird, group);
  renderSources(group);
  detailPicker.reset(bird, group);
  setGeneral(!group);   // 有黃色框就先收起一般做法；沒有就直接展開
  setPhones(false);
  setSources(false);

  detail.showModal();   // 打開視窗，背景會變暗
  detail.scrollTop = 0; // 每次從最上面開始看
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
$("close").addEventListener("click", () => detail.close());
detail.addEventListener("click", (event) => {
  if (event.target === detail) detail.close();
});


// ============================================================
// 照片卡片列表
// ============================================================

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

// 資料概況：幾筆、幾種鳥、日期範圍
const species = new Set(BIRDS.map((b) => b.name)).size;
const dates = BIRDS.map((b) => b.date).sort();
summaryText.textContent =
  `${BIRDS.length} 筆觀察紀錄 · ${species} 種鳥 · ${dates[0]} 至 ${dates[dates.length - 1]}`;

// 一打開網頁就先畫一次
render();
