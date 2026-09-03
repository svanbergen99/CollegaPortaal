(() => {
  "use strict";

  const MIN_BRIGHTNESS = 1;
  const MAX_BRIGHTNESS = 100;
  const DEFAULT_BRIGHTNESS = 18;
  const app = document.getElementById("app");
  const searchCard = document.querySelector(".search-card");
  if (!app || !searchCard) return;

  let userAdjusted = false;

  function clampBrightness(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_BRIGHTNESS;
    return Math.min(MAX_BRIGHTNESS, Math.max(MIN_BRIGHTNESS, Math.round(number)));
  }

  function brightnessFromCurrentOverlay() {
    const alpha = Number.parseFloat(getComputedStyle(document.body).getPropertyValue("--background-overlay-alpha"));
    if (!Number.isFinite(alpha)) return DEFAULT_BRIGHTNESS;
    return clampBrightness((1 - alpha) * 100);
  }

  function applyBrightness(value) {
    const brightness = clampBrightness(value);
    const overlayAlpha = Math.min(.99, Math.max(0, 1 - brightness / 100));
    document.body.style.setProperty("--background-overlay-alpha", overlayAlpha.toFixed(2));
    const output = document.getElementById("backgroundBrightnessValue");
    const slider = document.getElementById("backgroundBrightnessSlider");
    if (output) output.textContent = `${brightness}%`;
    if (slider && Number(slider.value) !== brightness) slider.value = String(brightness);
  }

  function ensureControl() {
    let control = document.getElementById("backgroundBrightnessBar");
    if (control) return control;

    const brightness = brightnessFromCurrentOverlay();
    control = document.createElement("div");
    control.id = "backgroundBrightnessBar";
    control.className = "background-brightness-bar";
    control.innerHTML = `
      <label class="background-brightness-label" for="backgroundBrightnessSlider">Achtergrond helderheid</label>
      <input class="background-brightness-slider" id="backgroundBrightnessSlider" type="range" min="1" max="100" step="1" value="${brightness}" aria-label="Achtergrond helderheid van 1 tot 100 procent">
      <output class="background-brightness-value" id="backgroundBrightnessValue" for="backgroundBrightnessSlider">${brightness}%</output>`;

    const teamContactsBar = document.getElementById("teamContactsBar");
    const nextShiftBar = document.getElementById("nextShiftBar");
    const salaryBar = document.getElementById("nextSalaryPaymentBar");
    if (teamContactsBar) teamContactsBar.after(control);
    else if (nextShiftBar) nextShiftBar.after(control);
    else if (salaryBar) salaryBar.after(control);
    else {
      const titleRow = searchCard.querySelector(".roster-title-row");
      const title = searchCard.querySelector(":scope > h1");
      (titleRow || title || searchCard.firstElementChild)?.before(control);
    }

    control.querySelector("#backgroundBrightnessSlider")?.addEventListener("input", (event) => {
      userAdjusted = true;
      applyBrightness(event.currentTarget.value);
    });

    return control;
  }

  function render() {
    if (app.hidden) return;
    const control = ensureControl();
    const teamContactsBar = document.getElementById("teamContactsBar");
    if (teamContactsBar && teamContactsBar.nextElementSibling !== control) teamContactsBar.after(control);
    control.hidden = false;
  }

  const themeObserver = new MutationObserver(() => {
    if (userAdjusted || app.hidden) return;
    const brightness = brightnessFromCurrentOverlay();
    const slider = document.getElementById("backgroundBrightnessSlider");
    const output = document.getElementById("backgroundBrightnessValue");
    if (slider) slider.value = String(brightness);
    if (output) output.textContent = `${brightness}%`;
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  window.addEventListener("rooster-unlocked", render);
  window.addEventListener("rooster-months-updated", render);
  if (!app.hidden) render();
})();
