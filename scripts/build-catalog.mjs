// Build the local catalog and product images.
//
//   node scripts/build-catalog.mjs                 # search + download + normalize
//   node scripts/build-catalog.mjs --search-only   # only refresh Bing candidates
//   node scripts/build-catalog.mjs --download-only # re-download chosen candidates
//   node scripts/build-catalog.mjs --only=12,44    # work on a few IDs
//   node scripts/build-catalog.mjs --refresh       # ignore cached search results
//
// Image sources are cached in scripts/image-sources.json so a failed download
// can be retried without querying Bing again. The chosen candidate can be
// changed by editing that file (or by deleting its `selected` object) and
// running with --download-only.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stores, sourceProducts } from './catalog-source.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const imagesDir = `${root}/public/images`;
const sourcesPath = `${root}/scripts/image-sources.json`;
const legacyPrices = JSON.parse(readFileSync(`${root}/scripts/legacy-prices.json`, 'utf8'));
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const onlyArg = args.find((arg) => arg.startsWith('--only='));
const only = onlyArg
  ? new Set(onlyArg.slice('--only='.length).split(',').map((value) => Number(value.trim())))
  : null;
const searchOnly = flag('search-only');
const downloadOnly = flag('download-only');
const refresh = flag('refresh');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const preferredHosts = [
  { host: 'm.media-amazon.com', score: 60 },
  { host: 'bbassets.com', score: 55 },
  { host: 'jiomart.com', score: 50 },
  { host: 'mystore.in', score: 45 },
  { host: 'bigbasket.com', score: 45 },
  { host: 'amazon.in', score: 35 },
  { host: 'flipkart.com', score: 25 },
  { host: 'dmart', score: 20 },
  { host: 'reliancedigital', score: 20 },
  { host: 'bigtrolley', score: 15 },
];

const badHosts = [
  'imimg.com',
  'indiamart.com',
  'aliexpress.com',
  'walmart.com',
  'ebay.',
  'shopee.',
  'pinterest.',
  'facebook.com',
  'instagram.com',
  'youtube.com',
  'blogspot.',
];

const htmlDecode = (value) =>
  value
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

function normalizeUrl(value) {
  if (!value) return null;
  try {
    return value.startsWith('//') ? `https:${value}` : value;
  } catch {
    return null;
  }
}

function sizeToken(weight) {
  const lower = weight.toLowerCase().replaceAll(' ', '');
  const match = lower.match(/(\d+(?:\.\d+)?)(kg|g|ml|l|pc|pcs|pack|dozen)/);
  if (!match) return null;
  return `${match[1]}${match[2].replace(/^pcs?$/, 'pc')}`;
}

function scoreCandidate(candidate, product) {
  const title = (candidate.title ?? '').toLowerCase();
  const image = (candidate.imageUrl ?? '').toLowerCase();
  const page = (candidate.pageUrl ?? '').toLowerCase();
  if (!image || !/^https?:/i.test(candidate.imageUrl)) return -Infinity;
  if (/\.(svg|gif)(\?|$)/i.test(image)) return -Infinity;

  let score = 0;
  for (const { host, score: bump } of preferredHosts) {
    if (image.includes(host) || page.includes(host)) score += bump;
  }
  for (const host of badHosts) {
    if (image.includes(host) || page.includes(host)) score -= 45;
  }

  const queryTokens = product.query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9.]+/g, ''))
    .filter((token) => token.length > 2);
  for (const token of queryTokens) {
    if (title.includes(token)) score += 3;
  }

  const brand = queryTokens[0];
  if (brand && title.includes(brand)) score += 18;

  const size = sizeToken(product.weight);
  if (size && title.replaceAll(' ', '').includes(size)) score += 14;
  if (size && !title.includes(size.replace(/(kg|g|ml|l)$/, ''))) score -= 2;

  const allowMultipack =
    /(pack of|combo|set of|family|4[- ]?pack|multipack|count|rolls)/i.test(product.query) ||
    /(family pack|4-pack|4 pack)/i.test(product.name);
  const looksMultipack =
    /(pack of|combo|set of|case of|carton of|\d+\s*x\s*\d+|\b\d+\s*er\s*pack|multipack|\b\d+\s*packs?\b|\b\d+\s*count\b|\b\d+\s*rolls?\b)/i.test(
      title,
    );
  if (looksMultipack && !allowMultipack) score -= 80;
  if (/(pack of|combo|set of)/i.test(product.query)) score += 20;
  if (/(front|packshot|product)/i.test(title)) score += 3;
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(image)) score += 3;
  if (image.includes('m.media-amazon.com')) score += 8;
  if (image.includes('bbassets.com')) score += 8;
  if (/amazon\.in/i.test(page)) score += 30;
  if (/bigbasket\.com/i.test(page)) score += 25;
  if (/jiomart\.com/i.test(page)) score += 20;
  if (/mystore\.in/i.test(page)) score += 20;
  if (/flipkart\.com/i.test(page)) score += 15;
  if (/amazon\.(?:de|co\.uk|com|ae|sg|ca|fr|it|es)/i.test(page)) score -= 25;
  return score;
}

