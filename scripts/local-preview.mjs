/**
 * Zero-dependency local preview for the Senditto platform UI.
 * Serves public/ (the real product shell) without the full vinext stack:
 *   node scripts/local-preview.mjs   →  http://localhost:5170
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../public", import.meta.url));
const PORT = Number(process.env.PORT || 5170);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/senditto-preview.html";

    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const info = await stat(file).catch(() => null);
    if (!info || !info.isFile()) {
      // Optional local-only config is allowed to be absent.
      if (path === "/local-platform-config.js") {
        res.writeHead(200, { "Content-Type": MIME[".js"] }).end("// no local platform config\n");
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found: " + path);
      return;
    }

    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end(String(err?.message || err));
  }
});

server.listen(PORT, () => {
  console.log(`Senditto platform preview → http://localhost:${PORT}`);
});
