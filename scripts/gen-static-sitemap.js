// Generate XML sitemaps from MySQL for shopfloorspicks.com
const mysql = require("mysql2/promise");

const SITE = "shopfloorspicks";
const DOMAIN = "https://shopfloorspicks.com";
const PER_FILE = 5000;

async function main() {
  const url = process.env.MYSQL_URL;
  if (!url) { console.error("MYSQL_URL not set"); process.exit(1); }

  const u = new URL(url);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  });

  const [articles] = await conn.query(
    `SELECT type, short_title, modified_time FROM articles
     WHERE site = ? AND is_online = 'Y'
     ORDER BY modified_time DESC`, [SITE]
  );

  console.log(`Found ${articles.length} articles`);

  const fs = require("fs");
  const path = require("path");
  const dir = path.join(__dirname, "..", "public", "sitemap");
  fs.mkdirSync(dir, { recursive: true });

  // Split into chunks
  const chunks = [];
  for (let i = 0; i < articles.length; i += PER_FILE) {
    chunks.push(articles.slice(i, i + PER_FILE));
  }

  // Write sub-sitemaps
  const subFiles = [];
  chunks.forEach((chunk, idx) => {
    const filename = `sitemap${idx + 1}.xml`;
    const urls = chunk.map(a => {
      const loc = `${DOMAIN}/${a.type}/${a.short_title}`;
      const lastmod = a.modified_time ? new Date(a.modified_time).toISOString().split("T")[0] : "";
      return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.6</priority></url>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    fs.writeFileSync(path.join(dir, filename), xml);
    subFiles.push(filename);
    console.log(`  ${filename}: ${chunk.length} URLs`);
  });

  // Write sitemap index
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${subFiles.map(f => `  <sitemap><loc>${DOMAIN}/sitemap/${f}</loc><lastmod>${new Date().toISOString().split("T")[0]}</lastmod></sitemap>`).join("\n")}
</sitemapindex>`;
  fs.writeFileSync(path.join(dir, "sitemapindex.xml"), indexXml);
  // Also copy as root sitemap.xml
  fs.writeFileSync(path.join(__dirname, "..", "public", "sitemap.xml"), indexXml);
  console.log(`\nSitemap index: ${subFiles.length} files, ${articles.length} total URLs`);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
