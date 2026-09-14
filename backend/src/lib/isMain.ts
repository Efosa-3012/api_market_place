import { fileURLToPath } from 'node:url';

/** True when the module at `metaUrl` is the script node was started with (works on Windows too). */
export function isMain(metaUrl: string): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();
  return norm(fileURLToPath(metaUrl)) === norm(argv1);
}
