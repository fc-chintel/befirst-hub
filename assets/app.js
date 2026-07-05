/* ===== BE:FIRST HUB メインスクリプト ===== */

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const NEWS_PAGE_SIZE = 6;

// 前回開いた日時(NEW印の判定に使う)
const lastVisit = Number(localStorage.getItem("bfhub-last-visit") || 0);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

function daysUntil(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

function chipClass(cat) {
  const c = (cat || "").toUpperCase();
  if (c.includes("LIVE")) return "c-live";
  if (c.includes("TV") || c.includes("CM") || c.includes("MEDIA")) return "c-tv";
  if (c.includes("RADIO")) return "c-radio";
  if (c.includes("GOODS")) return "c-goods";
  if (c.includes("MUSIC") || c.includes("DVD")) return "c-music";
  return "";
}

async function loadJSON(path) {
  try {
    const res = await fetch(path + "?t=" + Date.now());
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn("読み込み失敗:", path, e);
    return null;
  }
}

/* ---- ニュース ---- */
function renderNews(data) {
  const box = document.getElementById("newsList");
  const moreBtn = document.getElementById("newsMore");
  if (!data || !data.items || data.items.length === 0) {
    box.innerHTML = '<p class="loading">ニュースを読み込めませんでした。<br>「データ更新」を実行するか、公式サイトをご覧ください。</p>';
    return;
  }
  let shown = NEWS_PAGE_SIZE;

  const draw = () => {
    box.innerHTML = data.items.slice(0, shown).map((n) => {
      const isNew = lastVisit && new Date(n.date).getTime() > lastVisit;
      const cat = n.categories && n.categories[0] ? n.categories[0] : "";
      return `<a class="news-item" href="${esc(n.link)}" target="_blank" rel="noopener">
        <div class="news-meta">
          <span>${fmtDate(n.date)}</span>
          ${cat ? `<span class="chip ${chipClass(cat)}">${esc(cat)}</span>` : ""}
          ${isNew ? '<span class="badge-new">NEW</span>' : ""}
        </div>
        <div class="news-title">${esc(n.title)}</div>
      </a>`;
    }).join("");
    moreBtn.hidden = shown >= data.items.length;
  };

  moreBtn.onclick = () => { shown += NEWS_PAGE_SIZE; draw(); };
  draw();
}

/* ---- 動画 ---- */
function renderVideos(data) {
  const box = document.getElementById("videoList");
  if (!data || !data.items || data.items.length === 0) {
    box.innerHTML = '<p class="loading">動画を読み込めませんでした。</p>';
    return;
  }
  box.innerHTML = data.items.slice(0, 8).map((v) => `
    <a class="video-item" href="${esc(v.link)}" target="_blank" rel="noopener">
      <div class="video-thumb-wrap">
        <img class="video-thumb" src="${esc(v.thumbnail)}" alt="" loading="lazy">
        ${v.isShort ? '<span class="video-tag">SHORT</span>' : ""}
      </div>
      <div class="video-title">${esc(v.title)}</div>
      <div class="video-date">${fmtDate(v.date)}</div>
    </a>`).join("");
}

/* ---- カウントダウン & 予定 ---- */
function renderEvents(data) {
  const list = document.getElementById("eventList");
  if (!data || !data.events) return;

  const upcoming = data.events
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  // ヒーロー: 日付が確定している直近イベント
  const next = upcoming.find((e) => !e.approx);
  if (next) {
    const days = daysUntil(next.date);
    document.getElementById("heroCount").innerHTML =
      days === 0 ? "本日!" : `あと ${days}<small>日</small>`;
    document.getElementById("heroTitle").textContent = next.title;
    const d = new Date(next.date + "T00:00:00");
    document.getElementById("heroDate").textContent =
      `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
    document.getElementById("hero").hidden = false;
  }

  list.innerHTML = upcoming.map((e) => {
    const d = new Date(e.date + "T00:00:00");
    const days = daysUntil(e.date);
    return `<div class="event-item">
      <div class="event-date">
        <span class="d-month">${d.getMonth() + 1}月</span>
        <span class="d-day">${e.approx ? "?" : d.getDate()}</span>
        <span class="d-year">${d.getFullYear()}</span>
      </div>
      <div class="event-title">${esc(e.title)}${e.approx ? " <small>(日付未定)</small>" : ""}</div>
      <div class="event-days">${e.approx ? "" : days === 0 ? "本日" : `あと${days}日`}</div>
    </div>`;
  }).join("");
}

/* ---- 起動 ---- */
(async function init() {
  const [news, videos, events] = await Promise.all([
    loadJSON("data/news.json"),
    loadJSON("data/videos.json"),
    loadJSON("data/events.json"),
  ]);

  renderNews(news);
  renderVideos(videos);
  renderEvents(events);

  // データ更新日時の表示
  const t = news && news.updatedAt ? new Date(news.updatedAt) : null;
  if (t && !isNaN(t)) {
    document.getElementById("updatedAt").textContent =
      `更新 ${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  }

  // 今回の訪問時刻を記録(次回のNEW印判定用)
  localStorage.setItem("bfhub-last-visit", String(Date.now()));

  // ホーム画面アプリとして動かすためのサービスワーカー登録
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
