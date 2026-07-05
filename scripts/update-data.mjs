/* =====================================================
   データ更新スクリプト
   公式サイトとYouTubeのRSSフィードを読み取り、
   data/news.json と data/videos.json を書き出します。
   実行方法:  node scripts/update-data.mjs
   ===================================================== */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = path.join(ROOT, "data");

const NEWS_FEED = "https://befirst.tokyo/feed/";
const YT_FEED =
  "https://www.youtube.com/feeds/videos.xml?channel_id=UCi_AquB9uaI3-9xXkuWG7IQ";

const MAX_NEWS = 60;
const MAX_VIDEOS = 30;

/* ---------- 小道具 ---------- */

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripCdata(s) {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : s;
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(stripCdata(m[1]).trim()) : "";
}

function tags(block, name) {
  const out = [];
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "g");
  let m;
  while ((m = re.exec(block))) out.push(decodeEntities(stripCdata(m[1]).trim()));
  return out;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (personal fan hub; contact via site)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function loadExisting(file) {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
  } catch {
    return null;
  }
}

function mergeByKey(fresh, existing, key, max) {
  const seen = new Set(fresh.map((x) => x[key]));
  const kept = (existing?.items || []).filter((x) => !seen.has(x[key]));
  return [...fresh, ...kept]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, max);
}

/* ---------- 公式ニュース ---------- */

async function updateNews() {
  const xml = await fetchText(NEWS_FEED);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const b = m[1];
    const content = b.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
    const img = content
      ? (stripCdata(content[1]).match(/src="([^"]+)"/) || [])[1] || ""
      : "";
    return {
      title: tag(b, "title"),
      link: tag(b, "link"),
      date: new Date(tag(b, "pubDate")).toISOString(),
      categories: tags(b, "category"),
      image: img,
    };
  });
  if (items.length === 0) throw new Error("ニュースが1件も取得できませんでした");

  const existing = await loadExisting("news.json");
  const merged = mergeByKey(items, existing, "link", MAX_NEWS);
  await writeFile(
    path.join(DATA_DIR, "news.json"),
    JSON.stringify({ updatedAt: new Date().toISOString(), items: merged }, null, 2)
  );
  console.log(`ニュース: 新規取得 ${items.length}件 / 保存合計 ${merged.length}件`);
}

/* ---------- YouTube ---------- */

async function updateVideos() {
  const xml = await fetchText(YT_FEED);
  const items = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const b = m[1];
    const id = tag(b, "yt:videoId");
    const link = (b.match(/<link rel="alternate" href="([^"]+)"/) || [])[1] || "";
    return {
      id,
      title: tag(b, "media:title") || tag(b, "title"),
      link,
      date: tag(b, "published"),
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      isShort: link.includes("/shorts/"),
    };
  });
  if (items.length === 0) throw new Error("動画が1件も取得できませんでした");

  const existing = await loadExisting("videos.json");
  const merged = mergeByKey(items, existing, "id", MAX_VIDEOS);
  await writeFile(
    path.join(DATA_DIR, "videos.json"),
    JSON.stringify({ updatedAt: new Date().toISOString(), items: merged }, null, 2)
  );
  console.log(`動画: 新規取得 ${items.length}件 / 保存合計 ${merged.length}件`);
}

/* ---------- 実行 ---------- */

await mkdir(DATA_DIR, { recursive: true });

const results = await Promise.allSettled([updateNews(), updateVideos()]);
let failed = 0;
for (const r of results) {
  if (r.status === "rejected") {
    failed++;
    console.error("更新失敗:", r.reason?.message || r.reason);
  }
}
// 片方だけ失敗した場合は古いデータが残るので致命的ではない
if (failed === results.length) process.exit(1);
console.log("データ更新が完了しました。");
