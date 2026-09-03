(() => {
  "use strict";

  const CONTACTS = Object.freeze([
    Object.freeze({ medal: "🥇", role: "Teamleider", name: "Rianne Mast-Wolf", email: "" }),
    Object.freeze({ medal: "🥈", role: "Senior", name: "Elvis Nieuwland", email: "" }),
    Object.freeze({ medal: "🥈", role: "Senior", name: "Timo Geerdink", email: "" })
  ]);

  const app = document.getElementById("app");
  const searchCard = document.querySelector(".search-card");
  if (!app || !searchCard) return;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function contactHtml(contact) {
    const hasEmail = Boolean(String(contact.email || "").trim());
    return `
      <div class="team-contact-row">
        <div class="team-contact-person">
          <span class="team-contact-medal" aria-hidden="true">${escapeHtml(contact.medal)}</span>
          <span><strong>${escapeHtml(contact.role)}:</strong> ${escapeHtml(contact.name)}</span>
        </div>
        <div class="team-contact-actions">
          <button class="team-contact-button" type="button" data-contact-action="chat" data-contact-name="${escapeHtml(contact.name)}"${hasEmail ? "" : " disabled"}>Stuur Chat</button>
          <button class="team-contact-button" type="button" data-contact-action="email" data-contact-name="${escapeHtml(contact.name)}"${hasEmail ? "" : " disabled"}>Stuur E-Mail</button>
        </div>
      </div>`;
  }

  function ensureBar() {
    let bar = document.getElementById("teamContactsBar");
    if (bar) return bar;

    bar = document.createElement("section");
    bar.id = "teamContactsBar";
    bar.className = "team-contacts-bar";
    bar.setAttribute("aria-label", "Teamleider en seniors");
    bar.innerHTML = CONTACTS.map(contactHtml).join("");

    const nextShiftBar = document.getElementById("nextShiftBar");
    const salaryBar = document.getElementById("nextSalaryPaymentBar");
    if (nextShiftBar) nextShiftBar.after(bar);
    else if (salaryBar) salaryBar.after(bar);
    else {
      const titleRow = searchCard.querySelector(".roster-title-row");
      const title = searchCard.querySelector(":scope > h1");
      (titleRow || title || searchCard.firstElementChild)?.before(bar);
    }

    bar.querySelectorAll(".team-contact-button").forEach((button) => {
      const contact = CONTACTS.find((item) => item.name === button.dataset.contactName);
      const email = String(contact?.email || "").trim();
      if (!email) {
        button.title = "Nog niet actief: e-mailadres is nog niet gekoppeld.";
        return;
      }

      button.addEventListener("click", () => {
        if (button.dataset.contactAction === "chat") {
          const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`;
          window.open(teamsUrl, "_blank", "noopener,noreferrer");
          return;
        }
        window.location.href = `mailto:${encodeURIComponent(email)}`;
      });
    });

    return bar;
  }

  function render() {
    if (app.hidden) return;
    const bar = ensureBar();
    const nextShiftBar = document.getElementById("nextShiftBar");
    if (nextShiftBar && nextShiftBar.nextElementSibling !== bar) nextShiftBar.after(bar);
    bar.hidden = false;
  }

  window.addEventListener("rooster-unlocked", render);
  window.addEventListener("rooster-months-updated", render);
  if (!app.hidden) render();
})();