async function searchBing(product) {
  const url =
    'https://www.bing.com/images/search?q=' +
    encodeURIComponent(product.query) +
    '&form=HDRSC2&first=1&qft=+filterui:imagesize-large';
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': UA,
          'accept-language': 'en-IN,en;q=0.9',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (!res.ok) throw new Error(`Bing returned ${res.status}`);
      const html = await res.text();
      if (/captcha|unusual traffic/i.test(html) && html.length < 200000) {
        throw new Error('Bing challenge page');
      }
      const matches = [...html.matchAll(/class="iusc"[^>]*m="([^"]+)"/g)];
      const candidates = [];
      for (const match of matches) {
        try {
          const data = JSON.parse(htmlDecode(match[1]));
          const imageUrl = normalizeUrl(data.murl);
          if (!imageUrl) continue;
          candidates.push({
            title: htmlDecode(data.t ?? ''),
            imageUrl,
            pageUrl: normalizeUrl(data.purl),
            thumbnail: normalizeUrl(data.turl),
          });
        } catch {
          // Ignore malformed cards; Bing occasionally embeds non-JSON metadata.
        }
      }
      if (!candidates.length) throw new Error('No image results parsed');
      for (const candidate of candidates) candidate.score = scoreCandidate(candidate, product);
      candidates.sort((a, b) => b.score - a.score);
      return candidates.slice(0, 12);
    } catch (error) {
      lastError = error;
      await sleep(1800 * (attempt + 1));
    }
  }
  throw lastError;
}

