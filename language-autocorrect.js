(() => {
  "use strict";

  // Lokale taalcorrectie voor zichtbare UI-tekst.
  // Geen tekst of persoonsgegevens worden naar externe diensten gestuurd.
  const TEXT_RULES = Object.freeze([
    [/\bWelkom Collega's\b/g, "Welkom collega's"],
    [/\bAchtergrond kleur\b/g, "Achtergrondkleur"],
    [/\bSalaris uitbetaling\b/g, "Salarisuitbetaling"],
    [/\bVolgende salaris uitbetaling\b/g, "Volgende salarisuitbetaling"],
    [/\bTeam Wachtwoord\b/g, "teamwachtwoord"],
    [/\bInlever Deadline\b/g, "Inleverdeadline"],
    [/\bincl Koningsdag\b/g, "incl. Koningsdag"],
    [/\bVakantie Verlof Aanvragen\b/g, "Vakantieverlof aanvragen"],
    [/\bStuur Chat\b/g, "Stuur chat"],
    [/\bStuur E-Mail\b/g, "Stuur e-mail"],
    [/\bExterne Websites\b/g, "Externe websites"],
    [/\bBelangrijke Websites Werk\b/g, "Belangrijke websites werk"],
    [/\bBelangrijke Websites\b/g, "Belangrijke websites"],
    [/\bBeschikbaarheid Berekenen\b/g, "Beschikbaarheid berekenen"],
    [/\bBeschikbaarheid Doorgeven\b/g, "Beschikbaarheid doorgeven"],
    [/\bNoodprocedure formulier\b/g, "Noodprocedureformulier"],
    [/\bAfschrijflijst Woon verzekering\b/g, "Afschrijflijst woonverzekering"],
    [/\bWOZ Waardeloket\b/g, "WOZ-waardeloket"],
    [/\bKadastriaalekaart\b/g, "Kadastrale kaart"],
    [/\bKenteken Check\b/g, "Kentekencheck"],
    [/\bWall board\b/g, "Wallboard"],
    [/\bUsername en Password\b/g, "gebruikersnaam en wachtwoord"],
    [/\bEdge popups\b/g, "Edge-pop-ups"],
    [/\bpopups\b/g, "pop-ups"]
  ]);

  const SKIP_PARENT_SELECTOR = "script, style, noscript, pre, code, textarea, input, select, option, [contenteditable='true']";
  const SAFE_ATTRIBUTES = Object.freeze(["title", "placeholder", "aria-label"]);
  let scheduled = false;

  function correctText(value) {
    let result = String(value ?? "");
    for (const [pattern, replacement] of TEXT_RULES) result = result.replace(pattern, replacement);
    return result;
  }

  function shouldSkipElement(element) {
    return !element || element.matches?.(SKIP_PARENT_SELECTOR) || element.closest?.(SKIP_PARENT_SELECTOR);
  }

  function correctTextNode(node) {
    if (!node?.parentElement || shouldSkipElement(node.parentElement)) return;
    const before = node.nodeValue;
    const after = correctText(before);
    if (after !== before) node.nodeValue = after;
  }

  function correctAttributes(element) {
    if (!(element instanceof Element) || shouldSkipElement(element)) return;
    for (const attribute of SAFE_ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue;
      const before = element.getAttribute(attribute) || "";
      const after = correctText(before);
      if (after !== before) element.setAttribute(attribute, after);
    }
  }

  function scan(root = document.body) {
    if (!root) return;

    if (root.nodeType === Node.TEXT_NODE) {
      correctTextNode(root);
      return;
    }

    if (!(root instanceof Element) && root !== document) return;
    if (root instanceof Element) correctAttributes(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return shouldSkipElement(node.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    while ((node = walker.nextNode())) correctTextNode(node);

    root.querySelectorAll?.("[title], [placeholder], [aria-label]").forEach(correctAttributes);
  }

  function scheduleScan(root = document.body) {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      scan(root?.isConnected ? root : document.body);
    });
  }

  function start() {
    scan(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          scheduleScan(mutation.target);
          return;
        }
        if (mutation.type === "childList" && mutation.addedNodes.length) {
          scheduleScan(mutation.target instanceof Element ? mutation.target : document.body);
          return;
        }
        if (mutation.type === "attributes") {
          scheduleScan(mutation.target);
          return;
        }
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: SAFE_ATTRIBUTES
    });

    // Extra controle na door jou bedoelde pagina-events.
    ["click", "input", "change", "submit"].forEach((eventName) => {
      document.addEventListener(eventName, () => scheduleScan(document.body), true);
    });

    window.addEventListener("rooster-unlocked", () => scheduleScan(document.body));
    window.addEventListener("rooster-month-changed", () => scheduleScan(document.body));
    window.addEventListener("rooster-months-updated", () => scheduleScan(document.body));

    window.CollegaPortaalLanguageAutocorrect = Object.freeze({
      scan: () => scan(document.body),
      correctText
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
