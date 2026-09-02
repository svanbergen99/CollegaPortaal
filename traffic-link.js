(() => {
  "use strict";

  const TRAFFIC_URL = "https://achmea-production-1-a3srealtime-eu-west-1-prod.kb.eu-west-1.aws.found.io/s/centraal-beheer/app/dashboards#/view/731a7b2c-c25f-4ff6-a032-5f62ef6d2272?_g=(filters:!())";
  const app = document.getElementById("app");
  const action = document.querySelector(".today-workers-action");
  const searchCard = document.querySelector(".search-card");
  const rosterResult = document.getElementById("rosterResult");
  if (!app || !action || !searchCard || !rosterResult) return;

  function closeOverview() {
    rosterResult.hidden = true;
    rosterResult.innerHTML = "";
    searchCard.classList.remove("has-roster", "has-month-roster");
  }

  function isTrafficOpen() {
    return !rosterResult.hidden && Boolean(rosterResult.querySelector(".traffic-dashboard-view"));
  }

  function renderTrafficDashboard() {
    rosterResult.innerHTML = `
      <div class="traffic-dashboard-view">
        <div class="today-workers-head">
          <div>
            <h2>Traffic dashboard</h2>
            <p class="today-workers-date">Live weergave van het Traffic-dashboard.</p>
          </div>
        </div>
        <div style="overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--surface);">
          <iframe
            title="Traffic dashboard"
            src="${TRAFFIC_URL}"
            loading="eager"
            referrerpolicy="no-referrer"
            style="display:block;width:100%;height:min(72vh,820px);min-height:560px;border:0;background:#fff;"
          ></iframe>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;">
          <a class="today-workers-button" href="${TRAFFIC_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">Open in nieuw tabblad</a>
        </div>
      </div>`;
    rosterResult.hidden = false;
    searchCard.classList.add("has-roster");
    searchCard.classList.remove("has-month-roster");
  }

  function ensureTrafficButton() {
    let button = document.getElementById("trafficDashboardButton");
    if (button) return button;

    button = document.createElement("button");
    button.id = "trafficDashboardButton";
    button.className = "today-workers-button";
    button.type = "button";
    button.textContent = "Traffic dashboard";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (isTrafficOpen()) {
        closeOverview();
        return;
      }
      renderTrafficDashboard();
    });
    action.appendChild(button);
    return button;
  }

  window.addEventListener("rooster-unlocked", ensureTrafficButton);
  if (!app.hidden) ensureTrafficButton();
})();
