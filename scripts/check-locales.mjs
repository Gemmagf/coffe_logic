// Fails when any locale file misses or adds keys compared to en.json.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../frontend/src/i18n/locales/', import.meta.url).pathname;
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const ref = new Set(flat(JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8'))));
let failed = false;
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'en.json')) {
  const keys = new Set(flat(JSON.parse(readFileSync(join(dir, f), 'utf8'))));
  const missing = [...ref].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !ref.has(k));
  if (missing.length || extra.length) { failed = true; console.error(`${f}: missing ${missing.length} ${missing.join(', ')} | extra ${extra.length} ${extra.join(', ')}`); }
  else console.log(`${f}: ok (${keys.size} keys)`);
}
process.exit(failed ? 1 : 0);
