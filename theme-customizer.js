(() => {
  "use strict";

  const STANDARD_THEME_NAME = "Standaard";
  const CUSTOM_STYLE_ID = "roosterCustomThemeOverrides";
  const CUSTOM_PROPERTY_PREFIX = "--rooster-theme-";
  const app = document.getElementById("app");
  if (!app) return;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function emptyDropdown(label, id) {
    return `
      <details class="theme-customizer-dropdown" data-theme-dropdown>
        <summary>${escapeHtml(label)}</summary>
        <div class="theme-customizer-dropdown-body" id="${escapeHtml(id)}" aria-live="polite"></div>
      </details>`;
  }

  function setStatus(message = "") {
    const status = document.getElementById("themeCustomizerStatus");
    if (status) status.textContent = message;
  }

  function setCurrentTheme(name) {
    const value = String(name || STANDARD_THEME_NAME).trim() || STANDARD_THEME_NAME;
    const current = document.getElementById("themeCustomizerCurrent");
    if (current) current.textContent = value;
  }

  function resetToStandard() {
    const root = document.documentElement;
    [...root.style]
      .filter((property) => property.startsWith(CUSTOM_PROPERTY_PREFIX))
      .forEach((property) => root.style.removeProperty(property));
    document.getElementById(CUSTOM_STYLE_ID)?.remove();
    root.removeAttribute("data-rooster-custom-theme");
    setCurrentTheme(STANDARD_THEME_NAME);
    setStatus("Standaardthema hersteld.");
    window.dispatchEvent(new CustomEvent("rooster-theme-standard-restored"));
  }

  function closePanel() {
    const panel = document.getElementById("themeCustomizerPanel");
    const button = document.getElementById("themeCustomizerButton");
    if (!panel || !button) return;
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }

  function togglePanel() {
    const panel = document.getElementById("themeCustomizerPanel");
    const button = document.getElementById("themeCustomizerButton");
    if (!panel || !button) return;
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) setStatus("");
  }

  function ensureCustomizer() {
    let shell = document.getElementById("themeCustomizerShell");
    if (shell) return shell;

    shell = document.createElement("div");
    shell.id = "themeCustomizerShell";
    shell.className = "theme-customizer-shell";
    shell.innerHTML = `
      <button class="theme-customizer-button" id="themeCustomizerButton" type="button" aria-expanded="false" aria-controls="themeCustomizerPanel">Thema Kiezen</button>
      <section class="theme-customizer-panel" id="themeCustomizerPanel" aria-label="Thema kiezen" hidden>
        <div class="theme-customizer-head">
          <div>
            <strong>Thema kiezen</strong>
            <span>Huidig thema: <b id="themeCustomizerCurrent">${STANDARD_THEME_NAME}</b></span>
          </div>
          <button class="theme-customizer-close" id="themeCustomizerClose" type="button" aria-label="Thema menu sluiten">×</button>
        </div>

        <button class="theme-customizer-reset" id="themeCustomizerReset" type="button">Terug naar standaard</button>

        <div class="theme-customizer-options">
          ${emptyDropdown("Favorieten", "themeCustomizerFavorites")}
          ${emptyDropdown("Snel keuze", "themeCustomizerQuickChoices")}
          ${emptyDropdown("Accentkleur", "themeCustomizerAccent")}
          ${emptyDropdown("Knoppen", "themeCustomizerButtons")}
          ${emptyDropdown("Balken", "themeCustomizerBars")}
          ${emptyDropdown("Tekst", "themeCustomizerText")}
        </div>

        <div class="theme-customizer-save">
          <label for="themeCustomizerName">Naam van je thema</label>
          <div class="theme-customizer-save-row">
            <input id="themeCustomizerName" type="text" autocomplete="off" placeholder="Bijv. Mijn paarse thema">
            <button id="themeCustomizerSave" type="button" disabled title="Gedeeld opslaan wordt in een volgende stap gekoppeld.">Sla op in favorieten</button>
          </div>
        </div>
        <p class="theme-customizer-status" id="themeCustomizerStatus" aria-live="polite"></p>
      </section>`;

    app.appendChild(shell);

    shell.querySelector("#themeCustomizerButton")?.addEventListener("click", togglePanel);
    shell.querySelector("#themeCustomizerClose")?.addEventListener("click", closePanel);
    shell.querySelector("#themeCustomizerReset")?.addEventListener("click", resetToStandard);

    shell.querySelectorAll("[data-theme-dropdown]").forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        shell.querySelectorAll("[data-theme-dropdown]").forEach((other) => {
          if (other !== details) other.open = false;
        });
      });
    });

    document.addEventListener("click", (event) => {
      if (!shell.contains(event.target)) closePanel();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePanel();
    });

    return shell;
  }

  window.RoosterThemeCustomizer = Object.freeze({
    standardThemeName: STANDARD_THEME_NAME,
    resetToStandard,
    setCurrentTheme
  });

  ensureCustomizer();
})();
