(() => {
  "use strict";

  const TEAM_IDS = Object.freeze([
    "KCDTeam01", "KCDTeam02", "KCDTeam03", "KCDTeam04", "KCDTeam05", "KCDTeam06",
    "WOTeam01", "WOTeam02", "WOTeam03", "WOTeam04", "WOTeam05", "WOTeam06", "WOTeam07", "WOTeam08"
  ]);
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
  let selectedTeam = "";
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

  function teamOptionsHtml() {
    const kcd = TEAM_IDS.filter((team) => team.startsWith("KCD")).map((team) =>
      `<option value="${team}"${selectedTeam === team ? " selected" : ""}>${team}</option>`
    ).join("");
    const wo = TEAM_IDS.filter((team) => team.startsWith("WO")).map((team) =>
      `<option value="${team}"${selectedTeam === team ? " selected" : ""}>${team}</option>`
    ).join("");
    return `<option value="">Kies een team</option><optgroup label="KCD Teams">${kcd}</optgroup><optgroup label="WO Teams">${wo}</optgroup>`;
  }

  function showTeamStep() {
    authPending = false;
    unlockOverlay.hidden = true;
    const target = ensureOverlay();
    target.innerHTML = `
      <form id="permissionTeamForm" class="unlock-card permission-auth-card" autocomplete="off">
        <h1>Selecteer je team</h1>
        <p>Kies het team waarvoor je roosterinzicht wilt openen.</p>
        <label for="permissionTeamSelect">Team</label>
        <select id="permissionTeamSelect" class="permission-auth-team-select" required>
          ${teamOptionsHtml()}
        </select>
        <button class="full-button" type="submit">Verder</button>
        <div id="permissionTeamError" class="permission-auth-error" aria-live="polite"></div>
      </form>`;
    target.hidden = false;

    const form = target.querySelector("#permissionTeamForm");
    const select = target.querySelector("#permissionTeamSelect");
    const error = target.querySelector("#permissionTeamError");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      error.textContent = "";
      const value = select?.value || "";
      if (!TEAM_IDS.includes(value)) {
        error.textContent = "Selecteer eerst een team.";
        select?.focus();
        return;
      }
      selectedTeam = value;
      showNameStep();
    });
    focusSoon("#permissionTeamSelect");
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
        <p>Typ hier je Team Wachtwoord voor <strong>${escapeHtml(selectedTeam)}</strong>:</p>
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
      if (!password || !selectedTeam || authPending) return;
      authPending = true;
      authError.textContent = "";
      submitButton.disabled = true;

      rosterId.value = selectedTeam;
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
      if (authError) authError.textContent = "Het Team Wachtwoord is niet juist voor het geselecteerde team.";
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
