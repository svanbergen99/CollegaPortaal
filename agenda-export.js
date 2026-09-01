(() => {
"use strict";
const bridge = window.RoosterAgendaBridge;
const rosterResult = document.getElementById("rosterResult");
if (!bridge || !rosterResult) return;
let lastCalendarExport = null;
let helpOverlay = null;
function todayKey() {
const now = new Date();
return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function formatTime(value) {
if (!value) return "";
const text = String(value);
const simple = text.match(/(?:T|^)(\d{2}):(\d{2})/);
if (simple) return `${simple[1]}:${simple[2]}`;
const plain = text.match(/^(\d{1,2}):(\d{2})$/);
if (plain) return `${plain[1].padStart(2, "0")}:${plain[2]}`;
return "";
}
function filePart(value) {
return String(value || "Rooster")
.normalize("NFD")
.replace(/\p{M}/gu, "")
.replace(/[^\p{L}\p{N}]+/gu, "_")
.replace(/^_+|_+$/g, "")
.slice(0, 70) || "Rooster";
}
function addDay(dateKey) {
const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
if (!match) return dateKey;
const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
date.setUTCDate(date.getUTCDate() + 1);
return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
function dateTimeParts(schedule, field) {
const raw = String(schedule?.[field] || "").trim();
const embeddedDate = raw.match(/^(\d{4}-\d{2}-\d{2})[T ]/i)?.[1] || "";
const date = embeddedDate || String(schedule?.date || "").slice(0, 10);
const time = formatTime(raw);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
return { date, time, embedded: Boolean(embeddedDate) };
}
function eventTiming(schedule) {
const start = dateTimeParts(schedule, "start");
const end = dateTimeParts(schedule, "end");
if (!start || !end) return null;
if (!end.embedded && end.date === start.date && end.time <= start.time) end.date = addDay(end.date);
return { start, end };
}
function compact(parts) {
return `${parts.date.replaceAll("-", "")}T${parts.time.replace(":", "")}00`;
}
function icsText(value) {
return String(value ?? "")
.replaceAll("\\", "\\\\")
.replaceAll(";", "\\;")
.replaceAll(",", "\\,")
.replace(/\r?\n/g, "\\n");
}
function exportSchedules(data) {
const schedules = Array.isArray(data?.schedules) ? [...data.schedules] : [];
schedules.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.start || "").localeCompare(String(b.start || "")));
return data.showFullRoster ? schedules : schedules.filter((schedule) => String(schedule.date || "").slice(0, 10) >= todayKey());
}
function buildIcs(data) {
const schedules = exportSchedules(data);
const events = schedules.map((schedule) => eventTiming(schedule)).filter(Boolean);
const periodLabel = data.periodLabel || "";
const calendarName = periodLabel ? `Rooster ${periodLabel}` : "Werkrooster";
const eventName = data.appointmentName || "Werkrooster";
const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const uidName = filePart(data.name || "medewerker").toLowerCase();
const lines = [
"BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Roosterhulp//Werkrooster//NL","CALSCALE:GREGORIAN","METHOD:PUBLISH",
`X-WR-CALNAME:${icsText(calendarName)}`,"X-WR-TIMEZONE:Europe/Amsterdam",
"BEGIN:VTIMEZONE","TZID:Europe/Amsterdam","X-LIC-LOCATION:Europe/Amsterdam",
"BEGIN:DAYLIGHT","TZOFFSETFROM:+0100","TZOFFSETTO:+0200","TZNAME:CEST","DTSTART:19700329T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU","END:DAYLIGHT",
"BEGIN:STANDARD","TZOFFSETFROM:+0200","TZOFFSETTO:+0100","TZNAME:CET","DTSTART:19701025T030000","RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD","END:VTIMEZONE"
];
events.forEach((timing) => {
const start = compact(timing.start);
const end = compact(timing.end);
lines.push("BEGIN:VEVENT",`UID:${uidName}-${start.toLowerCase()}@roosterhulp`,`DTSTAMP:${dtstamp}`,`DTSTART;TZID=Europe/Amsterdam:${start}`,`DTEND;TZID=Europe/Amsterdam:${end}`,`SUMMARY:${icsText(eventName)}`,"STATUS:CONFIRMED","TRANSP:OPAQUE","END:VEVENT");
});
lines.push("END:VCALENDAR");
const suffix = periodLabel ? `_${filePart(periodLabel)}` : "";
return {
content: `${lines.join("\r\n")}\r\n`,
filename: `Werkrooster_${filePart(data.name)}${suffix}.ics`,
count: events.length,
skipped: schedules.length - events.length,
scope: data.showFullRoster ? "volledige rooster" : "rooster vanaf vandaag"
};
}
function download(exportData) {
const blob = new Blob([exportData.content], { type: "text/calendar;charset=utf-8" });
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = exportData.filename;
document.body.appendChild(link);
link.click();
link.remove();
setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const providers = {
samsung: { title: "Samsung Agenda", steps: ["Open het gedownloade .ics-bestand vanuit Downloads of Mijn bestanden.","Kies Samsung Agenda als die als app wordt aangeboden en bevestig de import.","Wordt Samsung Agenda niet aangeboden? Importeer het bestand in het Google- of Microsoft-account dat met Samsung Agenda synchroniseert."] },
google: { title: "Google Agenda", steps: ["Open Google Agenda op een computer en ga naar Instellingen.","Kies links Importeren en exporteren en daarna Bestand selecteren op je computer.","Selecteer het opgeslagen .ics-bestand, kies de gewenste agenda en klik op Importeren."] },
apple: { title: "Apple Agenda", steps: ["Open het .ics-bestand. Als Apple Agenda het bestand direct herkent, kies je de agenda waarin je de werkdagen wilt zetten en bevestig je de import.","Op een Mac kan dit ook via Agenda > Archief > Importeer en vervolgens het opgeslagen .ics-bestand selecteren.","Als je iCloud Agenda gebruikt, worden de geïmporteerde afspraken daarna met je andere Apple-apparaten gesynchroniseerd."] },
microsoft: { title: "Outlook / Teams Agenda", steps: ["Gebruik Outlook Agenda met hetzelfde Microsoft 365 werk- of schoolaccount dat je in Teams gebruikt.","Kies in Outlook Agenda voor Agenda toevoegen > Uploaden uit bestand en selecteer het opgeslagen .ics-bestand.","Importeer de werkdagen in de agenda van dat account. Als Teams dezelfde Microsoft 365-agenda gebruikt, worden de afspraken daar vervolgens ook zichtbaar."] },
proton: { title: "Proton Calendar", steps: ["Op Android kun je het opgeslagen .ics-bestand openen en Proton Calendar kiezen om de afspraken te importeren.","Op een computer kun je Proton Calendar openen en naar Instellingen > Alle instellingen > Importeren/exporteren gaan.","Kies Importeren vanuit ICS, selecteer het roosterbestand en kies de Proton-agenda waarin je de werkdagen wilt plaatsen."] },
other: { title: "Andere agenda", steps: ["Open het opgeslagen .ics-bestand op je apparaat.","Kies je agenda-app als deze wordt aangeboden en bevestig het toevoegen of importeren van de afspraken.","Wordt je agenda-app niet aangeboden? Zoek in de instellingen van die app naar Importeren, ICS of Agenda importeren en selecteer daar het opgeslagen bestand."] }
};
function ensureHelpOverlay() {
if (helpOverlay) return helpOverlay;
helpOverlay = document.createElement("div");
helpOverlay.className = "agenda-help-overlay";
helpOverlay.hidden = true;
helpOverlay.setAttribute("role", "dialog");
helpOverlay.setAttribute("aria-modal", "true");
helpOverlay.innerHTML = `<section class="agenda-help-card"><h2 data-help-title>Rooster in agenda plaatsen</h2><p class="agenda-help-summary" data-help-summary></p><div data-help-steps></div><div class="agenda-help-note" data-help-note></div><div class="agenda-help-actions"><button class="secondary" type="button" data-help-download>Agenda-bestand opslaan</button><button type="button" data-help-close>Sluiten</button></div></section>`;
document.body.appendChild(helpOverlay);
helpOverlay.querySelector("[data-help-close]").addEventListener("click", closeHelp);
helpOverlay.querySelector("[data-help-download]").addEventListener("click", () => { if (lastCalendarExport?.content) download(lastCalendarExport); });
helpOverlay.addEventListener("click", (event) => { if (event.target === helpOverlay) closeHelp(); });
return helpOverlay;
}
function closeHelp() {
if (!helpOverlay) return;
helpOverlay.hidden = true;
document.body.classList.remove("agenda-help-open");
}
function showHelp(provider, exportData, mode) {
const overlay = ensureHelpOverlay();
const info = providers[provider] || providers.other;
const downloadButton = overlay.querySelector("[data-help-download]");
downloadButton.hidden = !exportData.count;
overlay.querySelector("[data-help-title]").textContent = `${info.title}: rooster plaatsen`;
const action = mode === "shared" ? "Het roosterbestand is aan je apparaat doorgegeven." : mode === "cancelled" ? "De directe overdracht is geannuleerd. Je kunt het bestand hieronder alsnog opslaan." : `Het bestand ${exportData.filename} is opgeslagen op je apparaat.`;
overlay.querySelector("[data-help-summary]").textContent = `${action} Het bevat ${exportData.count} werkdag${exportData.count === 1 ? "" : "en"} uit het ${exportData.scope}.`;
overlay.querySelector("[data-help-steps]").innerHTML = `<ol>${info.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`;
overlay.querySelector("[data-help-note]").textContent = `Alleen de begintijd en eindtijd van iedere werkdag worden geëxporteerd. Pauzes, trainingen en andere activiteiten binnen de dienst worden niet meegenomen.${exportData.skipped ? ` ${exportData.skipped} roosterregel(s) zonder geldige begin- of eindtijd zijn overgeslagen.` : ""}`;
overlay.hidden = false;
document.body.classList.add("agenda-help-open");
requestAnimationFrame(() => overlay.querySelector("[data-help-close]").focus());
}
function showEmpty(exportData) {
const overlay = ensureHelpOverlay();
overlay.querySelector("[data-help-download]").hidden = true;
overlay.querySelector("[data-help-title]").textContent = "Geen werkdagen om te exporteren";
overlay.querySelector("[data-help-summary]").textContent = `Er zijn geen werkdagen met een geldige begin- en eindtijd in het ${exportData.scope}.`;
overlay.querySelector("[data-help-steps]").innerHTML = "";
overlay.querySelector("[data-help-note]").textContent = exportData.scope === "volledige rooster" ? "Controleer het rooster." : "Gebruik eventueel eerst Toon volledig rooster als je ook eerdere werkdagen wilt meenemen.";
overlay.hidden = false;
document.body.classList.add("agenda-help-open");
}
function escapeHtml(value) {
return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
async function exportTo(provider) {
const data = bridge.getCalendarData();
if (!data?.name) return;
const exportData = buildIcs(data);
lastCalendarExport = exportData;
if (!exportData.count) return showEmpty(exportData);
const file = new File([exportData.content], exportData.filename, { type: "text/calendar;charset=utf-8" });
const canShare = ["apple", "samsung", "microsoft", "proton", "other"].includes(provider) && typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
if (canShare) {
try {
await navigator.share({ files: [file], title: `Werkrooster ${data.name}` });
showHelp(provider, exportData, "shared");
return;
} catch (error) {
if (error?.name === "AbortError") return showHelp(provider, exportData, "cancelled");
}
}
download(exportData);
showHelp(provider, exportData, "downloaded");
}
function createControls() {
const data = bridge.getCalendarData();
if (!data?.name || rosterResult.hidden || rosterResult.querySelector(".agenda-export")) return;
let tools = rosterResult.querySelector(".roster-tools");
if (!tools) {
tools = document.createElement("div");
tools.className = "roster-tools";
const scheduleList = rosterResult.querySelector(".schedule-list");
if (!scheduleList) return;
scheduleList.before(tools);
}
const available = exportSchedules(data).some((schedule) => eventTiming(schedule));
const wrap = document.createElement("div");
wrap.className = "agenda-export";
wrap.innerHTML = `<button class="agenda-trigger" type="button" aria-haspopup="menu" aria-expanded="false" ${available ? "" : "disabled"}>In Agenda plaatsen <span class="chevron" aria-hidden="true">▼</span></button><div class="agenda-menu" role="menu" hidden><button type="button" role="menuitem" data-agenda="samsung">Samsung Agenda</button><button type="button" role="menuitem" data-agenda="google">Google Agenda</button><button type="button" role="menuitem" data-agenda="apple">Apple Agenda</button><button type="button" role="menuitem" data-agenda="microsoft">Outlook / Teams Agenda</button><button type="button" role="menuitem" data-agenda="proton">Proton Calendar</button><button type="button" role="menuitem" data-agenda="other">Andere agenda</button></div>`;
tools.prepend(wrap);
const trigger = wrap.querySelector(".agenda-trigger");
const menu = wrap.querySelector(".agenda-menu");
trigger.addEventListener("click", () => {
const open = menu.hidden;
menu.hidden = !open;
trigger.setAttribute("aria-expanded", String(open));
if (open) requestAnimationFrame(() => menu.querySelector("button")?.focus());
});
menu.addEventListener("click", (event) => {
const option = event.target.closest("[data-agenda]");
if (!option) return;
menu.hidden = true;
trigger.setAttribute("aria-expanded", "false");
exportTo(option.dataset.agenda);
});
}
const observer = new MutationObserver(createControls);
observer.observe(rosterResult, { childList: true, subtree: false });
createControls();
document.addEventListener("click", (event) => {
if (event.target.closest(".agenda-export")) return;
document.querySelectorAll(".agenda-export .agenda-menu:not([hidden])").forEach((menu) => {
menu.hidden = true;
menu.parentElement.querySelector(".agenda-trigger")?.setAttribute("aria-expanded", "false");
});
});
document.addEventListener("keydown", (event) => {
if (event.key !== "Escape") return;
if (helpOverlay && !helpOverlay.hidden) return closeHelp();
document.querySelectorAll(".agenda-export .agenda-menu:not([hidden])").forEach((menu) => {
menu.hidden = true;
const trigger = menu.parentElement.querySelector(".agenda-trigger");
trigger?.setAttribute("aria-expanded", "false");
trigger?.focus();
});
});
})();

(() => {
  if (!document.querySelector('link[href="screenshot-export.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "screenshot-export.css";
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[src="screenshot-export.js"]')) {
    const script = document.createElement("script");
    script.src = "screenshot-export.js";
    script.defer = true;
    document.body.appendChild(script);
  }
})();
