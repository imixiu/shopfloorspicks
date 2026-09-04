// Author API — GET/POST /api/authors
export const dynamic = "force-dynamic";

import { query, upsertAuthor } from "../../../lib/db";

export async function GET() {
  try {
    const rows = await query(
      `SELECT * FROM authors WHERE site = 'shopfloorspicks' ORDER BY name`
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
    if (!body.name || !body.slug) {
      return new Response(JSON.stringify({ error: "name and slug required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    await upsertAuthor(body);
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
