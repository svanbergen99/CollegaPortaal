(() => {
  "use strict";

  function lockRosterButton() {
    const button = document.getElementById("publicRosterButton");
    if (!button) return;
    button.disabled = true;
    button.tabIndex = -1;
    button.setAttribute("aria-disabled", "true");
    button.setAttribute("aria-hidden", "true");
  }

  function lockEffectsControls() {
    const button = document.getElementById("effectsButton");
    if (button) {
      button.disabled = true;
      button.tabIndex = -1;
      button.hidden = true;
      button.setAttribute("aria-disabled", "true");
      button.setAttribute("aria-hidden", "true");
    }

    const menu = document.getElementById("effectsMenu");
    if (menu) {
      menu.hidden = true;
      menu.setAttribute("aria-hidden", "true");
    }
  }

  function enforcePortalRestrictions() {
    lockRosterButton();
    lockEffectsControls();
  }

  enforcePortalRestrictions();
  window.addEventListener("rooster-unlocked", enforcePortalRestrictions);
  new MutationObserver(enforcePortalRestrictions).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
