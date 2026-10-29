// Disk PGlite restoration can exceed Node's default 4 GiB heap with the local catalog.
export function localNodeOptions(options='') {
  if (/--max[-_]old[-_]space[-_]size(?:[-_]percentage)?(?:=|\s)/.test(options)) return options;
  return [options,'--max-old-space-size=8192'].filter(Boolean).join(' ');
}
