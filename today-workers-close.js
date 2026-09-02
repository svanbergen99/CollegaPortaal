(() => {
  "use strict";

  const rosterResult = document.getElementById("rosterResult");
  const searchCard = document.querySelector(".search-card");
  const action = document.querySelector(".today-workers-action");
  const todayButton = document.getElementById("whoWorksTodayButton");
  const nowButton = document.getElementById("whoWorksNowButton");
  const salaryButton = document.getElementById("salaryPaymentButton");
  if (!rosterResult || !searchCard || !action || !todayButton || !nowButton || !salaryButton) return;

  const groupButtons = [todayButton, nowButton, salaryButton];

  function closeGroupView() {
    rosterResult.hidden = true;
    rosterResult.innerHTML = "";
    searchCard.classList.remove("has-roster", "has-month-roster");
    sync();
  }

  function sync() {
    const header = rosterResult.querySelector(".today-workers-head");
    const title = header?.querySelector("h2")?.textContent?.trim() || "";
    const activeButton = title === "Wie werkt nu"
      ? nowButton
      : title === "Wie werkt vandaag"
        ? todayButton
        : title === "Salaris uitbetaling"
          ? salaryButton
          : null;
    let closeButton = action.querySelector(".today-workers-close-action");

    if (activeButton && !rosterResult.hidden) {
      groupButtons.forEach((button) => {
        button.hidden = button !== activeButton;
        button.style.flex = button === activeButton ? "1 1 auto" : "";
      });
      if (!closeButton) {
        closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "today-workers-close-action";
        closeButton.textContent = "Oké";
        closeButton.addEventListener("click", closeGroupView);
        action.appendChild(closeButton);
      }
    } else {
      closeButton?.remove();
      groupButtons.forEach((button) => {
        button.hidden = false;
        button.style.flex = "";
      });
    }
  }

  const observer = new MutationObserver(sync);
  observer.observe(rosterResult, { childList: true, subtree: false, attributes: true, attributeFilter: ["hidden"] });
  sync();
})();
