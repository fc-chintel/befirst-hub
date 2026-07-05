/* ===== メンバーページ表示スクリプト ===== */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtBirthday(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// 誕生日まであと何日か(今年 or 来年の誕生日)
function daysToBirthday(iso) {
  if (!iso) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const [, m, d] = iso.split("-").map(Number);
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < now) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.round((next - now) / 86400000);
}

function snsButtons(m) {
  const btns = [];
  if (m.sns?.instagram)
    btns.push(`<a class="sns-btn" href="${esc(m.sns.instagram.url)}" target="_blank" rel="noopener">📷 Instagram</a>`);
  if (m.sns?.x)
    btns.push(`<a class="sns-btn" href="${esc(m.sns.x.url)}" target="_blank" rel="noopener">✖️ X</a>`);
  if (m.sns?.tiktok)
    btns.push(`<a class="sns-btn" href="${esc(m.sns.tiktok.url)}" target="_blank" rel="noopener">🎵 TikTok</a>`);
  for (const o of m.sns?.other || [])
    btns.push(`<a class="sns-btn" href="${esc(o.url)}" target="_blank" rel="noopener">🔗 ${esc(o.label)}</a>`);
  return btns.join("");
}

function renderGroup(g) {
  const box = document.getElementById("groupInfo");
  if (!g) { box.innerHTML = '<p class="loading">データ準備中です。</p>'; return; }
  box.innerHTML = `
    <div class="about-card">
      <p class="about-text">${esc(g.history)}</p>
      <div class="stat-grid">
        <div class="stat"><span class="stat-label">DEBUT</span><span class="stat-val">${esc(g.debut)}</span></div>
        <div class="stat"><span class="stat-label">DEBUT SONG</span><span class="stat-val">${esc(g.debutSong)}</span></div>
        <div class="stat"><span class="stat-label">AGENCY</span><span class="stat-val">${esc(g.agency)}</span></div>
        <div class="stat"><span class="stat-label">FAN NAME</span><span class="stat-val">${esc(g.fanName)}</span></div>
      </div>
      ${g.highlights?.length ? `<ul class="highlight-list">${g.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
    </div>`;
}

function renderMembers(members) {
  const box = document.getElementById("memberList");
  if (!members?.length) { box.innerHTML = '<p class="loading">データ準備中です。</p>'; return; }

  box.innerHTML = members.map((m) => {
    const bd = daysToBirthday(m.birthday);
    const initials = esc(m.name.slice(0, 2));
    // 写真があれば表示、読み込めない場合はイニシャルにフォールバック
    const avatar = m.photo
      ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy" onerror="this.parentElement.textContent='${initials}'">`
      : initials;
    return `
    <article class="member-card" style="--mc:${esc(m.color || "#e3b666")}">
      <div class="member-head">
        <div class="member-avatar">${avatar}</div>
        <div>
          <h3 class="member-name">${esc(m.name)}</h3>
          <p class="member-kana">${esc(m.kana || "")}${m.realName ? ` / ${esc(m.realName)}` : ""}</p>
        </div>
      </div>
      <p class="member-intro">${esc(m.intro || "")}</p>
      <div class="member-meta">
        ${m.birthday ? `<div class="meta-row"><span>🎂 誕生日</span><b>${fmtBirthday(m.birthday)}${bd !== null ? `<small>(あと${bd}日)</small>` : ""}</b></div>` : ""}
        ${m.hometown ? `<div class="meta-row"><span>📍 出身</span><b>${esc(m.hometown)}</b></div>` : ""}
        ${m.height ? `<div class="meta-row"><span>📏 身長</span><b>${esc(m.height)}</b></div>` : ""}
        ${m.role ? `<div class="meta-row"><span>🎤 スタイル</span><b>${esc(m.role)}</b></div>` : ""}
      </div>
      ${snsButtons(m) ? `<div class="sns-row">${snsButtons(m)}</div>` : ""}
      ${m.trivia?.length ? `
      <details class="trivia">
        <summary>知る人ぞ知る話 <span class="trivia-count">${m.trivia.length}</span></summary>
        <ul>${m.trivia.map((t) => `<li>${esc(t.text)}${t.source ? `<small class="trivia-src"> — ${esc(t.source)}</small>` : ""}</li>`).join("")}</ul>
      </details>` : ""}
    </article>`;
  }).join("");
}

(async function init() {
  try {
    const res = await fetch("data/members.json?t=" + Date.now());
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    renderGroup(data.group);
    renderMembers(data.members);
  } catch (e) {
    document.getElementById("groupInfo").innerHTML =
      '<p class="loading">メンバーデータを読み込めませんでした。</p>';
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
