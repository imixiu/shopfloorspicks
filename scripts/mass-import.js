#!/usr/bin/env node
/**
 * CommercialToolry - Mass Import from SmartBuy API
 * Merged from toolguidedaily mass-import.js + full-rescan.js
 *
 * Key improvements over original:
 *   - Connection pool (not single connection) → no reconnect stalls
 *   - Worker pool (120 concurrent) → ~400/min throughput
 *   - No title/description truncation → full content stored
 *   - Heuristic classification (600+ patterns) + LLM fallback
 *   - Body cleaning (strip div/style) before DB insert
 *   - Batch INSERT (50 rows) + batch UPDATE (200 rows via CASE WHEN)
 *   - IndexNow auto-submit per flush
 *   - Resume from progress file
 *   - Periodic stats logging + JSON summary file
 *
 * Usage:
 *   tmux new -s ct-import
 *   cd /data/vercel-projects/shopfloorspicks
 *   node --env-file=.env.local scripts/mass-import.js
 */

const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');
const fs = require('fs');
const readline = require('readline');

// ============ CONFIG ============
const SITE = 'shopfloorspicks';
const DOMAIN = 'shopfloorspicks.com';
const KEYWORD_FILE = '/tmp/ct_keywords_02.txt';
const CONCURRENCY = 120;
const CLASSIFY_BATCH = 50;
const INSERT_BATCH = 50;
const UPDATE_BATCH = 200;
const PROGRESS_FILE = '/tmp/ct_import_progress.txt';
const SUMMARY_FILE = '/tmp/ct_import_summary.json';
const SMARTBUY_BASE = 'https://smartbuy.alibaba.com/verticalSite/article.json';
const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const API_TIMEOUT = 12000;
const REPORT_EVERY = 2000;

// Increase HTTP socket pool
https.globalAgent.maxSockets = 300;
http.globalAgent.maxSockets = 300;

// ============ INDEXNOW ============
const INDEXNOW_KEY = '0889b2afc66e48e796cdc934fe4dfcd2';
const INDEXNOW_KEY_LOCATION = `https://${DOMAIN}/${INDEXNOW_KEY}.txt`;
let indexnowBuffer = [];
let indexnowSubmitted = 0;
let indexnowFailed = 0;

function indexnowSubmit(urls) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      host: DOMAIN,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: urls,
    });
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode === 200) indexnowSubmitted += urls.length;
        else indexnowFailed += urls.length;
        resolve();
      });
    });
    req.on('error', () => { indexnowFailed += urls.length; resolve(); });
    req.write(payload);
    req.end();
  });
}

async function flushIndexNow() {
  if (indexnowBuffer.length === 0) return;
  const urls = indexnowBuffer.splice(0);
  for (let i = 0; i < urls.length; i += 500) {
    await indexnowSubmit(urls.slice(i, i + 500));
  }
}

// ============ CATEGORIES ============
const VALID_TYPES = [
  'industrial', 'electronics', 'materials', 'automotive', 'home',
  'fashion', 'health', 'food', 'sports', 'pets', 'more',
];

const CATEGORIES_DESC = {
  industrial: 'Industrial machinery, valves, pipes, pumps, cranes, conveyors, powder coating, de-burring tools, heavy equipment',
  electronics: 'Integrated circuits, GPUs, RF equipment, displays, sensors, semiconductors, electronic components',
  materials: 'Steel, stainless steel, plastics, adhesives, chemicals, galvanized sheets, ceramics, glass, raw materials',
  automotive: 'Turbo kits, brake pads, car lights, engine components, automotive aftermarket parts, vehicle accessories',
  home: 'Home decor, furniture, vases, lighting, garden tools, holiday ornaments, drainage, household items',
  fashion: 'Clothing, shoes, cargo pants, sandals, handbags, sunglasses, fashion accessories, apparel',
  health: 'Medical devices, nasogastric tubes, supplements, rehabilitation equipment, health products, fitness recovery',
  food: 'Juice catering, food packaging, restaurant equipment, food ingredients, kitchen appliances',
  sports: 'Pickleball paddles, jump ropes, fitness gear, outdoor equipment, water sports, balls, athletic gear',
  pets: 'Pet toys, feeding equipment, pet care products, animal behavior, pet accessories',
  more: 'Everything else not covered by the above categories',
};

