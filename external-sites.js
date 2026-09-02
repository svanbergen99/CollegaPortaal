(() => {
  "use strict";

  const GROUPS = Object.freeze([
    Object.freeze({
      title: "Belangrijke Websites Werk",
      links: Object.freeze([
        Object.freeze({ label: "1MDW", url: "https://azkrplbs001.az.unix.corp:44300/sap(bD1ubCZjPTEwMCZkPW1pbg==)/bc/bsp/sap/crm_ui_start/default.htm" }),
        Object.freeze({ label: "Brein", url: "https://brein-sio-particulier.custhelp.com/app/home/" }),
        Object.freeze({ label: "Noodprocedure formulier", url: "https://achmea.sharepoint.com/sites/SP-15261/Noodprocedures/Noodprocedures.aspx", warning: "Alleen gebruiken als Traffic toestemming geeft" }),
        Object.freeze({ label: "Werkbriefjes / Loonstrook", url: "https://klantcontactdiensten.nocore.nl/" }),
        Object.freeze({ label: "Wallboard", url: "https://achmea-production-1-a3srealtime-eu-west-1-prod.kb.eu-west-1.aws.found.io/s/centraal-beheer/app/dashboards#/view/731a7b2c-c25f-4ff6-a032-5f62ef6d2272/7f508da0-6f02-4e64-8ec7-edf69a87aa56?_g=(filters:!())" }),
        Object.freeze({ label: "NPS", url: "https://dashboards.insights.metrixlab.com/Account/Login?ReturnUrl=%2fDashboard%2fDashboard%2f%3fProjectId%3d48316%26ProjectDashboardId%3d22&ProjectId=48316&ProjectDashboardId=22" })
      ])
    }),
    Object.freeze({
      title: "Belangrijke Websites",
      links: Object.freeze([
        Object.freeze({ label: "Blije Klanten Box", url: "https://giftshopcentraalbeheer.nl/login" }),
        Object.freeze({ label: "Afschrijflijst Woon verzekering", url: "https://www.centraalbeheer.nl/-/media/files/prive/verzekeringen/woonverzekering/afschrijvingslijst.pdf" }),
        Object.freeze({ label: "WOZ Waardeloket", url: "https://www.wozwaardeloket.nl/" }),
        Object.freeze({ label: "Kadastriaalekaart", url: "https://kadastralekaart.com/" }),
        Object.freeze({ label: "Kenteken Check", url: "https://www.centraalbeheer.nl/verzekeringen/autoverzekering/kentekencheck" }),
        Object.freeze({ label: "RDW", url: "https://www.rdw.nl/" }),
        Object.freeze({ label: "Finnik", url: "https://finnik.nl/" }),
        Object.freeze({ label: "Meldcode opvragen", url: "https://auto.dispatch.nl" })
      ])
    })
  ]);

  const app = document.getElementById("app");
  if (!app) return;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function linkHtml(link) {
    const warning = link.warning
      ? `<span class="external-site-warning">⚠ ${escapeHtml(link.warning)}</span>`
      : '<span class="external-site-meta">Opent extern ↗</span>';
    return `
      <a class="external-site-link${link.warning ? " is-warning" : ""}"
         href="${escapeHtml(link.url)}"
         target="_blank"
         rel="noopener noreferrer">
        <strong>${escapeHtml(link.label)}</strong>
        ${warning}
      </a>`;
  }

  function ensureSection() {
    let section = document.getElementById("externalSitesSection");
    if (section) return section;

    section = document.createElement("section");
    section.id = "externalSitesSection";
    section.className = "external-sites-card";
    section.innerHTML = `
      <div class="external-sites-head">
        <div>
          <h1>Externe websites</h1>
          <p>Handige werklocaties. Iedere knop opent in een nieuw tabblad.</p>
        </div>
      </div>
      <div class="external-sites-groups">
        ${GROUPS.map((group) => `
          <section class="external-sites-group">
            <h2>${escapeHtml(group.title)}</h2>
            <div class="external-sites-grid">
              ${group.links.map(linkHtml).join("")}
            </div>
          </section>`).join("")}
      </div>`;

    app.appendChild(section);
    return section;
  }

  window.addEventListener("rooster-unlocked", ensureSection);
  if (!app.hidden) ensureSection();
})();
