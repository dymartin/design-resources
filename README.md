# Design Resources

A static reference library. Hand-written HTML, generated nav, no dependencies.

```sh
node tools/build.mjs --serve     # build to _site/ and preview on :8000
```

The sidebar is baked into each page at build time, so preview the build rather
than opening source files directly.

## Adding a page

Copy `context/_template.html` into `pages/`, write it, rebuild. Nothing else —
no manifest to update.

The page describes itself:

| What | Comes from |
| --- | --- |
| Nav + card title | `<h1>`, or `<meta name="nav-title">` |
| Card description | `<p class="lede">` |
| Jump-to subsections | every `<h2>` |
| Anchor `id` | the `<h2>`'s own `id`, else auto-slugged from its text |

So `<h2>Contrast Ratios</h2>` becomes `id="contrast-ratios"` and links itself.
Existing `id`s are never touched. Pages sort alphabetically by title.

The build fails loudly on a page with no `<h1>` or no `<nav id="sidebar">`,
rather than quietly shipping an empty sidebar.

## Writing content

Plain semantic HTML — everything is styled without classes. Three extras:

| Class | Use |
| --- | --- |
| `.lede` | Subtitle under the `<h1>` |
| `.cards` | List of links with description and host |
| `.swatches` | Colour chips. Pass the colour inline: `style="--c:#7aa2f7"` |

Prose caps at 68 characters per line; tables, figures and the above opt out.
Use `.wide` for anything else needing full width.

## Theming

Six tokens at the top of `assets/css/theme.css` control everything:

```css
:root {
  --bg: #0f1117; --surface: #171923; --border: #262a38;
  --text: #e2e4ed; --muted: #9ba1b4; --accent: #7aa2f7;
}
```

Keep `--muted` above 4.5:1 against `--bg` — it carries real content.

## Deployment

Push to `main`. The workflow builds and uploads `_site/` straight to Pages;
nothing generated is ever committed.

**This requires Settings → Pages → Source = "GitHub Actions".** On the
"Deploy from a branch" source the workflow runs green but the live site never
changes, because that source only serves committed files.

## Layout

```
index.html            landing page; cards go between the build:cards markers
pages/                content — flat, one level
context/              template + kitchen sink. Gitignored, local-only
tools/build.mjs       the generator
assets/css/theme.css  the whole theme
assets/js/nav.js      mobile toggle + hash sync, nothing else
assets/vendor/        Pico CSS v2.1.1 (MIT), unmodified
```

Since `context/` is gitignored it does not exist on the runner; the build
skips it when absent.

## Gotchas

Pico does more than it looks. Two of its defaults are deliberately overridden
in `theme.css`, and removing either breaks the layout:

- `body > main` is a centered container with responsive max-widths.
- `<nav>` is a horizontal flex bar. Undo this and the sidebar becomes one
  overflowing row.

`data-theme="dark"` on `<html>` is Pico's own switch and must stay.

Navigation works with JavaScript disabled; only the mobile menu needs it.
No webfonts — all three type roles are system stacks.
