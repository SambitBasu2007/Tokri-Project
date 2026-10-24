/**
 * Read-only verification of the Tokri V2 database shape.
 *
 * Usage: npm run db:check
 *
 * The publishable/anon key can only read public objects; this script never
 * writes. A missing table or column means the matching migration has not been
 * applied yet, so device-only orders will not converge between devices.
 */
import { readFileSync } from 'node:fs';

function readEnv() {
  for (const file of ['.env.local', '.env.production']) {
    try {
      const text = readFileSync(file, 'utf8');
      const values = Object.fromEntries(
        text
          .split(/\r?\n/)
          .filter((line) => line && !line.startsWith('#') && line.includes('='))
          .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
      );
      if (values.VITE_SUPABASE_URL && values.VITE_SUPABASE_ANON_KEY) return values;
    } catch {
      // Try the next file.
    }
  }
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.');
}

const env = readEnv();
const headers = {
  apikey: env.VITE_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
};

async function check(name, path, options = {}) {
  const response = await fetch(`${env.VITE_SUPABASE_URL}${path}`, { headers, ...options });
  const text = await response.text();
  let code = '';
  try {
    code = JSON.parse(text).code ?? '';
  } catch {
    // Non-JSON responses are fine for RPCs.
  }
  const ok = response.ok;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${code ? `  (${code})` : ''}`);
  if (!ok) {
    console.log(`      ${text.slice(0, 180).replace(/\s+/g, ' ')}`);
  }
  return ok;
}

const checks = [];
for (const table of [
  'stores',
  'products',
  'prices',
  'personal_cart_items',
  'order_shipments',
  'addresses',
  'community_activity_feed',
]) {
  checks.push(await check(table, `/rest/v1/${table}?select=*&limit=1`));
}
checks.push(
  await check(
    'order_events.items',
    '/rest/v1/order_events?select=id,items,amount,address_text&limit=1',
  ),
);
checks.push(
  await check('server_now()', '/rest/v1/rpc/server_now', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: '{}',
  }),
);

if (checks.every(Boolean)) {
  console.log('\nDatabase is ready. Open Orders while signed in to upload device-only history.');
} else {
  console.log('\nDatabase is not ready. Run supabase/0001 through 0005, then reload the schema cache.');
  process.exitCode = 1;
}
