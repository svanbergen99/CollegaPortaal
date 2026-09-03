(() => {
  "use strict";

  const VERSION = "20260903-54";

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

  /* Openbaar gedeelte: alleen algemene websites en visuele instellingen. */
  loadStyle("theme.css");
  loadStyle("theme-customizer.css");
  loadStyle("theme-customizer-colors.css");
  loadStyle("background-contrast.css");
  loadStyle("background-brightness.css");
  loadStyle("external-sites.css");
  loadStyle("effects.css");
  loadStyle("visual-audio-controls.css");
  loadStyle("audio-preview.css");
  loadStyle("public-portal.css");

  loadScript("theme.js");
  loadScript("theme-customizer.js");
  loadScript("theme-background-color.js");
  loadScript("external-theme-buttons.js");
  loadScript("background-brightness.js");
  loadScript("external-sites.js");
  loadScript("external-sites-tweaks.js");
  loadScript("effects.js");
  loadScript("visual-audio-controls.js");
  loadScript("audio-preview.js");
  loadScript("public-portal.js");

  /*
    Het afgeschermde roostergedeelte is bewust uitgeschakeld.
    Daarom worden de modules voor teamkeuze, namen, rooster, Traffic,
    salaris, pauze, volgende dienst en teamcontacten hier niet geladen.
    Die kunnen later als afzonderlijk beveiligd gedeelte terugkomen.
  */
})();
