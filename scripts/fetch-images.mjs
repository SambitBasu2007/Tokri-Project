// ============================================================================
// Tokri — product image fetcher (run by hand, never in the browser)
//
// Open Food Facts facts:
//   • database: ODbL     • product images: CC BY-SA
//   • reads need no key, but require a custom User-Agent
//   • rate limits are enforced, so wait ~1s between calls
//   • fresh produce often has no usable image — add your own photo instead
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   OFF_CONTACT=you@example.com node scripts/fetch-images.mjs --dry-run
//
// Never commit the service-role key or use it in the Vite client.
// ============================================================================
import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dryRun = process.argv.includes('--dry-run');
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contact = process.env.OFF_CONTACT || 'contact@example.com';
const userAgent = `Tokri/1.0 (${contact})`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const imagesDir = fileURLToPath(new URL('../public/images/', import.meta.url));

if (!dryRun && (!url || !serviceKey)) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use --dry-run.');
  process.exit(1);
}

const supabase = dryRun ? null : createClient(url, serviceKey, { auth: { persistSession: false } });

async function fetchProductRows() {
  if (dryRun) {
    const { readFile } = await import('node:fs/promises');
    const data = JSON.parse(
      await readFile(new URL('../src/data/catalog.fallback.json', import.meta.url), 'utf8'),
    );
    return data.products.map((p) => ({ ...p, image_url: p.imageUrl, barcode: p.barcode }));
  }
  const { data, error } = await supabase
    .from('products')
    .select('id, name, barcode, image_url')
    .order('id');
  if (error) throw error;
  return data;
}

async function findOpenFoodFactsImage(barcode) {
  const endpoint = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,image_front_url`;
  const res = await fetch(endpoint, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
  if (res.status === 429) throw new Error('Rate limited by Open Food Facts — wait and retry.');
  if (!res.ok) return null;
  const body = await res.json();
  if (body.status !== 1 || !body.product?.image_front_url) return null;
  return {
    imageUrl: body.product.image_front_url,
    creditUrl: `https://world.openfoodfacts.org/product/${barcode}`,
  };
}

async function main() {
  const products = await fetchProductRows();
  let updated = 0;

  for (const product of products) {
    if (product.image_url) continue;

    const local = `${imagesDir}${product.id}.jpg`;
    if (existsSync(local)) {
      const path = `/images/${product.id}.jpg`;
      console.log(`${product.id} ${product.name}: using local ${path}`);
      if (!dryRun) {
        const { error } = await supabase
          .from('products')
          .update({ image_url: path, image_credit_url: null })
          .eq('id', product.id);
        if (error) console.error(`  update failed: ${error.message}`);
        else updated += 1;
      }
      continue;
    }

    if (!product.barcode) {
      console.log(`${product.id} ${product.name}: no barcode, no local photo — placeholder will show`);
      continue;
    }

    try {
      const image = await findOpenFoodFactsImage(product.barcode);
      if (!image) {
        console.log(`${product.id} ${product.name}: no OFF front image`);
      } else {
        console.log(`${product.id} ${product.name}: ${image.imageUrl}`);
        if (!dryRun) {
          const { error } = await supabase
            .from('products')
            .update({ image_url: image.imageUrl, image_credit_url: image.creditUrl })
            .eq('id', product.id);
          if (error) console.error(`  update failed: ${error.message}`);
          else updated += 1;
        }
      }
    } catch (err) {
      console.error(`${product.id} ${product.name}: ${err.message}`);
    } finally {
      await wait(1000);
    }
  }

  console.log(`Done. ${updated} product image${updated === 1 ? '' : 's'} updated.`);
  console.log('Attribution: product images from Open Food Facts contributors, CC BY-SA.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
