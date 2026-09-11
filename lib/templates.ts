// ShopFloorSpicks — Shared Header & Footer templates
// Design: "Warm Workshop" — cream base, terracotta accent, sage green secondary

const SHARED_CSS = `
:root {
  --cream: #faf8f5; --cream-deep: #f0ebe3; --card: #ffffff;
  --terracotta: #c0392b; --terracotta-light: #e8d5c4;
  --sage: #5d7a4a; --sage-light: #d4e4c7;
  --charcoal: #2d2d2d; --charcoal-mid: #4a4a4a;
  --text: #3d3d3d; --text-mid: #6b6b6b; --text-dim: #999;
  --border: #e5e0d8; --border-warm: #d4c5b0;
  --mustard: #d4a574;
  --radius: 8px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Source Sans 3', -apple-system, sans-serif; background: var(--cream); color: var(--text); line-height: 1.6; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; height: auto; }
.inner-wrap { max-width: 1100px; margin: 0 auto; padding: 0 20px; }

/* === HEADER === */
.site-header { background: var(--charcoal); position: sticky; top: 0; z-index: 100; border-bottom: 3px solid var(--terracotta); }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; max-width: 1100px; margin: 0 auto; }
.logo { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 1.3rem; color: #fff; display: flex; align-items: center; gap: 10px; }
.logo-mark { width: 30px; height: 30px; border-radius: 50%; background: var(--terracotta); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #fff; font-family: 'Playfair Display', serif; font-weight: 700; }
.main-nav { display: flex; gap: 2px; flex-wrap: wrap; }
.main-nav a { color: #bbb; font-size: 0.8rem; font-weight: 600; padding: 6px 10px; border-radius: 4px; transition: all 0.2s; letter-spacing: 0.02em; text-transform: uppercase; font-size: 0.72rem; }
.main-nav a:hover { color: #fff; background: rgba(192,57,43,0.3); }
.nav-more { position: relative; }
.nav-more > a { cursor: pointer; }
.nav-more .dropdown { display: none; position: absolute; right: 0; top: 100%; background: var(--charcoal); border: 1px solid var(--charcoal-mid); border-radius: 6px; min-width: 180px; padding: 4px 0; box-shadow: 0 6px 20px rgba(0,0,0,0.2); z-index: 200; }
.nav-more:hover .dropdown { display: block; }
.nav-more .dropdown a { display: block; padding: 7px 14px; font-size: 0.75rem; }
.mobile-menu-toggle { display: none; background: none; border: none; color: #fff; font-size: 1.3rem; cursor: pointer; }

/* === BREADCRUMB === */
.breadcrumb { max-width: 1100px; margin: 0 auto; padding: 14px 20px; font-size: 0.8rem; color: var(--text-dim); }
.breadcrumb a { color: var(--text-mid); }
.breadcrumb a:hover { color: var(--terracotta); }
.breadcrumb span { margin: 0 5px; }

/* === ARTICLE LAYOUT === */
.article-layout { max-width: 1100px; margin: 0 auto; padding: 0 20px 40px; display: grid; grid-template-columns: 1fr 220px; gap: 28px; }
.article-main { background: var(--card); border-radius: var(--radius); padding: 28px; border: 1px solid var(--border); }
.toc-sidebar { position: sticky; top: 70px; align-self: start; max-height: calc(100vh - 90px); overflow-y: auto; padding: 14px 0; }
.toc-sidebar h4 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); margin-bottom: 10px; font-weight: 700; }
.toc-sidebar a { display: block; font-size: 0.78rem; color: var(--text-mid); padding: 3px 0 3px 10px; border-left: 2px solid var(--border); transition: all 0.2s; }
.toc-sidebar a:hover { color: var(--terracotta); border-color: var(--terracotta); }
.toc-sidebar a.toc-h3 { padding-left: 20px; font-size: 0.74rem; }

/* === CATEGORY PAGE === */
.category-hero { max-width: 1100px; margin: 0 auto; padding: 28px 20px 12px; }
.category-hero h1 { font-family: 'Playfair Display', serif; font-size: 1.7rem; font-weight: 700; color: var(--charcoal); }
.category-hero p { color: var(--text-mid); margin-top: 6px; max-width: 650px; }
.cat-badge { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 0.68rem; font-weight: 700; color: #fff; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
.article-grid { max-width: 1100px; margin: 0 auto; padding: 14px 20px 40px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; }
.article-card { background: var(--card); border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); transition: all 0.2s; }
.article-card:hover { box-shadow: 0 4px 16px rgba(45,45,45,0.08); transform: translateY(-1px); }
.article-card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
.article-card-body { padding: 14px; }
.article-card-body h3 { font-family: 'Playfair Display', serif; font-size: 0.92rem; font-weight: 600; line-height: 1.4; margin-bottom: 6px; }
.article-card-body h3 a:hover { color: var(--terracotta); }
.article-card-body p { font-size: 0.8rem; color: var(--text-mid); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 0.72rem; color: var(--text-dim); }
.card-meta .cat-tag { padding: 2px 7px; border-radius: 3px; font-size: 0.65rem; font-weight: 700; color: #fff; text-transform: uppercase; }

/* === PAGINATION === */
.pagination { display: flex; justify-content: center; gap: 6px; padding: 20px 0 40px; }
.pagination a, .pagination span { padding: 7px 12px; border-radius: 4px; font-size: 0.82rem; font-weight: 600; }
.pagination a { background: var(--card); border: 1px solid var(--border); color: var(--text-mid); }
.pagination a:hover { border-color: var(--terracotta); color: var(--terracotta); }
.pagination span.current { background: var(--terracotta); color: #fff; border: 1px solid var(--terracotta); }

/* === AUTHOR === */
.author-grid { max-width: 1100px; margin: 0 auto; padding: 20px 20px 40px; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
.author-card { background: var(--card); border-radius: var(--radius); padding: 20px; text-align: center; border: 1px solid var(--border); }
.author-card img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 3px solid var(--cream-deep); }
.author-card h3 { font-family: 'Playfair Display', serif; font-size: 0.95rem; margin-bottom: 4px; }
.author-card p { font-size: 0.8rem; color: var(--text-mid); line-height: 1.5; }

/* === FOOTER === */
.site-footer { background: var(--charcoal); color: #aaa; padding: 40px 20px 20px; margin-top: 40px; border-top: 3px solid var(--terracotta); }
.footer-inner { max-width: 1100px; margin: 0 auto; }
.footer-grid { display: grid; grid-template-columns: 1.5fr repeat(3, 1fr); gap: 28px; margin-bottom: 28px; }
.footer-brand h3 { font-family: 'Playfair Display', serif; color: #fff; font-size: 1.05rem; margin-bottom: 6px; }
.footer-brand p { font-size: 0.8rem; line-height: 1.6; }
.footer-col h4 { color: #ddd; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; font-weight: 700; }
.footer-col a { display: block; font-size: 0.8rem; padding: 2px 0; transition: color 0.2s; }
.footer-col a:hover { color: var(--terracotta-light); }
.footer-bottom { border-top: 1px solid var(--charcoal-mid); padding-top: 16px; font-size: 0.72rem; text-align: center; }

/* === RESPONSIVE === */
@media (max-width: 1024px) {
  .article-layout { grid-template-columns: 1fr; }
  .toc-sidebar { display: none; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  .main-nav { display: none; }
  .main-nav.open { display: flex; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: var(--charcoal); padding: 10px 20px; border-top: 1px solid var(--charcoal-mid); z-index: 99; }
  .mobile-menu-toggle { display: block; }
  .footer-grid { grid-template-columns: 1fr; }
  .article-grid { grid-template-columns: 1fr; }
  .category-hero h1 { font-size: 1.3rem; }
}
`;

export const HEADER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<meta name="description" content="{{DESCRIPTION}}">
<meta property="og:title" content="{{TITLE}} | ShopFloorsPicks">
<meta property="og:description" content="{{DESCRIPTION}}">
<meta property="og:type" content="website">
<link rel="canonical" href="{{CANONICAL}}">
<link rel="icon" href="/icon.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="/article.css">
<style>${SHARED_CSS}</style>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-95PY8PSZ0Y"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-95PY8PSZ0Y');</script>
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
  <button class="mobile-menu-toggle" aria-label="Menu">☰</button>
</div>
</header>
<main>`;

export const FOOTER_HTML = `</main>
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
  <div class="footer-bottom">&copy; ${new Date().getFullYear()} ShopFloorSpicks.com — All rights reserved.</div>
</div>
</footer>
<script>
document.querySelector('.mobile-menu-toggle')?.addEventListener('click',function(){document.querySelector('.main-nav')?.classList.toggle('open');});
</script>
</body></html>`;