// ============ HEURISTIC CLASSIFICATION (600+ patterns) ============
const KEYWORD_RULES = [
  { type: 'industrial', patterns: [
    'valve', 'pipe', 'pump', 'crane', 'conveyor', 'hoist', 'compressor', 'motor', 'generator',
    'welding', 'grinding', 'milling', 'cnc', 'lathe', 'drill press', 'hydraulic', 'pneumatic',
    'bearing', 'gear', 'pulley', 'belt', 'chain', 'sprocket', 'coupling', 'flange',
    'boiler', 'heat exchanger', 'chiller', 'cooling tower', 'hvac', 'duct',
    'powder coating', 'optiflex', 'de-burr', 'deburring', 'sandblasting', 'shot blast',
    'excavator', 'bulldozer', 'forklift', 'loader', 'tractor', 'backhoe',
    'industrial', 'manufacturing', 'factory', 'machinery', 'machine tool',
    'ball valve', 'gate valve', 'check valve', 'butterfly valve', 'solenoid valve',
    'centrifugal pump', 'submersible pump', 'diaphragm pump', 'peristaltic pump',
    'air compressor', 'screw compressor', 'rotary compressor',
    'steel pipe', 'stainless pipe', 'pvc pipe', 'copper pipe', 'hose',
    'roller', 'idler', 'drum', 'belt conveyor', 'screw conveyor',
    'mixer', 'agitator', 'reactor', 'vessel', 'tank',
    'press', 'stamping', 'forging', 'casting', 'injection mold',
    'robot arm', 'cobots', 'plc', 'scada', 'automation',
  ]},
  { type: 'electronics', patterns: [
    'circuit', 'chip', 'semiconductor', 'transistor', 'mosfet', 'diode', 'capacitor', 'resistor',
    'pcb', 'fpga', 'microcontroller', 'arduino', 'raspberry pi', 'esp32',
    'gpu', 'cpu', 'ram', 'ssd', 'hdd', 'motherboard', 'graphics card',
    'display', 'oled', 'lcd', 'led panel', 'tft', 'touchscreen',
    'sensor', 'accelerometer', 'gyroscope', 'lidar', 'radar', 'ultrasonic',
    'rf', 'antenna', 'wifi', 'bluetooth', 'zigbee', 'lorawan', '5g module',
    'power supply', 'inverter', 'converter', 'voltage regulator', 'ups',
    'oscilloscope', 'multimeter', 'soldering', 'smd',
    'ic', 'integrated circuit', 'op-amp', 'adc', 'dac',
    'connector', 'usb', 'hdmi', 'ethernet', 'fiber optic',
    'battery', 'lithium', 'solar panel', 'photovoltaic',
    'speaker', 'amplifier', 'headphone', 'microphone',
    'camera module', 'ccd', 'cmos', 'image sensor',
    'smartphone', 'tablet', 'laptop', 'computer', 'monitor',
    'router', 'switch', 'modem', 'access point',
    'drone', 'quadcopter', 'fpv',
  ]},
  { type: 'materials', patterns: [
    'steel', 'stainless', 'aluminum', 'copper', 'brass', 'bronze', 'titanium', 'zinc',
    'plastic', 'polyethylene', 'polypropylene', 'pvc', 'ptfe', 'nylon', 'abs', 'polycarbonate',
    'rubber', 'silicone', 'epoxy', 'polyurethane', 'acrylic',
    'adhesive', 'glue', 'sealant', 'caulk', 'tape',
    'glass', 'ceramic', 'porcelain', 'marble', 'granite', 'quartz',
    'wood', 'plywood', 'mdf', 'particle board', 'bamboo', 'lumber',
    'fabric', 'textile', 'cotton', 'polyester', 'nylon fabric', 'denim', 'silk',
    'paper', 'cardboard', 'corrugated', 'kraft',
    'chemical', 'solvent', 'acid', 'alkali', 'catalyst', 'pigment', 'dye',
    'coating', 'paint', 'varnish', 'primer', 'powder',
    'cement', 'concrete', 'mortar', 'grout', 'plaster',
    'foam', 'insulation', 'fiberglass', 'mineral wool',
    'sheet', 'plate', 'coil', 'strip', 'wire', 'rod', 'bar', 'tube',
    'galvanized', 'chrome', 'nickel', 'tin', 'lead',
    'composite', 'carbon fiber', 'kevlar',
    'resin', 'polymer', 'monomer', 'granule', 'pellet',
    'sherpa', 'fleece', 'velvet', 'suede', 'leather',
  ]},
  { type: 'automotive', patterns: [
    'car', 'truck', 'suv', 'van', 'motorcycle', 'atv', 'utv',
    'engine', 'transmission', 'clutch', 'differential', 'axle',
    'turbo', 'supercharger', 'intercooler', 'exhaust', 'muffler', 'catalytic converter',
    'brake', 'brake pad', 'rotor', 'caliper', 'drum brake',
    'suspension', 'shock absorber', 'strut', 'spring', 'sway bar',
    'steering', 'tie rod', 'ball joint', 'rack and pinion',
    'tire', 'wheel', 'rim', 'hub', 'lug', 'spoke',
    'headlight', 'taillight', 'fog light', 'led light bar', 'harness',
    'bumper', 'fender', 'hood', 'grille', 'spoiler', 'body kit',
    'seat cover', 'floor mat', 'dashboard', 'console',
    'alternator', 'starter', 'ignition', 'spark plug',
    'oil filter', 'air filter', 'fuel filter', 'fuel pump', 'injector',
    'radiator', 'thermostat', 'water pump',
    'timing belt', 'serpentine belt',
    'gasket', 'seal', 'o-ring',
    'winch', 'tow', 'trailer', 'hitch',
    'off-road', '4x4', 'lift kit', 'skid plate',
    'obd', 'diagnostic', 'scanner automotive',
    'audi', 'bmw', 'toyota', 'honda', 'ford', 'chevrolet', 'mercedes', 'volkswagen',
    'racing', 'motorsport', 'drift', 'drag',
    'ev', 'electric vehicle', 'hybrid', 'charging station',
    'dashcam', 'car stereo', 'subwoofer', 'gps navigation',
  ]},
  { type: 'home', patterns: [
    'furniture', 'sofa', 'couch', 'chair', 'table', 'desk', 'bed', 'mattress',
    'lamp', 'lighting', 'chandelier', 'sconce', 'floor lamp', 'table lamp',
    'curtain', 'blind', 'drapery', 'valance', 'sheer',
    'rug', 'carpet', 'mat', 'doormat',
    'pillow', 'cushion', 'throw', 'blanket', 'quilt', 'duvet',
    'shelf', 'bookcase', 'cabinet', 'wardrobe', 'dresser', 'nightstand',
    'mirror', 'frame', 'wall art', 'canvas', 'print', 'poster',
    'vase', 'planter', 'pot', 'urn', 'decor', 'decoration', 'ornament',
    'candle', 'candle holder', 'lantern',
    'clock', 'wall clock', 'alarm clock',
    'basket', 'bin', 'organizer', 'storage',
    'garden', 'lawn', 'hose', 'sprinkler', 'irrigation',
    'fence', 'gate', 'trellis', 'arbor', 'pergola',
    'outdoor furniture', 'patio', 'hammock', 'swing',
    'bbq', 'grill', 'smoker', 'fire pit',
    'pool', 'spa', 'hot tub', 'sauna',
    'kitchen', 'cookware', 'pan', 'pot kitchen', 'utensil', 'knife',
    'appliance', 'blender', 'mixer', 'toaster', 'coffee maker',
    'bathroom', 'toilet', 'shower', 'faucet', 'sink', 'bathtub',
    'tile', 'flooring', 'wallpaper', 'molding',
    'drain', 'drainage', 'gutter', 'downspout',
    'christmas', 'holiday', 'wreath', 'garland', 'stocking',
    'porcelain doll', 'collectible',
    'end table', 'coffee table', 'dining table', 'side table', 'console table',
    'living room', 'bedroom', 'dining room', 'office furniture',
  ]},
  { type: 'fashion', patterns: [
    'dress', 'skirt', 'blouse', 'shirt', 't-shirt', 'polo', 'sweater', 'hoodie',
    'pants', 'jeans', 'trousers', 'shorts', 'leggings', 'joggers', 'cargo pants',
    'jacket', 'coat', 'blazer', 'vest', 'cardigan', 'parka', 'raincoat',
    'suit', 'tuxedo', 'formal wear',
    'shoe', 'boot', 'sneaker', 'sandal', 'slipper', 'heel', 'loafer', 'oxford',
    'bag', 'handbag', 'purse', 'backpack', 'tote', 'clutch', 'wallet',
    'jewelry', 'necklace', 'bracelet', 'ring', 'earring', 'pendant', 'brooch',
    'watch', 'smartwatch', 'fitness tracker',
    'sunglasses', 'glasses', 'eyewear', 'lens',
    'hat', 'cap', 'beanie', 'fedora', 'scarf', 'glove', 'belt',
    'tie', 'bow tie', 'cufflink', 'pocket square',
    'underwear', 'bra', 'panties', 'boxer', 'sock', 'hosiery',
    'swimwear', 'bikini', 'swimsuit', 'boardshort',
    'activewear', 'yoga pants', 'sports bra', 'compression',
    'uniform', 'scrub', 'lab coat', 'workwear',
    'bridal', 'wedding dress', 'veil', 'garter',
    'costume', 'cosplay', 'halloween',
  ]},
  { type: 'health', patterns: [
    'medical', 'hospital', 'clinical', 'surgical', 'patient',
    'doctor', 'nurse', 'pharmacy', 'prescription',
    'medicine', 'drug', 'pharmaceutical', 'pill', 'capsule', 'tablet',
    'supplement', 'vitamin', 'mineral', 'protein', 'amino acid',
    'fitness', 'exercise', 'workout', 'gym', 'training',
    'weight loss', 'diet', 'nutrition', 'calorie',
    'therapy', 'rehabilitation', 'physical therapy', 'occupational therapy',
    'massage', 'acupuncture', 'chiropractic',
    'blood pressure', 'heart rate', 'glucose', 'cholesterol',
    'dental', 'tooth', 'oral', 'braces', 'implant dental',
    'vision', 'eye', 'contact lens',
    'hearing', 'ear', 'hearing aid', 'cochlear',
    'nasogastric', 'catheter', 'stent', 'prosthetic', 'implant',
    'wheelchair', 'walker', 'crutch', 'cane', 'scooter medical',
    'bandage', 'dressing', 'suture', 'staple', 'gauze',
    'stethoscope', 'thermometer', 'pulse oximeter',
    'cpap', 'ventilator', 'oxygen', 'nebulizer',
    'first aid', 'emergency', 'trauma', 'rescue',
    'mental health', 'anxiety', 'depression', 'meditation', 'mindfulness',
    'sleep', 'insomnia', 'melatonin',
    'skin care', 'skincare', 'dermatology', 'sunscreen', 'moisturizer',
    'hair care', 'shampoo', 'conditioner', 'hair loss',
    'tear duct', 'watering eye', 'blocked tear',
    'resistance band', 'foam roller', 'yoga mat',
    'treadmill', 'elliptical', 'stationary bike', 'rowing machine',
  ]},
  { type: 'food', patterns: [
    'food', 'beverage', 'drink', 'juice', 'coffee', 'tea', 'wine', 'beer',
    'restaurant', 'cafe', 'catering', 'kitchen commercial',
    'cooking', 'baking', 'recipe', 'ingredient',
    'packaging food', 'container', 'bottle', 'can', 'jar', 'pouch',
    'organic', 'gluten free', 'vegan', 'vegetarian', 'keto',
    'dairy', 'cheese', 'milk', 'yogurt', 'butter',
    'meat', 'poultry', 'fish', 'seafood', 'beef', 'pork', 'chicken',
    'grain', 'rice', 'wheat', 'oat', 'quinoa', 'barley',
    'spice', 'herb', 'seasoning', 'salt', 'pepper',
    'sauce', 'condiment', 'dressing', 'marinade',
    'snack', 'candy', 'chocolate', 'cookie', 'cracker',
    'frozen', 'refrigerated', 'shelf stable',
    'canned', 'preserved', 'dried', 'dehydrated',
    'flour', 'sugar', 'sweetener', 'honey',
    'oil cooking', 'olive oil', 'coconut oil', 'vegetable oil',
    'juicer', 'blender commercial', 'espresso machine', 'ice maker',
    'oven', 'stove', 'range', 'fryer', 'griddle',
    'dishwasher', 'refrigerator', 'freezer', 'cooler',
    'utensil commercial', 'cutlery', 'flatware', 'glassware',
    'tablecloth', 'napkin', 'placemat',
    'vending machine', 'food truck',
  ]},
  { type: 'sports', patterns: [
    'sport', 'athletic', 'fitness equipment', 'gym equipment',
    'ball', 'football', 'soccer', 'basketball', 'baseball', 'volleyball', 'tennis',
    'golf', 'club golf', 'putter', 'driver', 'golf bag',
    'pickleball', 'paddle', 'racquet', 'racket',
    'bat', 'helmet', 'glove sport', 'cleat',
    'swim', 'swimming', 'goggle', 'snorkel', 'wetsuit',
    'surf', 'surfboard', 'kayak', 'canoe', 'paddleboard',
    'ski', 'snowboard', 'skiing', 'snowboarding',
    'bike', 'bicycle', 'cycling', 'mountain bike', 'road bike',
    'climb', 'climbing', 'harness', 'carabiner', 'rope climbing',
    'camp', 'camping', 'tent', 'sleeping bag', 'backpack outdoor',
    'hike', 'hiking', 'trek', 'trail',
    'fish', 'fishing', 'reel', 'rod fishing', 'tackle', 'lure',
    'hunt', 'hunting', 'scope', 'binocular', 'camo',
    'jump rope', 'skipping rope',
    'yoga', 'pilates', 'stretch',
    'boxing', 'mma', 'martial art', 'kickbox',
    'crossfit', 'weightlifting', 'powerlifting',
    'run', 'running', 'jog', 'marathon', 'trail running',
    'skateboard', 'roller', 'scooter sport',
    'archery', 'bow', 'arrow',
    'overgrip', 'tennis grip',
  ]},
  { type: 'pets', patterns: [
    'pet', 'dog', 'cat', 'puppy', 'kitten',
    'bird', 'parrot', 'parakeet', 'canary', 'cockatiel',
    'fish aquarium', 'aquarium', 'fish tank', 'filter aquarium',
    'hamster', 'guinea pig', 'rabbit', 'gerbil', 'ferret',
    'reptile', 'snake', 'lizard', 'turtle', 'tortoise', 'gecko',
    'horse', 'equine', 'saddle', 'bridle', 'hoof',
    'leash', 'collar', 'harness pet', 'crate', 'kennel', 'carrier',
    'pet food', 'dog food', 'cat food', 'treat', 'biscuit',
    'pet toy', 'chew toy', 'cat toy', 'dog toy',
    'litter', 'cat litter', 'litter box',
    'grooming', 'pet shampoo', 'brush pet', 'nail clipper',
    'bed pet', 'pet blanket', 'pet house',
    'flea', 'tick', 'parasite', 'dewormer',
    'bowl', 'feeder', 'water dispenser', 'fountain pet',
    'training', 'clicker', 'whistle', 'fence pet',
    'aquarium plant', 'coral', 'reef', 'substrate',
    'terrarium', 'vivarium', 'heat lamp', 'uvb',
    'bird cage', 'perch', 'bird seed', 'nest',
  ]},
];

