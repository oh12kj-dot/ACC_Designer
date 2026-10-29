// Convert row field names only. Nested user JSON is kept byte-for-byte semantically.
export type Row = Record<string, unknown>;
export function toRow(value: object): Row {
  return Object.fromEntries(Object.entries(value).filter(([,v])=>v !== undefined).map(([key,v])=>[
    key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()).replace('flip180','flip_180'),v,
  ]));
}
export function fromRow(value: Row): Row {
  return Object.fromEntries(Object.entries(value).map(([key,v])=>[
    key.replace(/_([a-z0-9])/g,(_,c:string)=>c.toUpperCase()),v === null ? undefined : v,
  ]));
}

export function safeRevision(value: unknown): number {
  const revision = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) throw new Error('Revisionが安全な整数の範囲外です');
  return revision;
}
