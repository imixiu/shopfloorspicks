// Article detail page — /{type}/{slug}
export const dynamic = "force-dynamic";

import { getArticleBySlug, getRelatedArticles } from "../../../lib/db";
import { HEADER_HTML, FOOTER_HTML } from "../../../lib/templates";
import { TYPE_MAP } from "../../../lib/type-seo";

export async function GET(_req: Request, { params }: { params: Promise<{ type: string; slug: string }> }) {
  const { type: rawType, slug } = await params;
  const dbType = rawType;

  try {
    const article = await getArticleBySlug(slug);
    if (!article) {
      return new Response("Article not found", { status: 404 });
    }

    const info = TYPE_MAP[article.type] || TYPE_MAP[dbType] || TYPE_MAP.more;
    const date = article.modified_time
      ? new Date(article.modified_time).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "";

    // Extract TOC from h2/h3
    const tocItems: { tag: string; id: string; text: string }[] = [];
    let bodyHtml = article.body || "";
    bodyHtml = bodyHtml.replace(/<(h[23])[^>]*>(.*?)<\/\1>/gi, (_match: string, tag: string, text: string) => {
      const plain = text.replace(/<[^>]+>/g, "").trim();
      const id = "h-" + plain.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 50);
      tocItems.push({ tag: tag.toLowerCase(), id, text: plain });
      return `<${tag} id="${id}">${text}</${tag}>`;
    });

    const tocHtml = tocItems.length > 2
      ? `<div class="toc-sidebar"><h4>On This Page</h4>${tocItems.map(t =>
          `<a href="#${t.id}" class="${t.tag === "h3" ? "toc-h3" : ""}">${esc(t.text)}</a>`
        ).join("")}</div>`
      : "";

    // Related articles
    const related = await getRelatedArticles(article.type, slug, 500);
    const relatedHtml = related.length > 0
      ? `<div class="related-section"><h3 style="font-family:'Playfair Display',serif;font-size:1.1rem;margin:32px 0 16px;">Related Articles</h3>
         <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
         ${related.slice(0, 4).map((r: any) => `
           <a href="/${r.type}/${r.short_title}" class="article-card" style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">
             ${r.img ? `<img src="${esc(r.img)}" alt="${esc(r.title)}" loading="lazy" style="aspect-ratio:16/9;object-fit:cover;width:100%">` : ""}
             <div style="padding:10px;"><h4 style="font-size:0.82rem;font-weight:600;line-height:1.3;">${esc(r.title)}</h4></div>
           </a>`).join("")}
         </div></div>`
      : "";

    // JSON-LD
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      author: { "@type": "Person", name: article.author },
      datePublished: article.modified_time,
      image: article.img || undefined,
      publisher: { "@type": "Organization", name: "ShopFloorSpicks" },
    });

    const breadcrumbLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://shopfloorspicks.com" },
        { "@type": "ListItem", position: 2, name: info.label, item: `https://shopfloorspicks.com/${article.type}` },
        { "@type": "ListItem", position: 3, name: article.title },
      ],
    });

    const header = HEADER_HTML
      .replace("{{TITLE}}", `${esc(article.title)} | ShopFloorSpicks`)
      .replace("{{DESCRIPTION}}", esc(article.description || "").substring(0, 160))
      .replace("{{CANONICAL}}", `https://shopfloorspicks.com/${article.type}/${article.short_title}`);

    const coverHtml = article.img
      ? `<img src="${esc(article.img)}" alt="${esc(article.title)}" class="article-cover">`
      : "";

    const authorLink = article.author_slug
      ? `<a href="/author/${article.author_slug}">${esc(article.author)}</a>`
      : esc(article.author);

    const body = `
    <div class="breadcrumb"><a href="/">Home</a> <span>›</span> <a href="/${article.type}">${esc(info.label)}</a> <span>›</span> Article</div>
    <div class="article-layout">
      <div class="article-main">
        ${coverHtml}
        <div class="article-meta">
          <span>By ${authorLink}</span>
          <span>·</span>
          <time>${date}</time>
          <span>·</span>
          <span class="cat-tag" style="background:${info.color};color:#fff;padding:2px 8px;border-radius:4px;font-size:0.72rem;">${esc(info.label)}</span>
        </div>
        <div class="article-wrap"><div class="article-content">${bodyHtml}</div></div>
        ${relatedHtml}
      </div>
      ${tocHtml}
    </div>
    <script type="application/ld+json">${jsonLd}</script>
    <script type="application/ld+json">${breadcrumbLd}</script>`;

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
