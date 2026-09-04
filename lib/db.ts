import * as mysql from "mysql2/promise";

export const SITE = "shopfloorspicks";
export const BASE_URL = "https://shopfloorspicks.com";

function getConnectionConfig() {
  const url = process.env.MYSQL_URL;
  if (!url) throw new Error("MYSQL_URL is not set");
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectTimeout: 10000,
    disableEval: true,
  };
}

export async function query(text: string, params: unknown[] = []): Promise<any[]> {
  const conn = await mysql.createConnection(getConnectionConfig());
  try {
    const [rows] = await conn.query(text, params);
    if (Array.isArray(rows)) return rows.map((row: any) => ({ ...row }));
    return [rows];
  } finally {
    await conn.end();
  }
}

export async function getLatestArticles(limit = 12) {
  return query(
    `SELECT short_title, title, description, img, author, type, modified_time
     FROM articles WHERE site = ? AND is_online = 'Y'
     ORDER BY modified_time DESC LIMIT ?`,
    [SITE, limit]
  );
}

export async function getArticlesByTypePaged(type: string, page: number, perPage = 100) {
  const offset = (page - 1) * perPage;
  return query(
    `SELECT short_title, title, description, img, author, modified_time
     FROM articles WHERE site = ? AND type = ? AND is_online = 'Y'
     ORDER BY modified_time DESC LIMIT ? OFFSET ?`,
    [SITE, type, perPage, offset]
  );
}

export async function getTypeArticleCount(type: string) {
  const rows = await query(
    `SELECT COUNT(*) as cnt FROM articles WHERE site = ? AND type = ? AND is_online = 'Y'`,
    [SITE, type]
  );
  return rows[0]?.cnt || 0;
}

export async function getArticleBySlug(slug: string) {
  const rows = await query(
    `SELECT a.short_title, a.title, a.description, a.body, a.img, a.author, a.type, a.modified_time,
            au.img as author_img, au.slug as author_slug
     FROM articles a
     LEFT JOIN authors au ON a.author = au.name AND au.site = a.site
     WHERE a.site = ? AND a.short_title = ? AND a.is_online = 'Y'
     LIMIT 1`,
    [SITE, slug]
  );
  return rows[0] || null;
}

export async function getRelatedArticles(type: string, excludeSlug: string, limit = 500) {
  const rows = await query(
    `SELECT short_title, title, description, img, author, type, modified_time
     FROM articles WHERE site = ? AND type = ? AND short_title != ? AND is_online = 'Y'
     ORDER BY modified_time DESC LIMIT ?`,
    [SITE, type, excludeSlug, limit]
  );
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows.slice(0, 6);
}

export async function getAuthorBySlug(slug: string) {
  const rows = await query(
    `SELECT * FROM authors WHERE site = ? AND slug = ? LIMIT 1`,
    [SITE, slug]
  );
  return rows[0] || null;
}

export async function getAllAuthors() {
  return query(`SELECT * FROM authors WHERE site = ? ORDER BY name`, [SITE]);
}

export async function getAuthorArticles(authorName: string, limit = 50) {
  return query(
    `SELECT short_title, title, description, img, type, modified_time
     FROM articles WHERE site = ? AND author = ? AND is_online = 'Y'
     ORDER BY modified_time DESC LIMIT ?`,
    [SITE, authorName, limit]
  );
}

export async function getArticleCountsByType() {
  return query(
    `SELECT type, COUNT(*) as cnt FROM articles
     WHERE site = ? AND is_online = 'Y'
     GROUP BY type ORDER BY cnt DESC`,
    [SITE]
  );
}

export async function getTotalArticleCount() {
  const rows = await query(
    `SELECT COUNT(*) as cnt FROM articles WHERE site = ? AND is_online = 'Y'`,
    [SITE]
  );
  return rows[0]?.cnt || 0;
}

export async function getAllTypes() {
  return query(
    `SELECT DISTINCT type FROM articles WHERE site = ? AND is_online = 'Y' ORDER BY type`,
    [SITE]
  );
}

export async function upsertArticle(data: any) {
  const { short_title, title, description, body, img, author, type, is_online } = data;
  await query(
    `INSERT INTO articles (site, short_title, title, description, body, img, author, type, is_online, modified_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE body = VALUES(body), modified_time = NOW()`,
    [SITE, short_title, title, description || "", body || "", img || "", author || "", type || "", is_online || "Y"]
  );
}

export async function upsertAuthor(data: any) {
  const { name, slug, img, description } = data;
  await query(
    `INSERT INTO authors (site, name, slug, img, description)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE img = VALUES(img), description = VALUES(description)`,
    [SITE, name, slug, img || "", description || ""]
  );
}
