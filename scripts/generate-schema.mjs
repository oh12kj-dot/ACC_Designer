// One-time schema transcription from the supplied v1.4 table definitions.
// The migration is authoritative; this helper only creates the base tables.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const source = readFileSync('accessory_designer_detailed_design_v1.4_final.md', 'utf8');
const tables = [];
for (const match of source.matchAll(/^## 3\.\d+ ([a-z_]+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)) {
  const name = match[1];
  if (!match[2].includes('| Column |')) continue;
  const columns = [];
  for (const line of match[2].split(/\r?\n/)) {
    if (!/^\| [a-z_][a-z_0-9]* \|/.test(line)) continue;
    const cells = line.split('|').map(s => s.trim());
    const col = cells[1];
    let type = cells[2];
    if (!/^(uuid|text|numeric|integer|smallint|bigint|boolean|jsonb|timestamptz)(\[\])?$/.test(type)) continue;
    const nullable = cells[3] === 'yes';
    const defaultValue = col === 'id' ? ' default gen_random_uuid()' : ['created_at', 'updated_at'].includes(col) ? ' default now()' : type === 'jsonb' ? " default '{}'::jsonb" : type === 'text[]' ? " default '{}'::text[]" : ['is_archived', 'locked', 'favorite', 'locked_to_neighbors', 'flip_180'].includes(col) ? ' default false' : ['revision', 'use_count'].includes(col) ? ' default 0' : '';
    columns.push(`  ${col} ${type}${nullable ? '' : ' not null'}${defaultValue}`);
  }
  columns.push(name === 'part_user_state' ? '  primary key (user_id, part_id)' : '  primary key (id)');
  tables.push(`create table public.${name} (\n${columns.join(',\n')}\n);`);
}
// Asset must exist before parts references it (FKs are added in the next migration).
mkdirSync('supabase/migrations', { recursive: true });
writeFileSync('supabase/migrations/202610050001_schema.sql', '-- v1.4 domain tables. Requires Supabase auth schema.\n\n' + tables.join('\n\n') + '\n');
console.log(`Generated ${tables.length} tables`);
