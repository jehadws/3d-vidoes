import fs from 'node:fs';
import path from 'node:path';

/** Find every metadata.json under <root>/assets. Returns [{ dir, file, data, parseError }]. */
export function findAssetFiles(root) {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'metadata.json') {
        try {
          out.push({ dir, file: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) });
        } catch (err) {
          out.push({ dir, file: p, data: null, parseError: err.message });
        }
      }
    }
  };
  walk(path.join(root, 'assets'));
  return out;
}

/** Build a Map<id, {dir, file, data}>. Duplicate IDs are reported, not silently overwritten. */
export function loadRegistry(root) {
  const registry = new Map();
  const duplicates = [];
  for (const entry of findAssetFiles(root)) {
    if (!entry.data?.id) continue;
    if (registry.has(entry.data.id)) duplicates.push(entry.data.id);
    else registry.set(entry.data.id, entry);
  }
  return { registry, duplicates };
}

/** Resolve an asset ID of an expected type. Returns {asset} or {error}. */
export function resolveAsset(registry, id, expectedType) {
  const asset = registry.get(id);
  if (!asset) return { error: `asset "${id}" not found` };
  if (expectedType && asset.data.type !== expectedType) {
    return { error: `asset "${id}" is a ${asset.data.type}, expected ${expectedType}` };
  }
  return { asset };
}
