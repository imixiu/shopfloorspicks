// ShopFloorSpicks homepage — warm editorial magazine layout
export const dynamic = "force-dynamic";

import {
  getLatestArticles,
  getArticleCountsByType,
  getAllAuthors,
  getTotalArticleCount,
} from "../lib/db";
import { TYPE_MAP } from "../lib/type-seo";

export async function GET() {
  try {
    const [articles, typeCounts, authors, total] = await Promise.all([
      getLatestArticles(12),
      getArticleCountsByType(),
      getAllAuthors(),
      getTotalArticleCount(),
    ]);

    const countMap: Record<string, number> = {};
    typeCounts.forEach((r: any) => { countMap[r.type] = r.cnt; });

    const html = buildHomepage(articles, countMap, authors, total);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response(fallbackHtml(), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHomepage(articles: any[], countMap: Record<string, number>, authors: any[], total: number) {
  const types = Object.entries(TYPE_MAP);
  const activeTypes = types.filter(([k]) => (countMap[k] || 0) > 0).length;

  // Featured article (first one, big card)
  const featured = articles[0];
  const featuredInfo = featured ? TYPE_MAP[featured.type] || TYPE_MAP.more : null;
  const featuredHtml = featured ? `
    <div class="featured-card">
      <a href="/${featured.type}/${featured.short_title}" class="featured-img-wrap">
        ${featured.img
          ? `<img src="${esc(featured.img)}" alt="${esc(featured.title)}">`
          : `<div class="featured-placeholder" style="background:linear-gradient(135deg,var(--terracotta-light),var(--cream-deep))"><i class="fas ${featuredInfo?.icon || "fa-file"}" style="font-size:3rem;color:var(--terracotta);opacity:0.3"></i></div>`}
      </a>
      <div class="featured-body">
        <span class="featured-tag" style="background:${featuredInfo?.color || "#c0392b"}">${esc(featuredInfo?.label || "Article")}</span>
        <h2><a href="/${featured.type}/${featured.short_title}">${esc(featured.title)}</a></h2>
        <p>${esc(featured.description)}</p>
        <div class="featured-meta">
          <span>${esc(featured.author)}</span>
          <span>·</span>
          <time>${featured.modified_time ? new Date(featured.modified_time).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</time>
        </div>
      </div>
    </div>` : "";

  // Sidebar articles (2nd-5th)
  const sidebarArticles = articles.slice(1, 5);
  const sidebarHtml = sidebarArticles.map((a: any) => {
    const info = TYPE_MAP[a.type] || TYPE_MAP.more;
    return `
    <a href="/${a.type}/${a.short_title}" class="sidebar-card">
      ${a.img ? `<img src="${esc(a.img)}" alt="${esc(a.title)}" class="sidebar-thumb" loading="lazy">` : ""}
      <div class="sidebar-text">
        <span class="sidebar-tag" style="color:${info.color}">${esc(info.label)}</span>
        <h4>${esc(a.title)}</h4>
      </div>
    </a>`;
  }).join("\n");

  // Category pills
  const catPills = types.map(([key, info]) => {
    const cnt = countMap[key] || 0;
    return `<a href="/${key}" class="cat-pill" style="--c:${info.color}">
      <i class="fas ${info.icon}"></i>
      <span>${esc(info.label)}</span>
      <em>${fmtNum(cnt)}</em>
    </a>`;
  }).join("\n");

  // Article grid (6th onwards)
  const gridArticles = articles.slice(5);
  const gridHtml = gridArticles.map((a: any) => {
    const info = TYPE_MAP[a.type] || TYPE_MAP.more;
    const date = a.modified_time ? new Date(a.modified_time).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    const imgHtml = a.img
      ? `<img src="${esc(a.img)}" alt="${esc(a.title)}" loading="lazy">`
      : `<div class="card-ph" style="background:linear-gradient(135deg,${info.color}15,${info.color}08)"><i class="fas ${info.icon}" style="color:${info.color}30"></i></div>`;
    return `
    <a href="/${a.type}/${a.short_title}" class="grid-card">
      ${imgHtml}
      <div class="grid-card-body">
        <span class="grid-tag" style="background:${info.color}">${esc(info.label)}</span>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.description)}</p>
        <div class="grid-meta"><span>${esc(a.author)}</span><span>·</span><time>${date}</time></div>
      </div>
    </a>`;
  }).join("\n");

  const authorRow = authors.slice(0, 8).map((au: any) => {
    const imgHtml = au.img
      ? `<img src="${esc(au.img)}" alt="${esc(au.name)}">`
      : `<div class="au-ph">${esc(au.name).charAt(0)}</div>`;
    return `<a href="/author/${au.slug}" class="au-chip">${imgHtml}<span>${esc(au.name)}</span></a>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ShopFloorSpicks — Curated Equipment Picks & Professional Reviews</title>
<meta name="description" content="Hand-picked reviews, buyer guides, and technical specs for commercial-grade equipment across 11 industry verticals. Your shop floor, our picks.">
<meta property="og:title" content="ShopFloorSpicks — Curated Equipment Picks & Professional Reviews">
<meta property="og:description" content="Hand-picked reviews, buyer guides, and technical specs for commercial-grade equipment across 11 industry verticals. Your shop floor, our picks.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://shopfloorspicks.com/">
<link rel="canonical" href="https://shopfloorspicks.com/">
<link rel="icon" href="/icon.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-95PY8PSZ0Y"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-95PY8PSZ0Y');</script>
<style>
:root {
  --cream: #faf8f5; --cream-deep: #f0ebe3; --card: #ffffff;
  --terracotta: #c0392b; --terracotta-light: #e8d5c4; --terracotta-soft: #f5e6d8;
  --sage: #5d7a4a; --sage-light: #d4e4c7;
  --charcoal: #2d2d2d; --charcoal-mid: #4a4a4a;
  --text: #3d3d3d; --text-mid: #6b6b6b; --text-dim: #999;
  --border: #e5e0d8; --border-warm: #d4c5b0; --mustard: #d4a574;
  --radius: 8px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Source Sans 3', -apple-system, sans-serif; background: var(--cream); color: var(--text); }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; height: auto; }

/* HEADER */
.site-header { background: var(--charcoal); position: sticky; top: 0; z-index: 100; border-bottom: 3px solid var(--terracotta); }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; max-width: 1100px; margin: 0 auto; }
.logo { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 1.3rem; color: #fff; display: flex; align-items: center; gap: 10px; }
.logo-mark { width: 30px; height: 30px; border-radius: 50%; background: var(--terracotta); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #fff; font-family: 'Playfair Display', serif; font-weight: 700; }
.main-nav { display: flex; gap: 2px; flex-wrap: wrap; }
.main-nav a { color: #bbb; font-weight: 600; padding: 6px 10px; border-radius: 4px; transition: all 0.2s; letter-spacing: 0.02em; text-transform: uppercase; font-size: 0.72rem; }
.main-nav a:hover { color: #fff; background: rgba(192,57,43,0.3); }
.nav-more { position: relative; }
.nav-more .dropdown { display: none; position: absolute; right: 0; top: 100%; background: var(--charcoal); border: 1px solid var(--charcoal-mid); border-radius: 6px; min-width: 180px; padding: 4px 0; box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
.nav-more:hover .dropdown { display: block; }
.nav-more .dropdown a { display: block; padding: 7px 14px; font-size: 0.75rem; }
.mobile-toggle { display: none; background: none; border: none; color: #fff; font-size: 1.3rem; cursor: pointer; }

/* HERO BANNER */
.hero-banner { background: linear-gradient(135deg, var(--charcoal) 0%, #3a3a3a 50%, var(--charcoal-mid) 100%); padding: 48px 20px; position: relative; overflow: hidden; }
.hero-banner::before { content: ''; position: absolute; top: -50%; right: -20%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(192,57,43,0.15) 0%, transparent 70%); border-radius: 50%; }
.hero-banner::after { content: ''; position: absolute; bottom: -30%; left: -10%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(93,122,74,0.1) 0%, transparent 70%); border-radius: 50%; }
.hero-inner { max-width: 1100px; margin: 0 auto; position: relative; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; align-items: center; }
.hero-text { }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 6px; background: rgba(192,57,43,0.2); border: 1px solid rgba(192,57,43,0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; color: var(--terracotta-light); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
.hero-text h1 { font-family: 'Playfair Display', serif; font-size: 2.4rem; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 14px; }
.hero-text h1 em { font-style: italic; color: var(--terracotta-light); }
.hero-text p { color: #aaa; font-size: 1rem; line-height: 1.7; max-width: 480px; }
.hero-badges { display: flex; gap: 16px; margin-top: 24px; flex-wrap: wrap; }
.hero-badge { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); padding: 8px 14px; border-radius: 6px; }
.hero-badge .num { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: var(--terracotta-light); }
.hero-badge .label { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
.hero-visual { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.hero-tile { border-radius: 8px; padding: 16px; text-align: center; transition: transform 0.3s; }
.hero-tile:hover { transform: scale(1.04); }
.hero-tile i { font-size: 1.4rem; margin-bottom: 6px; display: block; }
.hero-tile span { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.hero-tile:nth-child(1) { background: rgba(192,57,43,0.15); color: #e8a090; }
.hero-tile:nth-child(2) { background: rgba(93,122,74,0.15); color: #a4c490; }
.hero-tile:nth-child(3) { background: rgba(212,165,116,0.15); color: #d4a574; }
.hero-tile:nth-child(4) { background: rgba(142,68,173,0.15); color: #c49ddb; }

/* CATEGORY PILLS */
.cat-section { max-width: 1100px; margin: 0 auto; padding: 32px 20px 8px; }
.cat-section-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; color: var(--charcoal); margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
.cat-section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.cat-pills { display: flex; gap: 10px; flex-wrap: wrap; }
.cat-pill { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; font-size: 0.78rem; font-weight: 600; color: var(--text); transition: all 0.2s; }
.cat-pill:hover { border-color: var(--c); box-shadow: 0 2px 8px rgba(0,0,0,0.06); transform: translateY(-1px); }
.cat-pill i { color: var(--c); font-size: 0.85rem; }
.cat-pill em { font-style: normal; font-size: 0.68rem; color: var(--text-dim); font-weight: 500; }

/* FEATURED SECTION */
.featured-section { max-width: 1100px; margin: 0 auto; padding: 24px 20px; }
.section-heading { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; color: var(--charcoal); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.section-heading::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.featured-layout { display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 24px; }
.featured-card { background: var(--card); border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); transition: all 0.25s; }
.featured-card:hover { box-shadow: 0 6px 20px rgba(45,45,45,0.08); }
.featured-img-wrap img, .featured-placeholder { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: flex; align-items: center; justify-content: center; }
.featured-body { padding: 20px; }
.featured-tag { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 0.65rem; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
.featured-body h2 { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; line-height: 1.3; margin-bottom: 8px; }
.featured-body h2 a:hover { color: var(--terracotta); }
.featured-body p { font-size: 0.88rem; color: var(--text-mid); line-height: 1.6; margin-bottom: 10px; }
.featured-meta { font-size: 0.76rem; color: var(--text-dim); display: flex; gap: 6px; }
.sidebar-stack { display: flex; flex-direction: column; gap: 10px; }
.sidebar-card { display: flex; gap: 12px; padding: 10px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; transition: all 0.2s; align-items: center; }
.sidebar-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.sidebar-thumb { width: 80px; height: 60px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
.sidebar-text h4 { font-family: 'Playfair Display', serif; font-size: 0.82rem; font-weight: 600; line-height: 1.3; }
.sidebar-tag { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 3px; }

/* ARTICLE GRID */
.grid-section { max-width: 1100px; margin: 0 auto; padding: 24px 20px 40px; }
.grid-wrap { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }
.grid-card { background: var(--card); border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); transition: all 0.2s; }
.grid-card:hover { box-shadow: 0 4px 14px rgba(45,45,45,0.07); transform: translateY(-1px); }
.grid-card img, .card-ph { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
.grid-card-body { padding: 14px; }
.grid-tag { display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 0.62rem; font-weight: 700; color: #fff; text-transform: uppercase; margin-bottom: 6px; }
.grid-card-body h3 { font-family: 'Playfair Display', serif; font-size: 0.9rem; font-weight: 600; line-height: 1.35; margin-bottom: 5px; }
.grid-card-body h3:hover { color: var(--terracotta); }
.grid-card-body p { font-size: 0.78rem; color: var(--text-mid); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.grid-meta { display: flex; gap: 5px; margin-top: 8px; font-size: 0.7rem; color: var(--text-dim); }

/* AUTHOR ROW */
.author-section { max-width: 1100px; margin: 0 auto; padding: 0 20px 40px; }
.au-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.au-chip { display: flex; align-items: center; gap: 7px; padding: 5px 12px 5px 5px; background: var(--card); border: 1px solid var(--border); border-radius: 20px; font-size: 0.8rem; font-weight: 500; transition: all 0.2s; }
.au-chip:hover { border-color: var(--terracotta); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.au-chip img, .au-ph { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; }
.au-ph { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, var(--terracotta), var(--sage)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 700; }

/* FOOTER */
.site-footer { background: var(--charcoal); color: #aaa; padding: 40px 20px 20px; border-top: 3px solid var(--terracotta); }
.footer-inner { max-width: 1100px; margin: 0 auto; }
.footer-grid { display: grid; grid-template-columns: 1.5fr repeat(3, 1fr); gap: 28px; margin-bottom: 28px; }
.footer-brand h3 { font-family: 'Playfair Display', serif; color: #fff; font-size: 1.05rem; margin-bottom: 6px; }
.footer-brand p { font-size: 0.8rem; line-height: 1.6; }
.footer-col h4 { color: #ddd; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; font-weight: 700; }
.footer-col a { display: block; font-size: 0.8rem; padding: 2px 0; transition: color 0.2s; }
.footer-col a:hover { color: var(--terracotta-light); }
.footer-bottom { border-top: 1px solid var(--charcoal-mid); padding-top: 16px; font-size: 0.72rem; text-align: center; }

/* RESPONSIVE */
@media (max-width: 900px) {
  .hero-inner { grid-template-columns: 1fr; text-align: center; }
  .hero-text p { margin: 0 auto; }
  .hero-badges { justify-content: center; }
  .hero-visual { max-width: 260px; margin: 0 auto; }
  .hero-text h1 { font-size: 1.8rem; }
  .featured-layout { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  .main-nav { display: none; }
  .main-nav.open { display: flex; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: var(--charcoal); padding: 10px 20px; z-index: 99; }
  .mobile-toggle { display: block; }
  .grid-wrap, .cat-pills { }
  .footer-grid { grid-template-columns: 1fr; }
  .grid-wrap { grid-template-columns: 1fr; }
  .hero-banner { padding: 32px 20px; }
}
</style>
</head>
<body>
<header class="site-header">
<div class="header-inner">
  <a href="/" class="logo"><span class="logo-mark">S</span> ShopFloorSpicks</a>
  <nav class="main-nav">
    <a href="/industrial">Equipment</a>
    <a href="/electronics">Electronics</a>
    <a href="/materials">Materials</a>
    <a href="/automotive">Automotive</a>
    <a href="/home">Home</a>
    <a href="/fashion">Apparel</a>
    <a href="/health">Medical</a>
    <div class="nav-more">
      <a href="#"><i class="fas fa-ellipsis-h"></i></a>
      <div class="dropdown">
        <a href="/food">Food & Beverage</a>
        <a href="/sports">Sports</a>
        <a href="/pets">Pet & Vet</a>
        <a href="/more">More</a>
        <a href="/author/team">Our Team</a>
      </div>
    </div>
  </nav>
  <button class="mobile-toggle" aria-label="Menu">☰</button>
</div>
</header>

<section class="hero-banner">
<div class="hero-inner">
  <div class="hero-text">
    <div class="hero-eyebrow"><i class="fas fa-clipboard-check"></i> Curated for Professionals</div>
    <h1>Your Shop Floor, <em>Our Picks</em></h1>
    <p>Hand-selected reviews, buyer guides, and technical specifications for commercial-grade equipment. We do the research so you can focus on the work.</p>
    <div class="hero-badges">
      <div class="hero-badge"><span class="num">${fmtNum(total)}</span><span class="label">Articles</span></div>
      <div class="hero-badge"><span class="num">${activeTypes}</span><span class="label">Categories</span></div>
      <div class="hero-badge"><span class="num">${authors.length}</span><span class="label">Authors</span></div>
    </div>
  </div>
  <div class="hero-visual">
    <div class="hero-tile"><i class="fas fa-cogs"></i><span>Equipment</span></div>
    <div class="hero-tile"><i class="fas fa-leaf"></i><span>Materials</span></div>
    <div class="hero-tile"><i class="fas fa-tools"></i><span>Tools</span></div>
    <div class="hero-tile"><i class="fas fa-bolt"></i><span>Electronics</span></div>
  </div>
</div>
</section>

<div class="cat-section">
  <div class="cat-section-title">Browse Categories</div>
  <div class="cat-pills">${catPills}</div>
</div>

${articles.length > 0 ? `
<div class="featured-section">
  <div class="section-heading">Latest Picks</div>
  <div class="featured-layout">
    ${featuredHtml}
    <div class="sidebar-stack">${sidebarHtml}</div>
  </div>
</div>
` : `
<div class="featured-section">
  <div class="section-heading">Latest Picks</div>
  <p style="color:var(--text-dim);padding:32px 0;text-align:center;">No articles yet. Check back soon!</p>
</div>
`}

${gridArticles.length > 0 ? `
<div class="grid-section">
  <div class="section-heading">More Reviews</div>
  <div class="grid-wrap">${gridHtml}</div>
</div>
` : ""}

${authors.length > 0 ? `
<div class="author-section">
  <div class="section-heading">Our Writers</div>
  <div class="au-row">${authorRow}</div>
</div>
` : ""}

<footer class="site-footer">
<div class="footer-inner">
  <div class="footer-grid">
    <div class="footer-brand">
      <h3>ShopFloorSpicks</h3>
      <p>Curated picks and expert reviews for commercial equipment, tools, and industrial supplies across 11 categories.</p>
    </div>
    <div class="footer-col">
      <h4>Equipment</h4>
      <a href="/industrial">Heavy Equipment</a>
      <a href="/electronics">Electronics</a>
      <a href="/materials">Raw Materials</a>
      <a href="/automotive">Auto Parts</a>
    </div>
    <div class="footer-col">
      <h4>Industries</h4>
      <a href="/home">Home & Garden</a>
      <a href="/fashion">Apparel & Textile</a>
      <a href="/health">Medical Gear</a>
      <a href="/food">Food & Beverage</a>
    </div>
    <div class="footer-col">
      <h4>More</h4>
      <a href="/sports">Sports & Outdoors</a>
      <a href="/pets">Pet & Vet</a>
      <a href="/more">General</a>
      <a href="/author/team">Our Team</a>
    </div>
  </div>
  <div class="footer-bottom">&copy; 2026 ShopFloorSpicks.com — All rights reserved.</div>
</div>
</footer>
<script>
document.querySelector('.mobile-toggle')?.addEventListener('click',function(){document.querySelector('.main-nav')?.classList.toggle('open');});
</script>
</body></html>`;
}

function fallbackHtml() {
  return `<!DOCTYPE html><html><head><title>ShopFloorSpicks</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#faf8f5;color:#2d2d2d}h1{font-size:1.5rem}p{color:#999;margin-top:8px}</style></head><body><div style="text-align:center"><h1>ShopFloorSpicks</h1><p>Loading... please refresh.</p></div></body></html>`;
}
