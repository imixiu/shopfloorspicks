// IndexNow batch URL submission script
// Usage: node scripts/indexnow-submit.js
// Customize HOST and KEY per site before running.

const https = require('https');
const http = require('http');

const HOST = 'commercialtoolry.com';     // ← CHANGE THIS
const KEY = 'c41cca0b2ce848a08df623a5a01667f1'; // ← CHANGE THIS
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const BATCH_SIZE = 10000;
const BATCH_PAUSE_MS = 5000;

// Fetch URL via HTTP(S)
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'IndexNowBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

// Submit batch to IndexNow API
function submitBatch(urls, batchNum) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls
    });
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Extract URLs from sitemap XML
function extractUrls(xml) {
  const matches = xml.match(/<loc>(.*?)<\/loc>/g) || [];
  return matches.map(m => m.replace(/<\/?loc>/g, '')).filter(u => u.startsWith('http'));
}

async function main() {
  console.log(`IndexNow submission for: ${HOST}`);
  console.log(`Key: ${KEY}`);
  console.log('');

  // 1. Fetch sitemap index
  const sitemapUrl = `https://${HOST}/sitemap/sitemapindex.xml`;
  console.log(`Fetching sitemap index: ${sitemapUrl}`);
  const indexRes = await fetchUrl(sitemapUrl);
  if (indexRes.status !== 200) {
    console.error(`Failed to fetch sitemap index: ${indexRes.status}`);
    process.exit(1);
  }

  // 2. Parse sub-sitemaps
  const subSitemaps = extractUrls(indexRes.body);
  console.log(`Found ${subSitemaps.length} sub-sitemaps`);

  // 3. Collect all URLs
  const allUrls = new Set();
  for (const sm of subSitemaps) {
    const res = await fetchUrl(sm);
    if (res.status === 200) {
      const urls = extractUrls(res.body);
      urls.forEach(u => allUrls.add(u));
    }
  }

  // Add homepage
  allUrls.add(`https://${HOST}/`);

  const urlArray = [...allUrls];
  console.log(`Total unique URLs: ${urlArray.length}`);

  // 4. Split into batches
  const batches = [];
  for (let i = 0; i < urlArray.length; i += BATCH_SIZE) {
    batches.push(urlArray.slice(i, i + BATCH_SIZE));
  }
  console.log(`Batches: ${batches.length}`);
  console.log('');

  // 5. Submit batches (skip first, submit 2+, then retry first)
  const results = [];
  let firstBatchResult = null;

  for (let i = 0; i < batches.length; i++) {
    if (i === 0 && batches.length > 1) {
      console.log(`Skipping batch 1 (${batches[0].length} URLs), submitting rest first...`);
      continue;
    }
    console.log(`Submitting batch ${i + 1}/${batches.length} (${batches[i].length} URLs)...`);
    const res = await submitBatch(batches[i], i + 1);
    console.log(`  Status: ${res.status}${res.status !== 200 ? ' — ' + res.body.substring(0, 200) : ''}`);
    results.push({ batch: i + 1, status: res.status });

    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, BATCH_PAUSE_MS));
    }
  }

  // 6. Retry first batch
  if (batches.length > 1) {
    console.log(`\nRetrying batch 1 (${batches[0].length} URLs)...`);
    await new Promise(r => setTimeout(r, 10000));
    const res = await submitBatch(batches[0], 1);
    console.log(`  Status: ${res.status}${res.status !== 200 ? ' — ' + res.body.substring(0, 200) : ''}`);
    results.push({ batch: 1, status: res.status, retry: true });
  }

  // 7. Summary
  console.log('\n=== Summary ===');
  const success = results.filter(r => r.status === 200).length;
  const failed = results.filter(r => r.status !== 200).length;
  console.log(`Total URLs submitted: ${urlArray.length}`);
  console.log(`Successful batches: ${success}`);
  console.log(`Failed batches: ${failed}`);
  if (failed > 0) {
    console.log('Check Bing Webmaster Tools for details.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