async function downloadImage(candidate) {
  const res = await fetch(candidate.imageUrl, {
    headers: {
      'user-agent': UA,
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      referer: candidate.pageUrl ?? 'https://www.bing.com/',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`image HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('svg')) throw new Error('SVG image');
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 2500) throw new Error(`image too small (${bytes.length} bytes)`);
  return bytes;
}

function normalizeImage(inputPath, outputPath) {
  try {
    execFileSync(
      'magick',
      [
        inputPath,
        '-auto-orient',
        '-background',
        'white',
        '-alpha',
        'remove',
        '-alpha',
        'off',
        '-colorspace',
        'sRGB',
        '-fuzz',
        '7%',
        '-trim',
        '+repage',
        '-resize',
        '820x820',
        '-background',
        'white',
        '-gravity',
        'center',
        '-extent',
        '1000x1000',
        '-strip',
        '-quality',
        '88',
        outputPath,
      ],
      { stdio: 'pipe' },
    );
    const size = execFileSync('magick', ['identify', '-format', '%w %h', outputPath], {
      encoding: 'utf8',
    }).trim();
    if (size !== '1000 1000') throw new Error(`unexpected output size ${size}`);
  } catch (error) {
    if (existsSync(outputPath)) unlinkSync(outputPath);
    throw error;
  }
}

function loadSources() {
  if (!existsSync(sourcesPath)) return {};
  return JSON.parse(readFileSync(sourcesPath, 'utf8'));
}

function saveSources(sources) {
  writeFileSync(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`);
}

function selectedFor(product, entry) {
  if (entry?.selected?.imageUrl) return entry.selected;
  return entry?.candidates?.[0] ?? null;
}

async function fetchOne(product, id, sources, forceRefresh) {
  if (!forceRefresh && sources[id]?.candidates?.length) return sources[id];
  const candidates = await searchBing(product);
  sources[id] = {
    id,
    name: product.name,
    query: product.query,
    selected: candidates[0],
    candidates,
  };
  console.log(
    `search ${String(id).padStart(3, '0')} ${product.name}: ${candidates[0]?.title?.slice(0, 70) ?? 'none'}`,
  );
  return sources[id];
}

function simulatePrices(id, product) {
  const ranges = {
    dairy: [0.95, 1.0],
    bakery: [0.94, 1.0],
    atta: [0.86, 0.97],
    oil: [0.86, 0.96],
    fruits: [0.85, 1.0],
    vegetables: [0.82, 1.0],
    snacks: [0.82, 0.95],
    beverages: [0.82, 0.95],
    instant: [0.86, 0.96],
    personal: [0.8, 0.92],
    cleaning: [0.78, 0.92],
    household: [0.82, 0.95],
    health: [0.84, 0.95],
  };
  const base = {
    blinkit: 0.91,
    zepto: 0.89,
    swiggy: 0.93,
    bigbasket: 0.86,
    jiomart: 0.84,
    flipkart: 0.89,
  };
  const [min, max] = ranges[product.category] ?? [0.85, 0.97];
  const prices = {};
  stores.forEach((store, index) => {
    const jitter = (((id * 37 + index * 53) % 100) / 100 - 0.5) * 0.06;
    const factor = Math.min(max, Math.max(min, base[store.id] + jitter));
    const price = Math.max(1, Math.min(product.mrp, Math.round(product.mrp * factor)));
    const inStock = (id * 13 + index * 7) % 23 !== 0;
    prices[store.id] = { price, inStock };
  });
  if (!Object.values(prices).some((entry) => entry.inStock)) prices.blinkit.inStock = true;
  return prices;
}

function writeCatalog(sources) {
  const products = sourceProducts.map((product, index) => {
    const id = index + 1;
    const source = selectedFor(product, sources[id]);
    const prices = id <= 18 && legacyPrices[id] ? legacyPrices[id] : simulatePrices(id, product);
    return {
      id,
      name: product.name,
      category: product.category,
      weight: product.weight,
      mrp: product.mrp,
      unitQty: product.unitQty,
      unit: product.unit,
      barcode: null,
      imageUrl: existsSync(`${imagesDir}/${id}.jpg`) ? `/images/${id}.jpg` : null,
      imageCreditUrl: source?.pageUrl ?? source?.imageUrl ?? null,
      prices,
    };
  });

  const catalog = { stores, products };
  writeFileSync(`${root}/src/data/catalog.fallback.json`, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`wrote catalog with ${products.length} products`);

  const hostLabel = (url) => {
    if (!url) return '—';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'source';
    }
  };

  const rows = products.map((product) => {
    const source = selectedFor(product, sources[product.id]);
    const label = hostLabel(source?.pageUrl ?? source?.imageUrl);
    const link = source?.pageUrl ?? source?.imageUrl;
    const name = product.name.replaceAll('|', '\\|');
    return `| ${product.id} | ${name} | ${product.weight.replaceAll('|', '\\|')} | ${link ? `[${label}](${link})` : '—'} |`;
  });

  const credits = `# Product image credits

The images in this folder are local copies of retailer and brand product
packshots. They are used only for this non-commercial demo. Packaging,
trademarks and product photography remain the property of their respective
owners.

| # | Product | Pack | Source |
|---|---------|------|--------|
${rows.join('\n')}

Images are normalized to a 1:1 white canvas for a consistent grid. The source
link on each product page points to the listing the image was found on. If you
replace an image, update \`imageCreditUrl\` in
\`src/data/catalog.fallback.json\` and re-run
\`node scripts/generate-seed-sql.mjs\`.
`;
  writeFileSync(`${imagesDir}/CREDITS.md`, credits);
  console.log('wrote public/images/CREDITS.md');
}

async function main() {
  mkdirSync(imagesDir, { recursive: true });
  const sources = downloadOnly ? loadSources() : loadSources();
  if (downloadOnly && !Object.keys(sources).length) {
    throw new Error('No cached image sources. Run without --download-only first.');
  }

  const ids = sourceProducts
    .map((product, index) => ({ product, id: index + 1 }))
    .filter(({ id }) => !only || only.has(id));

  if (searchOnly) {
    for (let i = 0; i < ids.length; i += 1) {
      const { product, id } = ids[i];
      try {
        await fetchOne(product, id, sources, refresh);
        saveSources(sources);
      } catch (error) {
        console.error(`search failed ${id} ${product.name}: ${error.message}`);
      }
      if (i < ids.length - 1) await sleep(1100);
    }
    return;
  }

  for (let i = 0; i < ids.length; i += 1) {
    const { product, id } = ids[i];
    const output = `${imagesDir}/${id}.jpg`;
    let entry = sources[id];
    if (!downloadOnly) {
      try {
        entry = await fetchOne(product, id, sources, refresh);
        saveSources(sources);
      } catch (error) {
        console.error(`search failed ${id} ${product.name}: ${error.message}`);
      }
      if (i < ids.length - 1) await sleep(700);
    }

    const selected = selectedFor(product, entry);
    if (!selected) {
      console.error(`no image candidate for ${id} ${product.name}`);
      continue;
    }

    let downloaded = false;
    const candidates = [selected, ...(entry?.candidates ?? []).filter((c) => c.imageUrl !== selected.imageUrl)];
    for (const candidate of candidates.slice(0, 6)) {
      const temp = `${imagesDir}/.${id}.download`;
      try {
        const bytes = await downloadImage(candidate);
        writeFileSync(temp, bytes);
        normalizeImage(temp, output);
        if (entry) entry.selected = candidate;
        downloaded = true;
        console.log(`image ${String(id).padStart(3, '0')} ${product.name}: ${candidate.title?.slice(0, 60) ?? candidate.imageUrl}`);
        break;
      } catch (error) {
        console.error(`  candidate failed: ${error.message}`);
      } finally {
        if (existsSync(temp)) unlinkSync(temp);
      }
    }
    if (!downloaded) console.error(`image failed ${id} ${product.name}`);
    saveSources(sources);
  }

  writeCatalog(sources);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
