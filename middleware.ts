// Middleware: www→bare redirect + ?page→/page/N normalization
import { NextRequest, NextResponse } from "next/server";

const BARE_HOST = "shopfloorspicks.com";

const BOT_PATTERNS = /googlebot|bingbot|yandexbot|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|screaming\s?frog|crawl|spider|bot\b/i;

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get("host") || "";

  // 1. www → bare domain (301)
  if (host.startsWith("www.")) {
    url.hostname = BARE_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  // 2. ?page=N → /page/N path (301)
  const pageParam = url.searchParams.get("page");
  if (pageParam) {
    const page = parseInt(pageParam);
    if (page >= 2) {
      url.searchParams.delete("page");
      const basePath = url.pathname.replace(/\/$/, "");
      url.pathname = `${basePath}/page/${page}`;
      return NextResponse.redirect(url, 301);
    }
    // page=1 → strip param, redirect to base
    url.searchParams.delete("page");
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap|robots|icon.png|article.css|.*\\.txt|.*\\.xml|.*\\.png|.*\\.jpg|.*\\.svg).*)",
  ],
};
