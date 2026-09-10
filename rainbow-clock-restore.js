(() => {
  "use strict";

  const CLOCK_ID = "startHeaderClock";
  const STYLE_ID = "rainbowClockRestoreStyle";
  const TIME_ZONE = "Europe/Amsterdam";
  let timer = 0;
  let applying = false;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${CLOCK_ID}.portal-home-v2-clock {
        padding: 10px 18px !important;
        border-radius: 16px !important;
        background: rgba(15,18,24,.82) !important;
        box-shadow: 0 12px 28px rgba(0,0,0,.28) !important;
      }

      #${CLOCK_ID} .portal-eye-clock.portal-rainbow-clock {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0 !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        color: transparent !important;
        font-family: "Arial Black", "Segoe UI Black", "Courier New", monospace !important;
        font-size: clamp(54px, 6vw, 96px) !important;
        font-weight: 1000 !important;
        line-height: .95 !important;
        letter-spacing: -.055em !important;
        white-space: nowrap !important;
        font-variant-numeric: tabular-nums !important;
        background: linear-gradient(90deg,#ff46dd 0%,#ff6f47 22%,#ffe84f 45%,#8eff5c 68%,#4eeaff 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        filter: drop-shadow(0 0 8px rgba(255,220,80,.26)) !important;
        text-shadow: none !important;
      }

      #${CLOCK_ID} .portal-time-eye,
      #${CLOCK_ID} .portal-eye-digit,
      #${CLOCK_ID} .portal-eye-pair,
      #${CLOCK_ID} .portal-eye-colon {
        display: none !important;
      }

      @media (max-width: 780px) {
        #${CLOCK_ID} .portal-eye-clock.portal-rainbow-clock {
          font-size: clamp(42px, 12vw, 68px) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function timeText() {
    const parts = new Intl.DateTimeFormat("nl-NL", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    const read = (type) => parts.find((part) => part.type === type)?.value || "00";
    return `${read("hour").padStart(2,"0")}:${read("minute").padStart(2,"0")}:${read("second").padStart(2,"0")}`;
  }

  function apply() {
    if (applying) return;
    const clock = document.getElementById(CLOCK_ID);
    if (!clock) return;

    ensureStyle();
    applying = true;
    try {
      clock.classList.add("portal-home-v2-clock");
      clock.removeAttribute("data-weather-live-clock");
      clock.setAttribute("aria-label", "Huidige tijd");
      clock.setAttribute("role", "timer");

      let display = clock.querySelector(".portal-rainbow-clock");
      if (!display) {
        clock.innerHTML = '<div class="portal-eye-clock portal-rainbow-clock" data-rainbow-time></div>';
        display = clock.querySelector(".portal-rainbow-clock");
      }
      const next = timeText();
      if (display && display.textContent !== next) display.textContent = next;
    } finally {
      applying = false;
    }
  }

  apply();
  timer = window.setInterval(apply, 250);

  const observer = new MutationObserver(() => {
    if (!applying) requestAnimationFrame(apply);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
