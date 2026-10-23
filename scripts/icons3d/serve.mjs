// Renderer ikon 3D: `npm run icons`, lalu buka URL yang dicetak di Chrome.
// Halaman memodelkan setiap ikon di three.js (icons.js), merendernya, lalu mengirim gambarnya
// ke server ini, yang menulisnya ke public/3d/<nama>.webp (atau .png untuk ikon aplikasi).
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const OUT = join(ROOT, "public", "3d");
const PORT = 4124;
const SERVE = ["scripts/icons3d/", "node_modules/three/", "public/3d/"];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png" };

await mkdir(OUT, { recursive: true });

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  try {
    if (req.method === "POST" && url.pathname === "/save") {
      const name = url.searchParams.get("name") ?? "";
      const ext = url.searchParams.get("ext") === "png" ? "png" : "webp";
      if (!/^[a-z0-9-]+$/.test(name)) throw Object.assign(new Error("nama tidak valid"), { code: 400 });
      const chunks = [];
      for await (const c of req) chunks.push(c);
      await writeFile(join(OUT, `${name}.${ext}`), Buffer.concat(chunks));
      console.log(`tersimpan ${name}.${ext}`);
      return res.writeHead(204).end();
    }
    if (url.pathname === "/") return res.writeHead(302, { location: `/scripts/icons3d/${url.search}` }).end();
    let path = normalize(url.pathname.slice(1));
    if (path.endsWith("/")) path += "index.html";
    if (!SERVE.some((p) => path.startsWith(p))) throw Object.assign(new Error("tidak ada"), { code: 404 });
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch (e) {
    res.writeHead(e.code === 400 ? 400 : 404).end(String(e.message));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Ikon 3D: buka http://localhost:${PORT}/ (lembar: /scripts/icons3d/sheet.html)`));
