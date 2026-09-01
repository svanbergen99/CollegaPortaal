(() => {
  "use strict";

  const VERSION = "20260901-3";

  function hasAsset(selector, baseName, attribute) {
    return [...document.querySelectorAll(selector)].some((element) => {
      const value = element.getAttribute(attribute) || "";
      return value === baseName || value.startsWith(`${baseName}?`);
    });
  }

  function loadStyle(href) {
    if (hasAsset("link[rel=\"stylesheet\"]", href, "href")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${href}?v=${VERSION}`;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    if (hasAsset("script[src]", src, "src")) return;
    const script = document.createElement("script");
    script.src = `${src}?v=${VERSION}`;
    script.async = false;
    document.body.appendChild(script);
  }

  loadStyle("theme.css");
  loadStyle("background-contrast.css");
  loadStyle("personal-month.css");
  loadScript("theme.js");
  loadScript("agenda-export-core.js");
  loadScript("today-workers-close.js");
  loadScript("screenshot-theme.js");
  loadScript("personal-month.js");
})();