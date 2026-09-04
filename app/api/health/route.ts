export const dynamic = "force-dynamic";
export async function GET() {
  return new Response(JSON.stringify({ status: "ok", site: "shopfloorspicks", time: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
}
