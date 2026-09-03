(() => {
  "use strict";

  const EFFECTS = [
    { id: "snow", label: "Sneeuw", icon: "❄️" },
    { id: "fireworks", label: "Vuurwerk", icon: "🎆" },
    { id: "confetti", label: "Confetti", icon: "🎉" },
    { id: "streamers", label: "Slingers", icon: "🎊" },
    { id: "orange", label: "Oranje feest", icon: "🧡" },
    { id: "hearts", label: "Hartjes", icon: "❤️" },
    { id: "balloons", label: "Ballonnen", icon: "🎈" },
    { id: "stars", label: "Sterrenregen", icon: "✨" },
    { id: "petals", label: "Bloemblaadjes", icon: "🌸" },
    { id: "easter", label: "Paaseieren", icon: "🐣" },
    { id: "autumn", label: "Herfstbladeren", icon: "🍂" },
    { id: "halloween", label: "Halloween", icon: "🦇" },
    { id: "sinterklaas", label: "Sinterklaas", icon: "🎁" },
    { id: "christmas", label: "Kerstmis", icon: "🎄" },
    { id: "eid", label: "Suikerfeest", icon: "🌙" }
  ];

  const COLORS = ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
  const ORANGE_COLORS = ["#ff6b00", "#ff8c00", "#ffa500", "#ffb347", "#f97316", "#ffffff", "#21468b", "#ae1c28"];
  const FIREWORK_COLORS = ["#ff4d6d", "#ffd166", "#06d6a0", "#4cc9f0", "#9b5de5", "#f72585", "#ffffff"];

  let canvas = null;
  let ctx = null;
  let particles = [];
  let animationFrame = 0;
  let endAt = 0;
  let lastTime = 0;
  let fireworkTimers = [];
  let effectsMenu = null;
  let effectsButton = null;

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(values) {
    return values[Math.floor(Math.random() * values.length)];
  }

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.className = "effect-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resizeCanvas();
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clearTimers() {
    fireworkTimers.forEach((timer) => clearTimeout(timer));
    fireworkTimers = [];
  }

  function stopEffect() {
    clearTimers();
    particles = [];
    endAt = 0;
    lastTime = 0;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (ctx && canvas) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function particleBase(overrides = {}) {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gravity: 0,
      drag: 1,
      size: 14,
      rotation: 0,
      rotationSpeed: 0,
      opacity: 1,
      life: 1,
      maxLife: 1,
      kind: "emoji",
      text: "•",
      color: "#fff",
      lineWidth: 2,
      wobble: 0,
      wobbleSpeed: 0,
      ...overrides
    };
  }

  function addFallingEmoji(count, texts, options = {}) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let index = 0; index < count; index += 1) {
      particles.push(particleBase({
        x: random(-20, width + 20),
        y: random(-height * 0.85, height * 0.15),
        vx: random(options.vxMin ?? -18, options.vxMax ?? 18),
        vy: random(options.vyMin ?? 45, options.vyMax ?? 105),
        gravity: options.gravity ?? 3,
        drag: options.drag ?? 1,
        size: random(options.sizeMin ?? 16, options.sizeMax ?? 30),
        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-1.3, 1.3),
        kind: "emoji",
        text: pick(texts),
        wobble: random(0, Math.PI * 2),
        wobbleSpeed: random(1.3, 3.2),
        life: random(5.5, 9),
        maxLife: 9
      }));
    }
  }

  function addRisingEmoji(count, texts, options = {}) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let index = 0; index < count; index += 1) {
      particles.push(particleBase({
        x: random(15, width - 15),
        y: random(height + 20, height * 1.9),
        vx: random(options.vxMin ?? -12, options.vxMax ?? 12),
        vy: random(options.vyMin ?? -85, options.vyMax ?? -48),
        gravity: options.gravity ?? -1,
        size: random(options.sizeMin ?? 22, options.sizeMax ?? 38),
        rotation: random(-0.18, 0.18),
        rotationSpeed: random(-0.16, 0.16),
        kind: "emoji",
        text: pick(texts),
        wobble: random(0, Math.PI * 2),
        wobbleSpeed: random(1, 2.2),
        life: random(6, 10),
        maxLife: 10
      }));
    }
  }

  function addConfetti(count, palette = COLORS) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let index = 0; index < count; index += 1) {
      particles.push(particleBase({
        x: random(-10, width + 10),
        y: random(-height * 0.8, 20),
        vx: random(-34, 34),
        vy: random(95, 185),
        gravity: random(20, 42),
        drag: .997,
        size: random(6, 12),
        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-5, 5),
        kind: "confetti",
        color: pick(palette),
        wobble: random(0, Math.PI * 2),
        wobbleSpeed: random(3, 7),
        life: random(4.5, 7.5),
        maxLife: 7.5
      }));
    }
  }

  function addStreamers(count) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let index = 0; index < count; index += 1) {
      particles.push(particleBase({
        x: random(0, width),
        y: random(-height * 0.8, 10),
        vx: random(-24, 24),
        vy: random(75, 135),
        gravity: 12,
        size: random(18, 35),
        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-2.8, 2.8),
        kind: "streamer",
        color: pick(COLORS),
        wobble: random(0, Math.PI * 2),
        wobbleSpeed: random(2, 5),
        life: random(5, 8),
        maxLife: 8
      }));
    }
  }

  function addSnow(count) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let index = 0; index < count; index += 1) {
      particles.push(particleBase({
        x: random(0, width),
        y: random(-height, height * 0.05),
        vx: random(-11, 11),
        vy: random(25, 64),
        gravity: 0,
        size: random(8, 18),
        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-.35, .35),
        kind: "snow",
        color: pick(["#ffffff", "#e0f2fe", "#dbeafe"]),
        wobble: random(0, Math.PI * 2),
        wobbleSpeed: random(.8, 1.9),
        life: random(7, 12),
        maxLife: 12
      }));
    }
  }

  function addFireworkBurst(x, y, amount = 62) {
    const color = pick(FIREWORK_COLORS);
    for (let index = 0; index < amount; index += 1) {
      const angle = random(0, Math.PI * 2);
      const speed = random(70, 245);
      particles.push(particleBase({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 90,
        drag: .985,
        size: random(1.5, 3.4),
        kind: "spark",
        color: Math.random() < .18 ? "#ffffff" : color,
        opacity: 1,
        life: random(1.15, 2),
        maxLife: 2
      }));
    }
  }

  function scheduleFireworks() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const bursts = 9;
    for (let index = 0; index < bursts; index += 1) {
      const timer = setTimeout(() => {
        addFireworkBurst(random(width * .12, width * .88), random(height * .12, height * .58), Math.round(random(48, 76)));
      }, index * 520 + random(0, 260));
      fireworkTimers.push(timer);
    }
  }

  function startEffect(type) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    stopEffect();
    ensureCanvas();
    resizeCanvas();

    const width = window.innerWidth;
    const baseCount = Math.max(60, Math.min(190, Math.round(width / 7)));
    let duration = 7000;

    switch (type) {
      case "snow":
        addSnow(baseCount);
        duration = 9000;
        break;
      case "fireworks":
        scheduleFireworks();
        duration = 6200;
        break;
      case "confetti":
        addConfetti(baseCount + 45);
        break;
      case "streamers":
        addStreamers(Math.round(baseCount * .7));
        break;
      case "orange":
        addConfetti(baseCount + 55, ORANGE_COLORS);
        break;
      case "hearts":
        addFallingEmoji(Math.round(baseCount * .7), ["❤️", "🩷", "💗", "💖"], { sizeMin: 17, sizeMax: 29, vyMin: 48, vyMax: 94 });
        break;
      case "balloons":
        addRisingEmoji(Math.round(baseCount * .38), ["🎈"], { sizeMin: 25, sizeMax: 42 });
        duration = 8500;
        break;
      case "stars":
        addFallingEmoji(Math.round(baseCount * .75), ["✨", "⭐", "🌟"], { sizeMin: 15, sizeMax: 28, vyMin: 42, vyMax: 90 });
        break;
      case "petals":
        addFallingEmoji(Math.round(baseCount * .7), ["🌸", "🌺", "🌼"], { sizeMin: 15, sizeMax: 26, vyMin: 38, vyMax: 78, vxMin: -26, vxMax: 26 });
        break;
      case "easter":
        addFallingEmoji(Math.round(baseCount * .62), ["🥚", "🐣", "🐰", "🌷"], { sizeMin: 18, sizeMax: 30, vyMin: 48, vyMax: 90 });
        break;
      case "autumn":
        addFallingEmoji(Math.round(baseCount * .72), ["🍂", "🍁", "🍃"], { sizeMin: 17, sizeMax: 30, vyMin: 42, vyMax: 86, vxMin: -34, vxMax: 34 });
        break;
      case "halloween":
        addFallingEmoji(Math.round(baseCount * .6), ["🦇", "🎃", "👻", "🕷️"], { sizeMin: 18, sizeMax: 31, vyMin: 50, vyMax: 98 });
        break;
      case "sinterklaas":
        addFallingEmoji(Math.round(baseCount * .62), ["🎁", "🍪", "⭐", "🎀"], { sizeMin: 17, sizeMax: 29, vyMin: 52, vyMax: 98 });
        break;
      case "christmas":
        addFallingEmoji(Math.round(baseCount * .72), ["❄️", "🎄", "🔔", "⭐", "🎁"], { sizeMin: 16, sizeMax: 29, vyMin: 43, vyMax: 88 });
        break;
      case "eid":
        addFallingEmoji(Math.round(baseCount * .64), ["🌙", "⭐", "✨", "🌟"], { sizeMin: 17, sizeMax: 29, vyMin: 40, vyMax: 80 });
        break;
      default:
        return;
    }

    endAt = performance.now() + duration;
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(animate);
  }

  function drawParticle(particle) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.opacity));
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);

    if (particle.kind === "confetti") {
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size * .55, -particle.size * .25, particle.size * 1.1, particle.size * .5);
    } else if (particle.kind === "streamer") {
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-particle.size, 0);
      ctx.bezierCurveTo(-particle.size * .35, -10, particle.size * .35, 10, particle.size, 0);
      ctx.stroke();
    } else if (particle.kind === "spark") {
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (particle.kind === "snow") {
      ctx.fillStyle = particle.color;
      ctx.shadowColor = "rgba(15, 23, 42, .22)";
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * .32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.font = `${particle.size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(particle.text, 0, 0);
    }

    ctx.restore();
  }

  function animate(now) {
    if (!ctx || !canvas) return;
    const delta = Math.min(.04, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const particle of particles) {
      particle.life -= delta;
      particle.wobble += particle.wobbleSpeed * delta;
      particle.vx *= Math.pow(particle.drag, delta * 60);
      particle.vy += particle.gravity * delta;
      particle.x += (particle.vx + Math.sin(particle.wobble) * 8) * delta;
      particle.y += particle.vy * delta;
      particle.rotation += particle.rotationSpeed * delta;
      if (particle.life < .8) particle.opacity = Math.max(0, particle.life / .8);
      drawParticle(particle);
    }

    particles = particles.filter((particle) => {
      if (particle.life <= 0) return false;
      if (particle.x < -120 || particle.x > window.innerWidth + 120) return false;
      if (particle.y < -180 || particle.y > window.innerHeight + 180) return false;
      return true;
    });

    if (now < endAt || particles.length) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      stopEffect();
    }
  }

  function closeMenu() {
    if (!effectsMenu || !effectsButton) return;
    effectsMenu.hidden = true;
    effectsButton.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    if (!effectsMenu || !effectsButton) return;
    effectsMenu.hidden = false;
    effectsButton.setAttribute("aria-expanded", "true");
  }

  function buildInterface() {
    const actionRow = document.querySelector(".today-workers-action");
    if (!actionRow || document.getElementById("effectsButton")) return;

    const wrap = document.createElement("div");
    wrap.className = "effects-menu-wrap";

    effectsButton = document.createElement("button");
    effectsButton.id = "effectsButton";
    effectsButton.className = "effects-button";
    effectsButton.type = "button";
    effectsButton.setAttribute("aria-haspopup", "menu");
    effectsButton.setAttribute("aria-expanded", "false");
    effectsButton.innerHTML = 'Effecten <span class="effects-button-caret" aria-hidden="true">▾</span>';

    effectsMenu = document.createElement("div");
    effectsMenu.id = "effectsMenu";
    effectsMenu.className = "effects-menu";
    effectsMenu.setAttribute("role", "menu");
    effectsMenu.hidden = true;

    effectsMenu.innerHTML = EFFECTS.map((effect) => `
      <button class="effects-menu-item" type="button" role="menuitem" data-effect="${effect.id}">
        <span class="effects-menu-icon" aria-hidden="true">${effect.icon}</span>
        <span>${effect.label}</span>
      </button>`).join("") + `
      <div class="effects-menu-separator" role="separator"></div>
      <button class="effects-menu-item stop-effect" type="button" role="menuitem" data-effect="stop">
        <span class="effects-menu-icon" aria-hidden="true">✕</span>
        <span>Effect stoppen</span>
      </button>`;

    wrap.append(effectsButton, effectsMenu);
    actionRow.appendChild(wrap);

    effectsButton.addEventListener("click", () => {
      if (effectsMenu.hidden) openMenu();
      else closeMenu();
    });

    effectsMenu.addEventListener("click", (event) => {
      const item = event.target.closest("[data-effect]");
      if (!item) return;
      const effect = item.dataset.effect;
      closeMenu();
      if (effect === "stop") stopEffect();
      else startEffect(effect);
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".effects-menu-wrap")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && effectsMenu && !effectsMenu.hidden) {
        closeMenu();
        effectsButton.focus();
      }
    });
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildInterface, { once: true });
  } else {
    buildInterface();
  }

  window.RoosterEffects = {
    start: startEffect,
    stop: stopEffect,
    list: () => EFFECTS.map(({ id, label }) => ({ id, label }))
  };
})();
