// Category listing page — /{type}
export const dynamic = "force-dynamic";

import { getArticlesByTypePaged, getTypeArticleCount } from "../../lib/db";
import { HEADER_HTML, FOOTER_HTML } from "../../lib/templates";
import { TYPE_MAP } from "../../lib/type-seo";

export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type: rawType } = await params;
  const dbType = rawType;
  const info = TYPE_MAP[dbType];

  if (!info) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const [articles, total] = await Promise.all([
      getArticlesByTypePaged(dbType, 1, 100),
      getTypeArticleCount(dbType),
    ]);

    const cards = articles.map((a: any) => {
      const date = a.modified_time ? new Date(a.modified_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
      const imgHtml = a.img
        ? `<img src="${esc(a.img)}" alt="${esc(a.title)}" loading="lazy">`
        : `<div class="card-placeholder" style="background:linear-gradient(135deg,${info.color}15,${info.color}05);display:flex;align-items:center;justify-content:center;font-size:2rem;color:${info.color}30"><i class="fas ${info.icon}"></i></div>`;
      return `
      <a href="/${dbType}/${a.short_title}" class="article-card">
        ${imgHtml}
        <div class="article-card-body">
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.description)}</p>
          <div class="card-meta">
            <span>${esc(a.author)}</span>
            <span>·</span>
            <time>${date}</time>
          </div>
        </div>
      </a>`;
    }).join("\n");

    const totalPages = Math.ceil(total / 100);
    const pagination = totalPages > 1 ? `
    <div class="pagination">
      <span class="current">Page 1</span>
      ${totalPages > 1 ? `<a href="/${dbType}/page/2">Page 2 →</a>` : ""}
    </div>` : "";

    const header = HEADER_HTML
      .replace("{{TITLE}}", `${info.title} — ShopFloorSpicks`)
      .replace("{{DESCRIPTION}}", info.description)
      .replace("{{CANONICAL}}", `https://shopfloorspicks.com/${dbType}`);

    const body = `
    <div class="category-hero">
      <span class="cat-badge" style="background:${info.color}">${esc(info.label)}</span>
      <h1>${esc(info.title)}</h1>
      <p>${esc(info.description)} — ${total.toLocaleString()} articles covering specs, reviews, and buyer guides.</p>
    </div>
    <div class="breadcrumb"><a href="/">Home</a> <span>›</span> ${esc(info.label)}</div>
    <div class="article-grid">${cards || '<p style="grid-column:1/-1;text-align:center;color:var(--text-dim);padding:40px">No articles in this category yet.</p>'}</div>
    ${pagination}`;

    return new Response(header + body + FOOTER_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return new Response("Server Error", { status: 500 });
  }
}

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
