/*
 * nav.js — the two parts of the sidebar that have to happen at runtime.
 *
 * The sidebar itself is pre-rendered into every page by tools/build.mjs, so
 * navigation works with JavaScript disabled. This file only adds behaviour on
 * top of markup that is already there:
 *
 *   1. the mobile menu toggle
 *   2. keeping the highlighted subsection in step with the address bar
 */
(function () {
  "use strict";

  /* Mobile disclosure: below the layout breakpoint the sidebar collapses and
   * this button reveals it. Desktop CSS hides the button entirely. */
  function buildMenuButton(sidebar) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "menu-toggle";
    btn.textContent = "Menu";
    btn.setAttribute("aria-controls", "sidebar");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => {
      const open = sidebar.toggleAttribute("data-open");
      btn.setAttribute("aria-expanded", String(open));
    });
    return btn;
  }

  /* The build marks subsection links with data-hash. "location" rather than
   * "page": same page, different section. */
  function syncHash() {
    document.querySelectorAll("#sidebar a[data-hash]").forEach((link) => {
      if (link.dataset.hash === location.hash) {
        link.setAttribute("aria-current", "location");
      } else if (link.getAttribute("aria-current") === "location") {
        link.removeAttribute("aria-current");
      }
    });
  }

  function init() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    document.body.prepend(buildMenuButton(sidebar));

    /* Close the mobile nav after following a link. */
    sidebar.addEventListener("click", (e) => {
      if (e.target.closest("a")) sidebar.removeAttribute("data-open");
    });

    syncHash();
    window.addEventListener("hashchange", syncHash);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
