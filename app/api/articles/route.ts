// Article API — GET/POST /api/articles
export const dynamic = "force-dynamic";

import { query, upsertArticle } from "../../../lib/db";

export async function GET() {
  try {
    const rows = await query(
      `SELECT short_title, title, description, img, author, type, modified_time
       FROM articles WHERE site = 'shopfloorspicks' AND is_online = 'Y'
       ORDER BY modified_time DESC LIMIT 500`
    );
    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.short_title) {
      return new Response(JSON.stringify({ error: "short_title required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    await upsertArticle(body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
