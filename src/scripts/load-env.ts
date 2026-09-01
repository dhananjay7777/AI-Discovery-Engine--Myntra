/**
 * Load `.env` into process.env for tsx scripts.
 * Next.js already loads `.env` for `next dev` / `next build`.
 * Existing env vars (CI secrets) win over file values.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
