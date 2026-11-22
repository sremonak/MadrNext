import path from "node:path";
import { env } from "@/lib/env";

/**
 * Storage root for local/dev media (videos, PDFs). In production these paths
 * would point at an object store; here the base dir comes from STORAGE_DIR.
 */
export function storageBaseDir(): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.storageDir);
}

/**
 * Resolve a stored-relative path (e.g. "documents/sample-1.pdf") against the
 * storage base dir. Returns null for empty/absolute paths or anything that
 * escapes the base directory (traversal guard). Callers must treat null as 404.
 */
export function resolveStoragePath(rel: string): string | null {
  if (!rel || path.isAbsolute(rel)) return null;
  const abs = path.resolve(/* turbopackIgnore: true */ storageBaseDir(), rel);
  const base = storageBaseDir();
  const relToBase = path.relative(base, abs);
  if (relToBase.startsWith("..") || path.isAbsolute(relToBase) || relToBase === "") return null;
  return abs;
}