function heuristicClassify(keyword) {
  const lower = keyword.toLowerCase();
  let bestType = null;
  let bestScore = 0;
  for (const rule of KEYWORD_RULES) {
    let score = 0;
    for (const p of rule.patterns) {
      if (lower.includes(p)) score += p.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = rule.type;
    }
  }
  if (bestScore >= 4) return bestType;
  return null; // needs LLM
}

// ============ LLM CLASSIFICATION ============
let dashscopeKeys = [];
let keyIndex = 0;

function loadDashScopeKeys() {
  try {
    const auth = JSON.parse(fs.readFileSync('/root/.hermes/auth.json', 'utf8'));
    const pool = auth.credential_pool?.alibaba || {};
    dashscopeKeys = Object.values(pool).map(c => c.access_token).filter(Boolean);
  } catch {
    dashscopeKeys = [];
  }
}

function classifyBatch(keywords) {
  return new Promise((resolve) => {
    const apiKey = dashscopeKeys.length > 0
      ? dashscopeKeys[keyIndex++ % dashscopeKeys.length]
      : null;
    if (!apiKey) return resolve(keywords.map(k => ({ keyword: k, category: 'more' })));

    const catList = Object.entries(CATEGORIES_DESC).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    const prompt = `Classify each keyword into exactly ONE category. Return ONLY a JSON array: [{"keyword":"...","category":"..."}]

Categories:
${catList}

Rules: Use "more" only when nothing else fits. No explanation, no markdown.

Keywords:
${keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}`;

    const body = JSON.stringify({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const req = https.request(DASHSCOPE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      timeout: 60000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content || '';
          const match = content.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            resolve(parsed.map(p => ({
              keyword: p.keyword,
              category: VALID_TYPES.includes(p.category) ? p.category : 'more',
            })));
          } else {
            resolve(keywords.map(k => ({ keyword: k, category: 'more' })));
          }
        } catch {
          resolve(keywords.map(k => ({ keyword: k, category: 'more' })));
        }
      });
    });
    req.on('error', () => resolve(keywords.map(k => ({ keyword: k, category: 'more' }))));
    req.write(body);
    req.end();
  });
}

