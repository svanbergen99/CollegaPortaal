(() => {
  "use strict";

  const SOURCE_STYLE_ID = "roosterCustomThemeOverrides";
  const OVERRIDE_STYLE_ID = "externalThemeButtonOverrides";

  function selectedButtonColor() {
    const source = document.getElementById(SOURCE_STYLE_ID);
    const css = source?.textContent || "";
    if (!css) return "";

    const match = css.match(/\.today-workers-button[\s\S]*?\{[\s\S]*?background:\s*(#[0-9a-fA-F]{6})\s*!important/);
    return match?.[1] || "";
  }

  function syncExternalButtons() {
    const color = selectedButtonColor();
    let style = document.getElementById(OVERRIDE_STYLE_ID);

    if (!color || document.documentElement.dataset.roosterCustomTheme !== "true") {
      style?.remove();
      return;
    }

    if (!style) {
      style = document.createElement("style");
      style.id = OVERRIDE_STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = `
:root[data-rooster-custom-theme="true"] .external-site-link {
  background: ${color} !important;
  border-color: ${color} !important;
}
:root[data-rooster-custom-theme="true"] .external-site-link:hover {
  background: color-mix(in srgb, ${color} 86%, black) !important;
  border-color: color-mix(in srgb, ${color} 86%, black) !important;
}`;
  }

  const observer = new MutationObserver(syncExternalButtons);
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });

  window.addEventListener("rooster-theme-standard-restored", syncExternalButtons);
  syncExternalButtons();
})();
