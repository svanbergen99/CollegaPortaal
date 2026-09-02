(() => {
  "use strict";

  const AUDIO_FILE = "Y2Mate.is - Three Little Birds  Dont Worry About a Thing  - Bob Marley.mp3";
  const VOLUME = 0.30;
  const STORAGE_KEY = "rooster-background-music";

  const app = document.getElementById("app");
  if (!app) return;

  const audio = new Audio();
  audio.src = encodeURI(AUDIO_FILE);
  audio.loop = true;
  audio.preload = "metadata";
  audio.volume = VOLUME;

  let button = null;
  let controls = null;

  function storedEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "on";
    } catch (_) {
      return false;
    }
  }

  function saveEnabled(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch (_) {}
  }

  function renderButton() {
    if (!button) return;
    const playing = !audio.paused;
    button.textContent = playing ? "Muziek uit" : "Muziek aan";
    button.setAttribute("aria-pressed", String(playing));
    button.title = `Achtergrondmuziek ${playing ? "uitzetten" : "aanzetten"} · volume 30%`;
  }

  async function startMusic(persist = true) {
    audio.volume = VOLUME;
    try {
      await audio.play();
      if (persist) saveEnabled(true);
    } catch (_) {
      renderButton();
    }
  }

  function stopMusic(persist = true) {
    audio.pause();
    if (persist) saveEnabled(false);
  }

  function mountControls(attempt = 0) {
    const themeButton = document.querySelector(".theme-toggle");
    if (!themeButton && attempt < 50) {
      setTimeout(() => mountControls(attempt + 1), 50);
      return;
    }

    controls = document.querySelector(".site-top-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "site-top-controls";
      app.appendChild(controls);
    }

    if (themeButton && themeButton.parentElement !== controls) controls.appendChild(themeButton);

    button = document.getElementById("musicToggleButton");
    if (!button) {
      button = document.createElement("button");
      button.id = "musicToggleButton";
      button.type = "button";
      button.className = "music-toggle";
      button.setAttribute("aria-label", "Zet achtergrondmuziek aan of uit");
      controls.appendChild(button);
    }

    renderButton();

    button.addEventListener("click", () => {
      if (audio.paused) startMusic(true);
      else stopMusic(true);
    });

    audio.addEventListener("play", renderButton);
    audio.addEventListener("pause", renderButton);
    audio.addEventListener("volumechange", () => {
      if (Math.abs(audio.volume - VOLUME) > 0.001) audio.volume = VOLUME;
    });

    // Browsers blokkeren automatisch geluid zonder gebruikersactie.
    // Als muziek eerder aan stond, hervatten we daarom bij de eerste gewone klik/toets.
    if (storedEnabled()) {
      const resume = (event) => {
        if (event.target?.closest?.("#musicToggleButton")) return;
        document.removeEventListener("pointerdown", resume, true);
        document.removeEventListener("keydown", resume, true);
        startMusic(false);
      };
      document.addEventListener("pointerdown", resume, true);
      document.addEventListener("keydown", resume, true);
    }
  }

  mountControls();
})();
