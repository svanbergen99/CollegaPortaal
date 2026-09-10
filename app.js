"use strict";

const timezone = "Europe/Amsterdam";
const dateFormatter = new Intl.DateTimeFormat("nl-NL", { timeZone: timezone, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("nl-NL", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
const byId = (id) => document.getElementById(id);

function updateClock() {
  const now = new Date();
  byId("time").textContent = timeFormatter.format(now);
  byId("time2").textContent = timeFormatter.format(now);
  byId("date").textContent = dateFormatter.format(now);
  byId("date2").textContent = dateFormatter.format(now);
}

function weatherLabel(code) {
  return code > 60 ? "Regenachtig" : code > 2 ? "Bewolkt" : "Helder";
}

function addWeatherItem(container, name, current) {
  const temperature = Number(current?.temperature_2m);
  const code = Number(current?.weather_code);
  if (!Number.isFinite(temperature) || !Number.isFinite(code)) return;
  const item = document.createElement("div");
  item.className = "weather-item";
  const location = document.createElement("span");
  location.textContent = name;
  const value = document.createElement("strong");
  value.textContent = `${Math.round(temperature)} °C`;
  const condition = document.createElement("span");
  condition.textContent = weatherLabel(code);
  item.append(location, value, condition);
  container.append(item);
}

async function loadWeather() {
  const container = byId("weather");
  try {
    const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=51.9225,52.21&longitude=4.47917,5.96944&current=temperature_2m,weather_code&timezone=Europe%2FAmsterdam", { cache: "no-store" });
    if (!response.ok) throw new Error("Weerdienst niet beschikbaar");
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== 2) throw new Error("Ongeldig weerantwoord");
    container.replaceChildren();
    addWeatherItem(container, "Rotterdam", data[0].current);
    addWeatherItem(container, "Apeldoorn", data[1].current);
    if (!container.childElementCount) throw new Error("Onvolledige weergegevens");
  } catch {
    container.textContent = "Weer tijdelijk niet beschikbaar";
  }
}

function openPortal() {
  byId("welcome").hidden = true;
}

byId("enter").addEventListener("click", openPortal);

let uSequence = "";
let lastKeyAt = 0;

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;

  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;

  const now = Date.now();
  if (now - lastKeyAt > 2000) uSequence = "";
  lastKeyAt = now;

  if (event.key.toLowerCase() === "u") {
    uSequence += "u";
    if (uSequence === "uuu") {
      openPortal();
      uSequence = "";
    }
    return;
  }

  uSequence = "";
});

updateClock();
setInterval(updateClock, 1000);
void loadWeather();
