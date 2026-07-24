# Design Resources

A personal directory of design resources. Plain Jekyll on GitHub Pages — no theme
gem, no plugins, no CI. The whole look is one vendored [Pico](https://picocss.com)
file plus `assets/css/theme.css`; content is rendered from YAML by two includes.

Live: https://dymartin.github.io/design-resources/

## How it's wired

- `_data/<category>.yml` — the link data (the only thing you edit to add links).
- `_data/categories.yml` — ordered category index (drives the home page + sidebar).
- `_includes/cards.html` — renders a category's links as the card list.
- `_includes/sidebar.html` — builds the sidebar (categories + active subsections).
- `_layouts/default.html` — page shell (Pico + theme.css + nav.js).
- `<category>.html` — a thin page: front matter + `{% raw %}{% include cards.html cat="<key>" %}{% endraw %}`.

## Add or edit links

Edit the category's data file. Block style; quote any blurb with a comma:

```yaml
# _data/typography.yml
title: Typography
subcategories:
  - name: Foundries
    links:
      - title: Fontshare
        url: https://www.fontshare.com
        tags: [free, foundry]
        blurb: "quality fonts, generous licenses"
```

The card's hostname is derived from the URL — no need to store it.

## Add a category

1. Create `_data/<key>.yml` (shape above).
2. Add an entry to `_data/categories.yml` (`key`, `title`, `blurb`).
3. Create `<key>.html`:

   ```
   ---
   layout: default
   permalink: /<key>/
   title: <Title>
   ---
   <h1><Title></h1>
   <p class="lede">…</p>
   {% raw %}{% include cards.html cat="<key>" %}{% endraw %}
   ```

## Local preview (optional, needs Ruby)

```
bundle install
bundle exec jekyll serve
```

Otherwise push to `main`; GitHub Pages builds it.