// ============ SMARTBUY API ============
function fetchField(keyType, keyword) {
  return new Promise((resolve) => {
    const key = `${keyType}|${keyword}`;
    const url = `${SMARTBUY_BASE}?key=${encodeURIComponent(key)}`;
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: API_TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.trim()));
      res.on('error', () => resolve(''));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

// ============ HELPERS ============
function makeSlug(keyword) {
  return keyword.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanBody(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/\s*class="one-[^"]*"/gi, '');
}

// ============ STATE ============
let stats = {
  processed: 0,
  inserted: 0,
  updated: 0,
  skipped: 0,
  apiFailed: 0,
  noBody: 0,
  errors: 0,
  heuristic: 0,
  llm: 0,
  startTime: Date.now(),
};

let authors = [];
let insertBuffer = [];
let updateBuffer = [];

// ============ PROGRESS ============
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return parseInt(fs.readFileSync(PROGRESS_FILE, 'utf8')) || 0;
  }
  return 0;
}

function saveProgress(lineNum) {
  fs.writeFileSync(PROGRESS_FILE, String(lineNum));
}

function saveSummary() {
  const elapsed = ((Date.now() - stats.startTime) / 1000);
  const summary = {
    ...stats,
    indexnowSubmitted,
    indexnowFailed,
    elapsedSec: parseFloat(elapsed.toFixed(1)),
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
}

function printStats(lineNum) {
  const elapsed = (Date.now() - stats.startTime) / 1000 / 60;
  const rate = (stats.processed / (elapsed * 60 || 1)).toFixed(0);
  console.log(
    `[Line ${lineNum}] Inserted:${stats.inserted} Updated:${stats.updated} Skipped:${stats.skipped} ` +
    `API-Fail:${stats.apiFailed} NoBody:${stats.noBody} Err:${stats.errors} | ` +
    `Heur:${stats.heuristic} LLM:${stats.llm} | ` +
    `IndexNow:${indexnowSubmitted}/${indexnowFailed} | ` +
    `${elapsed.toFixed(1)}min | ${rate}/sec`
  );
}

// ============ DB OPERATIONS ============
async function flushUpdates(pool) {
  if (updateBuffer.length === 0) return;
  const batch = updateBuffer.splice(0);
  for (let i = 0; i < batch.length; i += UPDATE_BATCH) {
    const chunk = batch.slice(i, i + UPDATE_BATCH);
    const titleCases = chunk.map(u => `WHEN id = ${u.id} THEN ?`).join(' ');
    const descCases = chunk.map(u => `WHEN id = ${u.id} THEN ?`).join(' ');
    const ids = chunk.map(u => u.id);
    const params = [...chunk.map(u => u.title), ...chunk.map(u => u.description)];
    await pool.query(
      `UPDATE articles SET title = CASE ${titleCases} END, description = CASE ${descCases} END WHERE id IN (${ids.join(',')})`,
      params
    );
  }
}

async function flushInserts(pool, force = false) {
  if (insertBuffer.length < INSERT_BATCH && !force) return;
  const chunk = insertBuffer.splice(0, INSERT_BATCH);
  const keywords = chunk.map(c => c.keyword);

  // Classify: heuristic first, LLM for rest
  const heuristicKws = [];
  const heuristicTypes = [];
  const llmKws = [];

  for (const kw of keywords) {
    const type = heuristicClassify(kw);
    if (type) {
      heuristicKws.push(kw);
      heuristicTypes.push(type);
      stats.heuristic++;
    } else {
      llmKws.push(kw);
    }
  }

  let llmClassified = [];
  if (llmKws.length > 0) {
    llmClassified = await classifyBatch(llmKws);
    stats.llm += llmKws.length;
  }
  const llmMap = new Map(llmClassified.map(c => [c.keyword, c.category]));

  // Build rows
  const rows = chunk.map(c => {
    let type;
    if (heuristicKws.includes(c.keyword)) {
      const idx = heuristicKws.indexOf(c.keyword);
      type = heuristicTypes[idx];
    } else {
      type = llmMap.get(c.keyword) || 'more';
    }
    if (!VALID_TYPES.includes(type)) type = 'more';
    return {
      slug: c.slug,
      title: c.title,
      description: c.description,
      body: c.body,
      type,
      author: authors[Math.floor(Math.random() * authors.length)],
    };
  });

  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(',\n');
  const values = rows.flatMap(r => [SITE, r.slug, r.title, r.body, r.description, r.type, 'en', r.author, 'Y']);

  await pool.query(
    `INSERT INTO articles (site, short_title, title, body, description, type, language, author, is_online, published_time, modified_time)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE title=VALUES(title), body=VALUES(body), description=VALUES(description), type=VALUES(type), author=VALUES(author), modified_time=NOW()`,
    values
  );

  stats.inserted += rows.length;

  // Collect URLs for IndexNow
  for (const r of rows) {
    indexnowBuffer.push(`https://${DOMAIN}/${r.type}/${r.slug}`);
  }
}

// ============ PROCESS SINGLE ITEM ============
async function processItem(keyword, slug, dbMap, pool) {
  const existing = dbMap.get(slug);

  try {
    if (existing) {
      // Existing: fetch title + desc only (no body needed)
      const [title, desc] = await Promise.all([
        fetchField('_seo_product_insights_title', keyword),
        fetchField('_seo_product_insights_desc', keyword),
      ]);

      if (!title && !desc) { stats.processed++; stats.apiFailed++; return; }

      // Use longer version — no truncation
      const newTitle = (!title || title.length <= existing.title.length) ? existing.title : title;
      const newDesc = (!desc || desc.length <= existing.description.length) ? existing.description : desc;

      if (newTitle === existing.title && newDesc === existing.description) {
        stats.processed++; stats.skipped++; return;
      }

      updateBuffer.push({ id: existing.id, title: newTitle, description: newDesc });
      existing.title = newTitle;
      existing.description = newDesc;
      stats.processed++;

      if (updateBuffer.length >= UPDATE_BATCH) {
        await flushUpdates(pool);
        stats.updated += UPDATE_BATCH;
      }
    } else {
      // New: fetch title + desc + body
      const [title, desc, body] = await Promise.all([
        fetchField('_seo_product_insights_title', keyword),
        fetchField('_seo_product_insights_desc', keyword),
        fetchField('_seo_product_insights_content', keyword),
      ]);

      if (!body || body.length < 100) { stats.processed++; stats.noBody++; return; }

      const cleanHtml = cleanBody(body);

      insertBuffer.push({
        slug,
        keyword,
        title: title || keyword,
        description: desc || '',
        body: cleanHtml,
      });
      // Pre-add to dbMap so concurrent workers don't duplicate
      dbMap.set(slug, { id: 0, title: title || keyword, description: desc || '' });
      stats.processed++;

      if (insertBuffer.length >= INSERT_BATCH) {
        await flushInserts(pool);
      }
    }
  } catch (e) {
    stats.processed++;
    stats.errors++;
  }
}

// ============ MAIN ============
(async () => {
  const url = process.env.MYSQL_URL;
  if (!url) { console.error('MYSQL_URL not set'); process.exit(1); }

  const u = new URL(url);
  const pool = mysql.createPool({
    host: u.hostname, port: parseInt(u.port || '3306'),
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    waitForConnections: true, connectionLimit: 10, queueLimit: 0,
  });

  // Load authors
  const [authorRows] = await pool.query("SELECT name FROM authors WHERE site = ? AND slug != 'team'", [SITE]);
  authors = authorRows.map(a => a.name);
  if (authors.length === 0) { console.error('No authors found'); process.exit(1); }

  // Load existing articles into Map
  console.log('Loading existing articles...');
  const [articles] = await pool.query(
    "SELECT id, short_title, title, description FROM articles WHERE site = ?", [SITE]
  );
  const dbMap = new Map();
  for (const a of articles) {
    dbMap.set(a.short_title, { id: a.id, title: a.title, description: a.description });
  }

  // Load DashScope keys
  loadDashScopeKeys();

  // Resume
  const resumeFrom = loadProgress();

  console.log(`\n${'='.repeat(55)}`);
  console.log(`  CommercialToolry Mass Import`);
  console.log(`${'='.repeat(55)}`);
  console.log(`  Authors:       ${authors.length} (${authors.slice(0, 3).join(', ')}...)`);
  console.log(`  Existing DB:   ${dbMap.size} articles`);
  console.log(`  Resume from:   line ${resumeFrom}`);
  console.log(`  Concurrency:   ${CONCURRENCY} workers`);
  console.log(`  DashScope keys:${dashscopeKeys.length}`);
  console.log(`  IndexNow key:  ${INDEXNOW_KEY}`);
  console.log(`  Keyword file:  ${KEYWORD_FILE}`);
  console.log(`${'='.repeat(55)}\n`);

  // Stream keywords
  console.log('Loading keywords...');
  const allLines = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(KEYWORD_FILE),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum <= resumeFrom) continue;
    const kw = line.trim();
    if (kw) allLines.push(kw);
  }
  console.log(`Keywords to process: ${allLines.length}`);
  console.log('');

  // Worker pool
  let queueIndex = 0;
  let lastReport = 0;

  async function worker(id) {
    while (true) {
      const idx = queueIndex++;
      if (idx >= allLines.length) return;

      const kw = allLines[idx];
      const slug = makeSlug(kw);
      await processItem(kw, slug, dbMap, pool);

      const processed = stats.processed;
      if (processed - lastReport >= REPORT_EVERY) {
        lastReport = processed;
        // Flush buffers
        if (updateBuffer.length > 0) {
          const remaining = updateBuffer.length;
          await flushUpdates(pool);
          stats.updated += remaining;
        }
        if (insertBuffer.length > 0) {
          await flushInserts(pool, true);
        }
        await flushIndexNow();
        printStats(resumeFrom + processed);
        saveSummary();
        saveProgress(resumeFrom + processed);
      }
    }
  }

  // Launch all workers
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker(i));
  }
  await Promise.all(workers);

  // Flush remaining
  if (updateBuffer.length > 0) {
    const remaining = updateBuffer.length;
    await flushUpdates(pool);
    stats.updated += remaining;
  }
  while (insertBuffer.length > 0) {
    await flushInserts(pool, true);
  }
  await flushIndexNow();
  saveProgress(resumeFrom + stats.processed);

  // Final summary
  stats.status = 'done';
  saveSummary();

  const elapsed = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  console.log(`\n${'='.repeat(55)}`);
  console.log(`  IMPORT COMPLETE`);
  console.log(`${'='.repeat(55)}`);
  console.log(`  Processed:  ${stats.processed}`);
  console.log(`  Inserted:   ${stats.inserted}`);
  console.log(`  Updated:    ${stats.updated}`);
  console.log(`  Skipped:    ${stats.skipped}`);
  console.log(`  API-Fail:   ${stats.apiFailed}`);
  console.log(`  No Body:    ${stats.noBody}`);
  console.log(`  Errors:     ${stats.errors}`);
  console.log(`  Heuristic:  ${stats.heuristic}`);
  console.log(`  LLM:        ${stats.llm}`);
  console.log(`  IndexNow:   ${indexnowSubmitted} submitted, ${indexnowFailed} failed`);
  console.log(`  Time:       ${elapsed} min`);
  console.log(`${'='.repeat(55)}`);

  // Final DB verification
  const [finalRows] = await pool.query(
    "SELECT type, COUNT(*) as cnt FROM articles WHERE site=? AND is_online='Y' GROUP BY type ORDER BY cnt DESC",
    [SITE]
  );
  console.log('\nFinal DB state:');
  finalRows.forEach(r => console.log(`  ${r.type}: ${r.cnt}`));
  const totalRow = finalRows.reduce((s, r) => s + Number(r.cnt), 0);
  console.log(`  TOTAL: ${totalRow}`);

  await pool.end();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
