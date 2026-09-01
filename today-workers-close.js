(() => {
  "use strict";

  const rosterResult = document.getElementById("rosterResult");
  const searchCard = document.querySelector(".search-card");
  const whoWorksTodayButton = document.getElementById("whoWorksTodayButton");
  const action = whoWorksTodayButton?.closest(".today-workers-action");
  if (!rosterResult || !searchCard || !whoWorksTodayButton || !action) return;

  function closeTodayWorkers() {
    rosterResult.hidden = true;
    rosterResult.innerHTML = "";
    searchCard.classList.remove("has-roster");
    whoWorksTodayButton.focus();
    sync();
  }

  function sync() {
    const visible = !rosterResult.hidden && Boolean(rosterResult.querySelector(".today-workers-head"));
    let button = action.querySelector(".today-workers-close-action");

    if (visible) {
      action.style.gap = "8px";
      whoWorksTodayButton.style.width = "auto";
      whoWorksTodayButton.style.flex = "1 1 auto";
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "today-workers-close-action";
        button.textContent = "Oké";
        button.style.minHeight = "42px";
        button.style.padding = "10px 16px";
        button.style.flex = "0 0 auto";
        button.addEventListener("click", closeTodayWorkers);
        action.appendChild(button);
      }
    } else {
      button?.remove();
      action.style.gap = "";
      whoWorksTodayButton.style.width = "";
      whoWorksTodayButton.style.flex = "";
    }
  }

  const observer = new MutationObserver(sync);
  observer.observe(rosterResult, { childList: true, subtree: false, attributes: true, attributeFilter: ["hidden"] });
  sync();
})();