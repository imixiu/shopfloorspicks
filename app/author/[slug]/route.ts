// Author page — /author/team and /author/{slug}
export const dynamic = "force-dynamic";

import { getAllAuthors, getAuthorBySlug, getAuthorArticles } from "../../../lib/db";
import { HEADER_HTML, FOOTER_HTML } from "../../../lib/templates";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    if (slug === "team") {
      return renderTeamPage();
    }
    return renderAuthorPage(slug);
  } catch (err: any) {
    return new Response("Server Error", { status: 500 });
  }
}

async function renderTeamPage() {
  const authors = await getAllAuthors();
  const cards = authors.map((au: any) => {
    const imgHtml = au.img
      ? `<img src="${esc(au.img)}" alt="${esc(au.name)}">`
      : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#3498db,#9b59b6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem;font-weight:700;margin:0 auto 12px">${esc(au.name).charAt(0)}</div>`;
    return `
    <a href="/author/${au.slug}" class="author-card">
      ${imgHtml}
      <h3>${esc(au.name)}</h3>
      <p>${esc(au.description || "Contributing author at ShopFloorSpicks.")}</p>
    </a>`;
  }).join("\n");

  const header = HEADER_HTML
    .replace("{{TITLE}}", "Our Team | ShopFloorSpicks")
    .replace("{{DESCRIPTION}}", "Meet the expert authors behind ShopFloorSpicks's equipment reviews and buyer guides.")
    .replace("{{CANONICAL}}", "https://shopfloorspicks.com/author/team")
    .replace("</title>", "</title>\n<meta name=\"robots\" content=\"noindex, follow\">");

  const body = `
  <div class="category-hero" style="text-align:center">
    <h1>Our Team</h1>
    <p>Meet the experts who research, test, and write our equipment guides.</p>
  </div>
  <div class="author-grid">${cards || '<p style="text-align:center;color:var(--text-dim);padding:40px">No authors yet.</p>'}</div>`;

  return new Response(header + body + FOOTER_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function renderAuthorPage(slug: string) {
  const author = await getAuthorBySlug(slug);
  if (!author) return new Response("Author not found", { status: 404 });

  const articles = await getAuthorArticles(author.name, 20);
  const articleCards = articles.map((a: any) => {
    const date = a.modified_time ? new Date(a.modified_time).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    return `
    <a href="/${a.type}/${a.short_title}" class="article-card">
      ${a.img ? `<img src="${esc(a.img)}" alt="${esc(a.title)}" loading="lazy">` : `<div class="card-placeholder" style="background:#f1f5f9;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:#94a3b8"><i class="fas fa-file-alt"></i></div>`}
      <div class="article-card-body">
        <h3>${esc(a.title)}</h3>
        <div class="card-meta"><time>${date}</time></div>
      </div>
    </a>`;
  }).join("\n");

  const imgHtml = author.img
    ? `<img src="${esc(author.img)}" alt="${esc(author.name)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin-bottom:16px;">`
    : `<div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#3498db,#9b59b6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;font-weight:700;margin-bottom:16px">${esc(author.name).charAt(0)}</div>`;

  const header = HEADER_HTML
    .replace("{{TITLE}}", `${esc(author.name)} | ShopFloorSpicks`)
    .replace("{{DESCRIPTION}}", esc(author.description || `Articles by ${author.name}`))
    .replace("{{CANONICAL}}", `https://shopfloorspicks.com/author/${slug}`)
    .replace("</title>", "</title>\n<meta name=\"robots\" content=\"noindex, follow\">");

  const body = `
  <div class="breadcrumb"><a href="/">Home</a> <span>›</span> <a href="/author/team">Team</a> <span>›</span> ${esc(author.name)}</div>
  <div style="max-width:1200px;margin:0 auto;padding:24px 20px;text-align:center">
    ${imgHtml}
    <h1 style="font-family:'Playfair Display',serif;font-size:1.5rem;margin-bottom:8px">${esc(author.name)}</h1>
    <p style="color:var(--text-mid);max-width:600px;margin:0 auto 32px;line-height:1.6">${esc(author.description || "Contributing author at ShopFloorSpicks.")}</p>
  </div>
  <div class="section-title" style="max-width:1200px;margin:0 auto;padding:0 20px 16px"><h2 style="font-family:'Playfair Display',serif;font-size:1.2rem">Articles by ${esc(author.name)}</h2></div>
  <div class="article-grid">${articleCards || '<p style="grid-column:1/-1;text-align:center;color:var(--text-dim);padding:40px">No articles yet.</p>'}</div>`;

  return new Response(header + body + FOOTER_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
