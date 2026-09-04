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

  lockRosterButton();
  window.addEventListener("rooster-unlocked", lockRosterButton);
  new MutationObserver(lockRosterButton).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
