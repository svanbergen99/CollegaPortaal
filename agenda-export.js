(() => {
  "use strict";

  const VERSION = "20260902-2";

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
  loadStyle("roster-extras.css");
  loadStyle("personal-month.css");
  loadStyle("session-timeout.css");

  loadScript("roster-controller.js");
  loadScript("timezone-background.js");
  loadScript("theme.js");
  loadScript("agenda-export-core.js");
  loadScript("agenda-timezone.js");
  loadScript("workers-view.js");
  loadScript("today-workers-close.js");
  loadScript("screenshot-theme.js");
  loadScript("personal-month.js");
  loadScript("session-timeout.js");
})();
