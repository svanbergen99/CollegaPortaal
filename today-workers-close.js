(() => {
  "use strict";

  const rosterResult = document.getElementById("rosterResult");
  const searchCard = document.querySelector(".search-card");
  const whoWorksTodayButton = document.getElementById("whoWorksTodayButton");
  if (!rosterResult || !searchCard || !whoWorksTodayButton) return;

  function addCloseButton() {
    const header = rosterResult.querySelector(".today-workers-head");
    if (!header || header.querySelector(".today-workers-close")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "today-workers-close";
    button.textContent = "Oké";
    button.style.minHeight = "36px";
    button.style.padding = "8px 13px";
    button.style.fontSize = "13px";
    button.addEventListener("click", () => {
      rosterResult.hidden = true;
      rosterResult.innerHTML = "";
      searchCard.classList.remove("has-roster");
      whoWorksTodayButton.focus();
    });

    header.appendChild(button);
  }

  const observer = new MutationObserver(addCloseButton);
  observer.observe(rosterResult, { childList: true });
  addCloseButton();
})();
