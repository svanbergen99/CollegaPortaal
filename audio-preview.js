(() => {
  "use strict";

  const GROUPS = [
    {
      title: "Feestdagen & speciale dagen",
      items: [
        ["nieuwjaar", "🎆 Nieuwjaar"],
        ["valentijn", "💗 Valentijnsdag"],
        ["pasen", "🌷 Pasen"],
        ["koningsdag", "👑 Koningsdag"],
        ["suikerfeest", "🌙 Suikerfeest"],
        ["halloween", "👻 Halloween"],
        ["sinterklaas", "🔔 Sinterklaas"],
        ["kerst", "🎄 Kerstmis"],
        ["oudjaar", "🥂 Oudjaar"]
      ]
    },
    {
      title: "Seizoenen & sfeer",
      items: [
        ["lente", "🐦 Lente / vogels"],
        ["zomer", "🌊 Zomer / zee"],
        ["herfst", "🌧️ Herfst / regen"],
        ["winter", "❄️ Winter / wind"]
      ]
    }
  ];

  let audioContext = null;
  let masterGain = null;
  let activeSources = new Set();
  let currentKey = "";

  function context() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      audioContext = new AudioContext();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.32;
      masterGain.connect(audioContext.destination);
    }
    return audioContext;
  }

  function track(source) {
    activeSources.add(source);
    source.addEventListener?.("ended", () => activeSources.delete(source), { once: true });
    return source;
  }

  function setPlayingState(key = "") {
    currentKey = key;
    document.querySelectorAll(".audio-preview-item").forEach((button) => {
      button.classList.toggle("is-playing", button.dataset.audioPreview === key);
    });
  }

  function setStatus(text = "") {
    const status = document.getElementById("audioPreviewStatus");
    if (status) status.textContent = text;
  }

  function stopPlayback(showStatus = true) {
    activeSources.forEach((source) => {
      try { source.stop(); } catch (_) {}
    });
    activeSources.clear();
    setPlayingState("");
    if (showStatus) setStatus("Audio gestopt.");
  }

  function tone(freq, start, duration, volume = 0.18, type = "sine", endFreq = null) {
    const ctx = context();
    if (!ctx) return;
    const osc = track(ctx.createOscillator());
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), start);
    if (endFreq && endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function noise(start, duration, volume = 0.12, filterType = "lowpass", frequency = 1200) {
    const ctx = context();
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = track(ctx.createBufferSource());
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  function bells(notes, start, spacing = 0.24, duration = 0.55, volume = 0.12) {
    notes.forEach((freq, index) => {
      const when = start + index * spacing;
      tone(freq, when, duration, volume, "sine");
      tone(freq * 2, when, duration * 0.68, volume * 0.28, "sine");
    });
  }

  const sounds = {
    nieuwjaar(start) {
      noise(start, 0.6, 0.15, "highpass", 950);
      bells([784, 988, 1175, 1568], start + 0.15, 0.16, 0.5, 0.11);
      noise(start + 0.9, 0.55, 0.13, "highpass", 1300);
      bells([988, 1319, 1568], start + 1.05, 0.13, 0.45, 0.1);
      noise(start + 1.7, 0.65, 0.16, "highpass", 800);
    },
    valentijn(start) {
      bells([523.25, 659.25, 783.99, 1046.5], start, 0.28, 0.85, 0.09);
      tone(659.25, start + 1.15, 0.9, 0.06, "sine", 783.99);
    },
    pasen(start) {
      [0, 0.38, 0.8].forEach((offset, index) => {
        tone(1300 + index * 120, start + offset, 0.17, 0.07, "sine", 1850 + index * 100);
      });
      bells([659.25, 783.99, 987.77], start + 0.25, 0.34, 0.62, 0.08);
    },
    koningsdag(start) {
      [523.25, 659.25, 783.99].forEach((freq) => tone(freq, start, 0.7, 0.055, "sawtooth"));
      [659.25, 783.99, 1046.5].forEach((freq) => tone(freq, start + 0.78, 0.7, 0.05, "sawtooth"));
      [783.99, 987.77, 1174.66].forEach((freq) => tone(freq, start + 1.55, 0.9, 0.048, "sawtooth"));
    },
    suikerfeest(start) {
      bells([440, 523.25, 659.25, 783.99, 659.25], start, 0.3, 0.78, 0.075);
      tone(329.63, start + 0.2, 1.8, 0.025, "sine");
    },
    halloween(start) {
      tone(220, start, 2.2, 0.08, "sine", 55);
      tone(311.13, start + 0.35, 1.4, 0.035, "triangle", 233.08);
      noise(start + 0.2, 1.8, 0.035, "bandpass", 700);
      bells([369.99, 523.25], start + 1.0, 0.33, 0.8, 0.05);
    },
    sinterklaas(start) {
      bells([659.25, 783.99, 880, 783.99, 659.25, 987.77], start, 0.2, 0.5, 0.095);
      bells([783.99, 987.77, 1174.66], start + 1.35, 0.2, 0.55, 0.08);
    },
    kerst(start) {
      bells([659.25, 659.25, 659.25, 659.25, 659.25, 659.25, 659.25, 783.99, 523.25, 587.33, 659.25], start, 0.19, 0.48, 0.085);
    },
    oudjaar(start) {
      [0, 0.42, 0.84].forEach((offset) => {
        tone(1100, start + offset, 0.06, 0.06, "square");
        tone(700, start + offset + 0.08, 0.08, 0.045, "square");
      });
      noise(start + 1.25, 0.7, 0.16, "highpass", 900);
      bells([784, 988, 1319, 1568], start + 1.35, 0.14, 0.48, 0.09);
    },
    lente(start) {
      [0, 0.3, 0.67, 1.15, 1.48].forEach((offset, index) => {
        tone(1250 + (index % 3) * 180, start + offset, 0.14, 0.06, "sine", 1800 + (index % 2) * 300);
      });
      noise(start, 2.0, 0.018, "lowpass", 1800);
    },
    zomer(start) {
      noise(start, 1.25, 0.08, "lowpass", 650);
      noise(start + 0.85, 1.35, 0.095, "lowpass", 520);
      noise(start + 1.8, 1.2, 0.075, "lowpass", 720);
    },
    herfst(start) {
      noise(start, 3.0, 0.075, "highpass", 2200);
      [0.25, 0.58, 1.02, 1.48, 2.1, 2.55].forEach((offset, index) => {
        tone(1100 + (index % 3) * 190, start + offset, 0.1, 0.025, "sine", 760);
      });
    },
    winter(start) {
      noise(start, 3.0, 0.055, "bandpass", 420);
      tone(260, start + 0.1, 2.6, 0.025, "sine", 180);
      bells([1046.5, 1318.5, 1568], start + 0.9, 0.42, 0.8, 0.045);
    }
  };

  async function playPreview(key, label) {
    const ctx = context();
    if (!ctx) {
      setStatus("Deze browser ondersteunt de audiovoorbeelden niet.");
      return;
    }
    stopPlayback(false);
    try { await ctx.resume(); } catch (_) {}
    setPlayingState(key);
    setStatus(`Nu speelt: ${label}`);
    const start = ctx.currentTime + 0.05;
    sounds[key]?.(start);
    window.setTimeout(() => {
      if (currentKey === key) setPlayingState("");
    }, 4200);
  }

  function closeThemeAndEffects() {
    const themePanel = document.getElementById("themeCustomizerPanel");
    const themeButton = document.getElementById("themeCustomizerButton");
    if (themePanel && !themePanel.hidden) themePanel.hidden = true;
    themeButton?.setAttribute("aria-expanded", "false");

    const effectsMenu = document.getElementById("effectsMenu");
    const effectsButton = document.getElementById("effectsButton");
    if (effectsMenu && !effectsMenu.hidden) effectsMenu.hidden = true;
    effectsButton?.setAttribute("aria-expanded", "false");
  }

  function setup(attempt = 0) {
    const button = document.getElementById("audioSettingsButton");
    const sideButtons = document.getElementById("themeSideButtons");
    if (!button || !sideButtons) {
      if (attempt < 50) setTimeout(() => setup(attempt + 1), 80);
      return;
    }
    if (document.getElementById("audioPreviewMenu")) return;

    button.removeAttribute("title");
    button.setAttribute("aria-disabled", "false");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "audioPreviewMenu");
    button.textContent = "Audio ▾";

    const wrap = document.createElement("div");
    wrap.className = "audio-menu-wrap";
    sideButtons.insertBefore(wrap, button);
    wrap.appendChild(button);

    const menu = document.createElement("section");
    menu.id = "audioPreviewMenu";
    menu.className = "audio-preview-menu";
    menu.hidden = true;
    menu.innerHTML = `
      <div class="audio-preview-head">
        <div>
          <h2>Audio beluisteren</h2>
          <p>Proefgeluiden. Kies er één om los te beluisteren.</p>
        </div>
        <button id="audioStopButton" class="audio-stop-button" type="button">Stop</button>
      </div>
      <div class="audio-volume-row">
        <label for="audioPreviewVolume">Volume</label>
        <input id="audioPreviewVolume" type="range" min="0" max="100" value="32" step="1">
        <output id="audioPreviewVolumeValue" for="audioPreviewVolume">32%</output>
      </div>
      <div class="audio-preview-groups">
        ${GROUPS.map((group) => `
          <section class="audio-preview-group">
            <h3>${group.title}</h3>
            <div class="audio-preview-list">
              ${group.items.map(([key, label]) => `<button class="audio-preview-item" type="button" data-audio-preview="${key}" data-audio-label="${label}">${label}</button>`).join("")}
            </div>
          </section>`).join("")}
      </div>
      <div id="audioPreviewStatus" class="audio-preview-status" aria-live="polite"></div>`;
    wrap.appendChild(menu);

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const opening = menu.hidden;
      closeThemeAndEffects();
      menu.hidden = !opening;
      button.setAttribute("aria-expanded", String(opening));
    });

    menu.addEventListener("click", (event) => {
      event.stopPropagation();
      const preview = event.target.closest("[data-audio-preview]");
      if (!preview) return;
      playPreview(preview.dataset.audioPreview, preview.dataset.audioLabel || preview.textContent.trim());
    });

    menu.querySelector("#audioStopButton")?.addEventListener("click", () => stopPlayback(true));

    const volume = menu.querySelector("#audioPreviewVolume");
    const volumeValue = menu.querySelector("#audioPreviewVolumeValue");
    volume?.addEventListener("input", () => {
      const value = Math.max(0, Math.min(100, Number(volume.value) || 0));
      if (volumeValue) volumeValue.textContent = `${value}%`;
      if (masterGain && audioContext) {
        masterGain.gain.setTargetAtTime(value / 100, audioContext.currentTime, 0.02);
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".audio-menu-wrap")) return;
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || menu.hidden) return;
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.focus();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setup(), { once: true });
  } else {
    setup();
  }
})();
