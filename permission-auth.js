(() => {
  "use strict";

  const TEAM_ID = "KCDTeam03";
  const ALLOWED_HASHES = new Set(window.RoosterAccessPermissions || []);
  const encoder = new TextEncoder();

  const body = document.body;
  const welcomeOverlay = document.getElementById("welcomeOverlay");
  const continueButton = document.getElementById("continueButton");
  const unlockOverlay = document.getElementById("unlockOverlay");
  const unlockForm = document.getElementById("unlockForm");
  const rosterId = document.getElementById("rosterId");
  const rosterPassword = document.getElementById("rosterPassword");
  const unlockError = document.getElementById("unlockError");
  const app = document.getElementById("app");
  const nameForm = document.getElementById("nameForm");
  const employeeName = document.getElementById("employeeName");
  const rosterResult = document.getElementById("rosterResult");

  if (!body || !welcomeOverlay || !continueButton || !unlockForm || !rosterId || !rosterPassword || !app || !nameForm || !employeeName) return;

  body.classList.add("permission-auth-enabled");

  let overlay = null;
  let allowedName = "";
  let colleagueFirstName = "Collega";
  let authPending = false;
  let passwordInput = null;
  let authError = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function nameSignature(value) {
    return String(value || "")
      .toLocaleLowerCase("nl-NL")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "nl"))
      .join("|");
  }

  async function hashName(value) {
    const signature = nameSignature(value);
    if (!signature) return "";
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(signature));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function firstNameFromInput(value) {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "Collega";
    const prefixes = new Set(["van", "de", "der", "den", "het", "'t", "ten", "ter", "von"]);
    const candidate = prefixes.has(parts[0].toLocaleLowerCase("nl-NL")) && parts.length > 1 ? parts.at(-1) : parts[0];
    return `${candidate.charAt(0).toLocaleUpperCase("nl-NL")}${candidate.slice(1)}`;
  }

  function ensureOverlay() {
    if (overlay?.isConnected) return overlay;
    overlay = document.createElement("div");
    overlay.id = "permissionAuthOverlay";
    overlay.className = "overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    body.appendChild(overlay);
    return overlay;
  }

  function focusSoon(selector) {
    requestAnimationFrame(() => ensureOverlay().querySelector(selector)?.focus());
  }

  function showTeamStep() {
    authPending = false;
    unlockOverlay.hidden = true;
    const target = ensureOverlay();
    target.innerHTML = `
      <section class="unlock-card permission-auth-card">
        <h1>Selecteer je team</h1>
        <p>Kies het team waarvoor je roosterinzicht wilt openen.</p>
        <button id="permissionTeamButton" class="permission-auth-team-button" type="button">${escapeHtml(TEAM_ID)}</button>
      </section>`;
    target.hidden = false;
    target.querySelector("#permissionTeamButton")?.addEventListener("click", showNameStep);
    focusSoon("#permissionTeamButton");
  }

  function showNameStep() {
    authPending = false;
    const target = ensureOverlay();
    target.innerHTML = `
      <form id="permissionNameForm" class="unlock-card permission-auth-card" autocomplete="off">
        <h1>Wie ben je?</h1>
        <p>Vul je volledige naam in. Alleen collega's met toestemming kunnen verder.</p>
        <label for="permissionNameInput">Naam</label>
        <input id="permissionNameInput" type="text" autocomplete="off" autocapitalize="words" required>
        <button class="full-button" type="submit">Verder</button>
        <button id="permissionBackToTeam" class="permission-auth-back" type="button">Terug</button>
        <div id="permissionNameError" class="permission-auth-error" aria-live="polite"></div>
      </form>`;

    const form = target.querySelector("#permissionNameForm");
    const input = target.querySelector("#permissionNameInput");
    const error = target.querySelector("#permissionNameError");
    target.querySelector("#permissionBackToTeam")?.addEventListener("click", showTeamStep);
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      const value = input.value.trim();
      if (!value) return;
      const hash = await hashName(value);
      if (!ALLOWED_HASHES.has(hash)) {
        error.textContent = "Deze naam heeft geen toestemming voor roosterinzicht.";
        input.select();
        return;
      }
      allowedName = value;
      colleagueFirstName = firstNameFromInput(value);
      showPasswordStep();
    });
    focusSoon("#permissionNameInput");
  }

  function showPasswordStep() {
    authPending = false;
    const target = ensureOverlay();
    target.innerHTML = `
      <form id="permissionPasswordForm" class="unlock-card permission-auth-card" autocomplete="off">
        <h1>Welkom ${escapeHtml(colleagueFirstName)}</h1>
        <p>Typ hier je Team Wachtwoord:</p>
        <label for="permissionPasswordInput">Team Wachtwoord</label>
        <input id="permissionPasswordInput" type="password" autocomplete="new-password" required>
        <button id="permissionUnlockButton" class="full-button" type="submit">Rooster ontgrendelen</button>
        <button id="permissionBackToName" class="permission-auth-back" type="button">Terug</button>
        <div id="permissionAuthError" class="permission-auth-error" aria-live="polite"></div>
      </form>`;

    const form = target.querySelector("#permissionPasswordForm");
    passwordInput = target.querySelector("#permissionPasswordInput");
    authError = target.querySelector("#permissionAuthError");
    const submitButton = target.querySelector("#permissionUnlockButton");

    target.querySelector("#permissionBackToName")?.addEventListener("click", showNameStep);
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const password = passwordInput.value;
      if (!password || authPending) return;
      authPending = true;
      authError.textContent = "";
      submitButton.disabled = true;

      rosterId.value = TEAM_ID;
      rosterPassword.value = password;
      unlockOverlay.hidden = true;
      unlockForm.requestSubmit();
    });
    focusSoon("#permissionPasswordInput");
  }

  function openAllowedRoster(attempt = 0) {
    if (!allowedName || !employeeName || !nameForm) return;
    employeeName.value = allowedName;
    nameForm.requestSubmit();

    setTimeout(() => {
      if (rosterResult?.querySelector(".employee-head")) {
        employeeName.value = "";
        return;
      }
      if (attempt < 12) openAllowedRoster(attempt + 1);
    }, 100);
  }

  function completeUnlock() {
    if (app.hidden || !allowedName) return;
    authPending = false;
    if (overlay?.isConnected) overlay.remove();
    overlay = null;
    unlockOverlay.hidden = true;
    setTimeout(() => openAllowedRoster(), 0);
  }

  continueButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    welcomeOverlay.hidden = true;
    showTeamStep();
  }, true);

  if (unlockError) {
    const unlockErrorObserver = new MutationObserver(() => {
      if (!authPending || app.hidden === false) return;
      const message = unlockError.textContent.trim();
      if (!message) return;
      authPending = false;
      const submitButton = overlay?.querySelector("#permissionUnlockButton");
      if (submitButton) submitButton.disabled = false;
      if (authError) authError.textContent = "Het Team Wachtwoord is niet juist.";
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.focus();
      }
      unlockError.textContent = "";
    });
    unlockErrorObserver.observe(unlockError, { childList: true, characterData: true, subtree: true });
  }

  window.addEventListener("rooster-unlocked", completeUnlock);

  const appObserver = new MutationObserver(() => {
    if (!app.hidden) completeUnlock();
  });
  appObserver.observe(app, { attributes: true, attributeFilter: ["hidden"] });

  setTimeout(() => {
    if (!app.hidden) return;
    if (welcomeOverlay.hidden || !unlockOverlay.hidden) {
      unlockOverlay.hidden = true;
      showTeamStep();
    }
  }, 0);
})();
