# Design Resources

A personal directory of design resources, built with
[Minimal Mistakes](https://mmistakes.github.io/minimal-mistakes/) on GitHub Pages.
Link data lives in YAML; the theme handles everything else. No CI — Pages builds it.

Live: https://dymartin.github.io/design-resources/

## Add or edit links

Edit the category's data file in `_data/` — the only thing you touch. Block style,
and quote any blurb containing a comma:

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

## Add a category

1. Create `_data/<key>.yml` (same shape as above).
2. Add it to `_data/categories.yml` (home page) and `_data/navigation.yml` (sidebar).
3. Create `<key>.html`:

   ```
   ---
   title: <Title>
   permalink: /<key>/
   ---
   {% raw %}{% include links.html cat="<key>" %}{% endraw %}
   ```

Layout, dark skin, sidebar nav, and per-page table of contents come from the theme
(`_config.yml` defaults). Component styling (cards, link rows, tags) lives in
`assets/css/main.scss`.

## Local preview (optional, needs Ruby)

```
bundle install
bundle exec jekyll serve
```

Otherwise push to `main`; GitHub Pages builds it.
