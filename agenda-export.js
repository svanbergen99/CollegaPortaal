(() => {
  "use strict";

  function loadStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  }

  loadStyle("theme.css");
  loadScript("theme.js");
  loadScript("agenda-export-core.js");
  loadScript("today-workers-close.js");
})();
