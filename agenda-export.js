(() => {
  "use strict";

  const VERSION = "20260902-9";
  const FILE_MONTHS = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];

  function currentAmsterdamMonth() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit" }).formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value || "";
    const month = parts.find((part) => part.type === "month")?.value || "";
    return `${year}-${month}`;
  }

  function shiftMonth(monthKey, amount) {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1 + amount, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  function monthFile(monthKey) {
    const month = Number(monthKey.slice(5, 7));
    return `Roosterindex_${FILE_MONTHS[month - 1]}.json`;
  }

  if (!window.__roosterNativeFetch) window.__roosterNativeFetch = window.fetch.bind(window);
  if (!window.__roosterAutoFetchPatched) {
    const nativeFetch = window.__roosterNativeFetch;
    window.fetch = async function autoMonthFetch(input, init) {
      const url = typeof input === "string" ? input : input?.url || "";
      if (!/Roosterindex_September\.json(?:[?#]|$)/i.test(url)) return nativeFetch(input, init);
      const current = currentAmsterdamMonth();
      const candidates = [current, shiftMonth(current, -1), shiftMonth(current, 1)];
      for (const monthKey of candidates) {
        const target = String(url).replace(/Roosterindex_September\.json/i, monthFile(monthKey));
        const response = await nativeFetch(target, init);
        if (response.status === 404) continue;
        return response;
      }
      return nativeFetch(String(url).replace(/Roosterindex_September\.json/i, monthFile(current)), init);
    };
    window.__roosterAutoFetchPatched = true;
  }

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
  loadStyle("legend.css");

  loadScript("roster-controller.js");
  loadScript("month-access-fix.js");
  loadScript("timezone-background.js");
  loadScript("theme.js");
  loadScript("agenda-export-core.js");
  loadScript("agenda-timezone.js");
  loadScript("workers-view.js");
  loadScript("today-workers-close.js");
  loadScript("screenshot-theme.js");
  loadScript("personal-month.js");
  loadScript("legend.js");
  loadScript("session-timeout.js");
})();