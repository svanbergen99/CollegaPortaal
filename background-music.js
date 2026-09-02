(() => {
  "use strict";

  const AUDIO_FILE = "Y2Mate.is - Three Little Birds  Dont Worry About a Thing  - Bob Marley.mp3";
  const DEFAULT_VOLUME_PERCENT = 10;
  const ENABLED_STORAGE_KEY = "rooster-background-music";
  const VOLUME_STORAGE_KEY = "rooster-background-music-volume";

  const app = document.getElementById("app");
  if (!app) return;

  const audio = new Audio();
  audio.src = encodeURI(AUDIO_FILE);
  audio.loop = true;
  audio.preload = "metadata";

  let button = null;
  let volumeInput = null;
  let volumeLabel = null;
  let resumeCleanup = null;

  function storedEnabled() {
    try {
      return localStorage.getItem(ENABLED_STORAGE_KEY) !== "off";
    } catch (_) {
      return true;
    }
  }

  function saveEnabled(enabled) {
    try {
      localStorage.setItem(ENABLED_STORAGE_KEY, enabled ? "on" : "off");
    } catch (_) {}
  }

  function clampVolume(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_VOLUME_PERCENT;
    return Math.min(100, Math.max(0, Math.round(number)));
  }

  function storedVolumePercent() {
    try {
      const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
      return saved === null ? DEFAULT_VOLUME_PERCENT : clampVolume(saved);
    } catch (_) {
      return DEFAULT_VOLUME_PERCENT;
    }
  }

  function saveVolumePercent(value) {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(clampVolume(value)));
    } catch (_) {}
  }

  function applyVolume(value, persist = false) {
    const percent = clampVolume(value);
    audio.volume = percent / 100;
    if (volumeInput) volumeInput.value = String(percent);
    if (volumeLabel) volumeLabel.textContent = `Volume ${percent}%`;
    if (persist) saveVolumePercent(percent);
    renderButton();
  }

  function renderButton() {
    if (!button) return;
    const playing = !audio.paused;
    const percent = Math.round(audio.volume * 100);
    button.textContent = playing ? "Muziek uit" : "Muziek aan";
    button.setAttribute("aria-pressed", String(playing));
    button.title = `Achtergrondmuziek ${playing ? "uitzetten" : "aanzetten"} · volume ${percent}%`;
  }

  async function startMusic(persist = true) {
    try {
      await audio.play();
      if (persist) saveEnabled(true);
      renderButton();
      return true;
    } catch (_) {
      renderButton();
      return false;
    }
  }

  function clearResumeListener() {
    if (!resumeCleanup) return;
    resumeCleanup();
    resumeCleanup = null;
  }

  function stopMusic(persist = true) {
    audio.pause();
    if (persist) saveEnabled(false);
    clearResumeListener();
    renderButton();
  }

  function installResumeListener() {
    clearResumeListener();
    const resume = (event) => {
      if (!storedEnabled()) {
        clearResumeListener();
        return;
      }
      if (event.target?.closest?.(".music-control")) return;
      clearResumeListener();
      startMusic(false);
    };
    document.addEventListener("pointerdown", resume, true);
    document.addEventListener("keydown", resume, true);
    resumeCleanup = () => {
      document.removeEventListener("pointerdown", resume, true);
      document.removeEventListener("keydown", resume, true);
    };
  }

  function mountControls(attempt = 0) {
    const themeButton = document.querySelector(".theme-toggle");
    if (!themeButton && attempt < 50) {
      setTimeout(() => mountControls(attempt + 1), 50);
      return;
    }

    let controls = document.querySelector(".site-top-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "site-top-controls";
      app.appendChild(controls);
    }

    if (themeButton && themeButton.parentElement !== controls) controls.appendChild(themeButton);

    let musicControl = controls.querySelector(".music-control");
    if (!musicControl) {
      musicControl = document.createElement("div");
      musicControl.className = "music-control";
      musicControl.innerHTML = `
        <button id="musicToggleButton" type="button" class="music-toggle" aria-label="Zet achtergrondmuziek aan of uit"></button>
        <label class="music-volume-control">
          <span class="music-volume-label">Volume ${DEFAULT_VOLUME_PERCENT}%</span>
          <input class="music-volume-slider" type="range" min="0" max="100" step="1" value="${DEFAULT_VOLUME_PERCENT}" aria-label="Volume achtergrondmuziek">
        </label>`;
      controls.appendChild(musicControl);
    }

    button = musicControl.querySelector("#musicToggleButton");
    volumeInput = musicControl.querySelector(".music-volume-slider");
    volumeLabel = musicControl.querySelector(".music-volume-label");

    applyVolume(storedVolumePercent(), false);

    button.addEventListener("click", () => {
      if (audio.paused) {
        clearResumeListener();
        saveEnabled(true);
        startMusic(false);
      } else {
        stopMusic(true);
      }
    });

    volumeInput.addEventListener("input", () => {
      applyVolume(volumeInput.value, true);
    });

    audio.addEventListener("play", renderButton);
    audio.addEventListener("pause", renderButton);

    if (storedEnabled()) {
      startMusic(false).then((started) => {
        if (!started && storedEnabled()) installResumeListener();
      });
    } else {
      renderButton();
    }
  }

  mountControls();
})();
