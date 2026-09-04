// Category pagination — /{type}/page/{pageNum}
export const dynamic = "force-dynamic";

import { getArticlesByTypePaged, getTypeArticleCount } from "../../../../lib/db";
import { HEADER_HTML, FOOTER_HTML } from "../../../../lib/templates";
import { TYPE_MAP } from "../../../../lib/type-seo";

export async function GET(_req: Request, { params }: { params: Promise<{ type: string; pageNum: string }> }) {
  const { type: rawType, pageNum } = await params;
  const dbType = rawType;
  const page = parseInt(pageNum) || 1;
  const info = TYPE_MAP[dbType];

  if (!info || page < 2) {
    if (page === 1) return Response.redirect(`https://shopfloorspicks.com/${dbType}`, 301);
    return new Response("Not Found", { status: 404 });
  }

  try {
    const [articles, total] = await Promise.all([
      getArticlesByTypePaged(dbType, page, 100),
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
          <div class="card-meta"><span>${esc(a.author)}</span><span>·</span><time>${date}</time></div>
        </div>
      </a>`;
    }).join("\n");

    const totalPages = Math.ceil(total / 100);
    let paginationHtml = '<div class="pagination">';
    if (page > 1) paginationHtml += `<a href="/${dbType}/page/${page - 1}">← Prev</a>`;
    paginationHtml += `<span class="current">Page ${page}</span>`;
    if (page < totalPages) paginationHtml += `<a href="/${dbType}/page/${page + 1}">Next →</a>`;
    paginationHtml += '</div>';

    const header = HEADER_HTML
      .replace("{{TITLE}}", `${info.label} — Page ${page} | ShopFloorSpicks`)
      .replace("{{DESCRIPTION}}", `${info.label} articles, page ${page}`)
      .replace("{{CANONICAL}}", `https://shopfloorspicks.com/${dbType}/page/${page}`)
      .replace("</title>", "</title>\n<meta name=\"robots\" content=\"noindex, follow\">");

    const body = `
    <div class="category-hero">
      <span class="cat-badge" style="background:${info.color}">${esc(info.label)}</span>
      <h1>${esc(info.title)} — Page ${page}</h1>
    </div>
    <div class="breadcrumb"><a href="/">Home</a> <span>›</span> <a href="/${dbType}">${esc(info.label)}</a> <span>›</span> Page ${page}</div>
    <div class="article-grid">${cards || '<p style="grid-column:1/-1;text-align:center;color:var(--text-dim);padding:40px">No more articles.</p>'}</div>
    ${paginationHtml}`;

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
