(() => {
  "use strict";

  const TRAFFIC_URL = "https://achmea-production-1-a3srealtime-eu-west-1-prod.kb.eu-west-1.aws.found.io/s/centraal-beheer/app/dashboards#/view/731a7b2c-c25f-4ff6-a032-5f62ef6d2272?_g=(filters:!())";
  const app = document.getElementById("app");
  const action = document.querySelector(".today-workers-action");
  if (!app || !action) return;

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
      window.open(TRAFFIC_URL, "_blank", "noopener,noreferrer");
    });
    action.appendChild(button);
    return button;
  }

  window.addEventListener("rooster-unlocked", ensureTrafficButton);
  if (!app.hidden) ensureTrafficButton();
})();
