#!/usr/bin/env node
/*
 * build.mjs — generates the site into _site/.
 *
 * Pages describe themselves. This reads pages/*.html, derives the sidebar and
 * the index card list from their own markup, and writes a finished copy of the
 * site to _site/. Nothing it produces is committed; the GitHub Actions workflow
 * uploads _site/ straight to Pages.
 *
 *   node tools/build.mjs           build to _site/
 *   node tools/build.mjs --serve   build, then serve _site/ on :8000
 *
 * Zero dependencies — Node built-ins only, so CI has nothing to install.
 *
 * What comes from where:
 *   nav/card title   <meta name="nav-title">, else the first <h1>
 *   card description <p class="lede">
 *   subsections      every <h2> in <main>
 *   anchor id        the <h2>'s own id, else a slug of its text (injected)
 *   order            alphabetical by title
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "_site");

const SITE_TITLE = "Design Resources";
const SECTION_TITLE = "Resources";

/* Directories copied verbatim into the build. */
const ASSET_DIRS = ["assets"];
const ROOT_FILES = [".nojekyll"];

/* ------------------------------------------------------------------ utils */

const html = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
           .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Strip tags and decode the handful of entities we actually author, so
 * heading text can be compared and slugged. */
function text(fragment) {
  return fragment
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(s) {
  return text(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fail(msg) {
  console.error(`\n  build failed: ${msg}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------- extraction */

/* Pulls the nav/card model out of one page's source.
 *
 * Regex on HTML is normally a footgun. It is contained here because every page
 * comes from one template and the targets are narrow and unambiguous. The
 * safety net is that anything unparseable fails the build loudly rather than
 * silently producing an empty sidebar — see validate() at the end.
 */
function readPage(file, source) {
  const metaTitle = source.match(
    /<meta\s+name="nav-title"\s+content="([^"]*)"/i
  );
  const h1 = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);

  if (!metaTitle && !h1) {
    fail(`${file} has no <h1> and no <meta name="nav-title">, so it cannot be titled.`);
  }

  const lede = source.match(/<p\s+class="lede"\s*>([\s\S]*?)<\/p>/i);

  /* Subsections: every <h2>, with its id, or a slug if it has none. */
  const seen = new Set();
  const headings = [];
  for (const m of source.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)) {
    const [full, attrs, inner] = m;
    const existing = attrs.match(/\bid="([^"]*)"/i);

    let id = existing ? existing[1] : slug(inner);
    if (!id) continue;                       /* heading with no usable text */

    /* Two headings can slug to the same thing; keep anchors unique. */
    let unique = id, n = 2;
    while (seen.has(unique)) unique = `${id}-${n++}`;
    seen.add(unique);

    headings.push({
      id: unique,
      title: text(inner),
      /* Recorded so the id can be injected into the output if absent. */
      needsId: !existing,
      source: full,
      attrs,
      inner,
    });
  }

  return {
    file,
    href: file.split(path.sep).join("/"),
    title: metaTitle ? metaTitle[1] : text(h1[1]),
    desc: lede ? text(lede[1]) : "",
    headings,
    source,
  };
}

/* --------------------------------------------------------------- renderer */

/* Renders the sidebar as seen from `current`. Each output page gets its own
 * copy: only its entry is aria-current, and only its subsections expand.
 *
 * `prefix` walks back up to the site root, so links stay relative and work at
 * any hosting path — a user site, a project subpath, or file://.
 */
function renderNav(pages, current, prefix) {
  const L = [];
  const put = (depth, s) => L.push("  ".repeat(depth) + s);

  put(0, `<p class="brand"><strong>${html(SITE_TITLE)}</strong></p>`);

  const homeCurrent = current && current.isIndex ? ' aria-current="page"' : "";
  put(0, `<a class="home-link" href="${prefix}index.html"${homeCurrent}>Home</a>`);

  put(0, `<h2>${html(SECTION_TITLE)}</h2>`);
  put(0, `<ul data-depth="1">`);

  for (const p of pages) {
    const isCurrent = current && !current.isIndex && p.href === current.href;
    const mark = isCurrent ? ' aria-current="page"' : "";
    put(1, `<li>`);
    put(2, `<a href="${prefix}${p.href}"${mark}>${html(p.title)}</a>`);

    if (p.headings.length) {
      if (isCurrent) {
        /* Subsections only expand for the page you are on. Showing every
         * page's at once turns the sidebar into a wall of links. */
        put(2, `<ul data-depth="2">`);
        for (const h of p.headings) {
          put(3,
            `<li><a href="${prefix}${p.href}#${h.id}" data-hash="#${h.id}">` +
            `${html(h.title)}</a></li>`
          );
        }
        put(2, `</ul>`);
      } else {
        put(2, `<!-- subsections collapsed; they expand on this page -->`);
      }
    }
    put(1, `</li>`);
  }

  put(0, `</ul>`);
  return L.join("\n    ");
}

function renderCards(pages) {
  const L = [`<ul class="cards">`];
  for (const p of pages) {
    L.push(`  <li>`);
    L.push(`    <a class="card" href="${p.href}">`);
    L.push(`      <span class="title">${html(p.title)}</span>`);
    L.push(`      <span class="host">${html(SECTION_TITLE.toLowerCase())}</span>`);
    if (p.desc) L.push(`      <span class="desc">${html(p.desc)}</span>`);
    L.push(`    </a>`);
    L.push(`  </li>`);
  }
  L.push(`</ul>`);
  return L.join("\n      ");
}

/* ----------------------------------------------------------- transformers */

const NAV_RE = /<nav\s+id="sidebar"[^>]*>[\s\S]*?<\/nav>/i;

function injectNav(source, file, navHtml) {
  if (!NAV_RE.test(source)) {
    fail(`${file} has no <nav id="sidebar"> for the sidebar to go in.`);
  }
  return source.replace(
    NAV_RE,
    (m) => m.replace(/>[\s\S]*<\/nav>$/i, `>\n    ${navHtml}\n  </nav>`)
  );
}

/* Writes generated ids onto the headings that lacked them, so the sidebar's
 * anchors have something to land on. */
function injectHeadingIds(source, page) {
  let out = source;
  for (const h of page.headings) {
    if (!h.needsId) continue;
    out = out.replace(h.source, `<h2 id="${h.id}"${h.attrs}>${h.inner}</h2>`);
  }
  return out;
}

const CARDS_RE = /<!--\s*build:cards\s*-->[\s\S]*?<!--\s*\/build:cards\s*-->/i;

function injectCards(source, cardsHtml) {
  if (!CARDS_RE.test(source)) {
    fail("index.html is missing the <!-- build:cards --> markers.");
  }
  return source.replace(
    CARDS_RE,
    `<!-- build:cards -->\n      ${cardsHtml}\n      <!-- /build:cards -->`
  );
}

/* Drops the <script> tag for the deleted site.js, in case a page still has
 * one. Harmless when absent. */
function dropSiteScript(source) {
  return source.replace(
    /^[ \t]*<script[^>]*src="[^"]*site\.js"[^>]*>\s*<\/script>[ \t]*\r?\n?/gim,
    ""
  );
}

/* --------------------------------------------------------------- validate */

/* The build's real safety net: re-read what was written and prove the sidebar
 * is there and every anchor it points at exists. */
function validate(files) {
  const problems = [];

  for (const rel of files) {
    const src = fs.readFileSync(path.join(OUT, rel), "utf8");
    const nav = src.match(NAV_RE);

    if (!nav) { problems.push(`${rel}: no <nav id="sidebar"> in output`); continue; }
    if (!/<a\b/i.test(nav[0])) problems.push(`${rel}: sidebar rendered empty`);
    if (!/class="home-link"/.test(nav[0])) problems.push(`${rel}: no Home link`);

    const ids = new Set(
      [...src.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])
    );
    /* Same-page anchors in the sidebar must resolve. */
    for (const m of nav[0].matchAll(/href="[^"#]*#([^"]+)"/g)) {
      const target = m[1];
      const samePage = m[0].includes(`${path.basename(rel)}#`);
      if (samePage && !ids.has(target)) {
        problems.push(`${rel}: sidebar links #${target}, which does not exist`);
      }
    }

    /* Specifically a leftover <script src=...site.js>, not any prose mention
     * of the filename. */
    if (/<script[^>]*src="[^"]*site\.js"/i.test(src)) {
      problems.push(`${rel}: still loads the deleted site.js`);
    }
  }

  if (problems.length) {
    fail(`output validation:\n    - ${problems.join("\n    - ")}`);
  }
}

/* ------------------------------------------------------------------ build */

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function build() {
  const started = Date.now();

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  for (const dir of ASSET_DIRS) {
    const from = path.join(ROOT, dir);
    if (fs.existsSync(from)) copyDir(from, path.join(OUT, dir));
  }
  for (const f of ROOT_FILES) {
    const from = path.join(ROOT, f);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(OUT, f));
  }

  /* ---- collect pages ---- */
  const pagesDir = path.join(ROOT, "pages");
  if (!fs.existsSync(pagesDir)) fail("no pages/ directory.");

  const pages = fs
    .readdirSync(pagesDir)
    .filter((f) => f.endsWith(".html"))
    .map((f) =>
      readPage(
        path.join("pages", f),
        fs.readFileSync(path.join(pagesDir, f), "utf8")
      )
    )
    .sort((a, b) => a.title.localeCompare(b.title));

  if (!pages.length) fail("pages/ contains no .html files.");

  const written = [];

  /* ---- index ---- */
  const indexPath = path.join(ROOT, "index.html");
  if (!fs.existsSync(indexPath)) fail("no index.html at the repo root.");

  let index = fs.readFileSync(indexPath, "utf8");
  index = dropSiteScript(index);
  index = injectNav(index, "index.html", renderNav(pages, { isIndex: true }, ""));
  index = injectCards(index, renderCards(pages));
  fs.writeFileSync(path.join(OUT, "index.html"), index);
  written.push("index.html");

  /* ---- content pages ---- */
  fs.mkdirSync(path.join(OUT, "pages"), { recursive: true });
  for (const p of pages) {
    let out = dropSiteScript(p.source);
    out = injectHeadingIds(out, p);
    out = injectNav(out, p.href, renderNav(pages, p, "../"));
    fs.writeFileSync(path.join(OUT, p.href), out);
    written.push(p.href);
  }

  /* ---- context/, when it exists ----
   * context/ is gitignored, so it is absent from a CI checkout. Building it
   * is best-effort: present locally, skipped on the runner. Anything that
   * required it would pass on a dev machine and fail in Actions. */
  const contextDir = path.join(ROOT, "context");
  if (fs.existsSync(contextDir)) {
    const extras = fs
      .readdirSync(contextDir)
      .filter((f) => f.endsWith(".html") && !f.startsWith("_"));
    if (extras.length) fs.mkdirSync(path.join(OUT, "context"), { recursive: true });
    for (const f of extras) {
      const rel = path.join("context", f);
      let out = fs.readFileSync(path.join(contextDir, f), "utf8");
      out = dropSiteScript(out);
      out = injectNav(out, rel, renderNav(pages, null, "../"));
      fs.writeFileSync(path.join(OUT, rel), out);
      written.push(rel.split(path.sep).join("/"));
    }
  }

  validate(written);

  const ms = Date.now() - started;
  console.log(`\n  built ${written.length} pages in ${ms}ms`);
  for (const p of pages) {
    console.log(`    ${p.href}  "${p.title}"  ${p.headings.length} subsections`);
  }
  const generated = pages.flatMap((p) => p.headings.filter((h) => h.needsId));
  if (generated.length) {
    console.log(`  generated ${generated.length} heading ids: ` +
                generated.map((h) => "#" + h.id).join(", "));
  }
  if (!fs.existsSync(contextDir)) {
    console.log("  context/ absent — skipped (expected in CI)");
  }
  console.log("");
}

/* ------------------------------------------------------------------ serve */

async function serve(port = 8000) {
  const { createServer } = await import("node:http");
  const TYPES = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
    ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8", ".json": "application/json",
  };

  createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(OUT, rel);

    /* Keep requests inside _site/. */
    if (!file.startsWith(OUT)) { res.writeHead(403).end("forbidden"); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "content-type": "text/plain" }).end("404");
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  }).listen(port, () => {
    console.log(`  serving _site/ at http://localhost:${port}  (ctrl-c to stop)\n`);
  });
}

build();
if (process.argv.includes("--serve")) {
  const i = process.argv.indexOf("--port");
  serve(i > -1 ? Number(process.argv[i + 1]) : 8000);
}
