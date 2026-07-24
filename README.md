# Design Resources

A personal directory of design resources, built with [just-the-docs](https://just-the-docs.com)
on GitHub Pages. Link data lives in YAML; the theme handles everything else.

Live: https://dymartin.github.io/design-resources/

## Add or edit links

Edit the category's data file in `_data/` — that's the only thing you touch:

```yaml
# _data/typography.yml
title: Typography
subcategories:
  - name: Foundries
    links:
      - { title: Fontshare, url: https://www.fontshare.com, tags: [free, foundry], blurb: quality fonts }
```

## Add a category

1. Create `_data/<key>.yml` (same shape as above).
2. Add it to `_data/categories.yml` (drives the home page).
3. Create `<key>.html`:

   ```
   ---
   title: <Title>
   layout: default
   nav_order: <n>
   permalink: /<key>/
   ---
   {% raw %}{% include links.html cat="<key>" %}{% endraw %}
   ```

That's it — the sidebar, search-off, dark theme, and layout come from just-the-docs.

## Local preview (optional, needs Ruby)

```
bundle install
bundle exec jekyll serve
```

Otherwise just push to `main`; GitHub Pages builds it (no CI, no plugins to install).
