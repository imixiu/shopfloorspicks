// Post-build hook: patch .open-next for CF Workers
// 1. Remove static index.html (let route handler serve homepage)
// 2. Patch worker.js to block /_next/image with 404

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const ASSETS = join(ROOT, ".open-next", "assets");
const WORKER = join(ROOT, ".open-next", "worker.js");

// 1. Remove static index.html from assets so route.ts handles /
const indexHtml = join(ASSETS, "index.html");
if (existsSync(indexHtml)) {
  unlinkSync(indexHtml);
  console.log("[postbuild] Removed static index.html from assets");
}

// Also check for _index.html variants
const altIndex = join(ASSETS, "_index.html");
if (existsSync(altIndex)) {
  unlinkSync(altIndex);
  console.log("[postbuild] Removed _index.html from assets");
}

// 2. Patch worker.js to block /_next/image requests
if (existsSync(WORKER)) {
  let code = readFileSync(WORKER, "utf-8");
  const patch = `
// [postbuild] Block /_next/image — return 404
if (url.pathname.startsWith("/_next/image")) {
  return new Response("Not Found", { status: 404 });
}
`;
  if (!code.includes("Block /_next/image")) {
    // Inject after the first line that handles the request
    code = code.replace(
      /(async function handler\(request\)\s*\{)/,
      `$1\n  const url = new URL(request.url);${patch}`
    );
    writeFileSync(WORKER, code);
    console.log("[postbuild] Patched worker.js to block /_next/image");
  }
}

console.log("[postbuild] Done");
