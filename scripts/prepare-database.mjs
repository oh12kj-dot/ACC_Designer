import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'supabase', 'migrations');
const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
if (!files.length || files.some(name => !/^\d{12}_[a-z0-9_]+\.sql$/.test(name))) {
  throw new Error('Migration filenames must have sortable, unique numeric versions.');
}
const versions = files.map(name => name.split('_')[0]);
if (new Set(versions).size !== versions.length) throw new Error('Duplicate migration version.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const migrations = [];
const chunks = [
  '-- ACC_Designer: apply once to a new Supabase project via SQL Editor.\n',
  '-- Existing installations must apply only their unapplied migrations.\n',
  '-- All statements are one transaction; an error rolls back this bundle.\n',
  'BEGIN;\n',
];
for (const name of files) {
  const bytes = await readFile(path.join(directory, name));
  if (!bytes.length) throw new Error(`Empty migration: ${name}`);
  migrations.push({ file: `supabase/migrations/${name}`, bytes: bytes.length, sha256: hash(bytes) });
  chunks.push(`\n-- BEGIN ${name}\n`, bytes.toString('utf8'), `\n-- END ${name}\n`);
}
chunks.push('\nCOMMIT;\n');
const sql = chunks.join('');
const output = path.join(root, '.local', 'setup');
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'supabase-initial.sql'), sql);
await writeFile(path.join(output, 'manifest.json'), JSON.stringify({
  schemaVersion: 1,
  bundle: 'supabase-initial.sql',
  sha256: hash(sql),
  migrations,
}, null, 2) + '\n');
console.log(`Prepared ${files.length} migrations: ${path.join(output, 'supabase-initial.sql')}`);
console.log(`Bundle SHA-256: ${hash(sql)}`);
console.log('No database connection or migration execution was performed.');
