/**
 * Sidebar navigation extension.
 * The built SPA sidebar only exposes the core groups (Workspace, Create,
 * Audience, Developer). This layer injects the remaining platform routes —
 * Delivery, Messaging and Organization — as native-looking .nav-group blocks
 * so every registered page is reachable. The stable router already resolves
 * clicks by label, so injected buttons need no extra wiring.
 */
(() => {
  const MARK = "data-senditto-nav-extra";

  const icon = (n) =>
    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
      {
        ban: '<circle cx="12" cy="12" r="9"/><path d="m5.5 5.5 13 13"/>',
        waves: '<path d="M3 8c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 3-2"/><path d="M3 14c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 3-2"/>',
        send: '<path d="m4 4 16 8-16 8 4-8Z"/><path d="M8 12h6"/>',
        server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
        plug: '<path d="M9 3v5m6-5v5"/><path d="M6 8h12l-1 5a5 5 0 0 1-10 0Z"/><path d="M12 18v3"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9.5 11.5 11 13l3.5-3.5"/>',
        layers: '<path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
        target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
        team: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
        card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        scroll: '<path d="M8 21h11a2 2 0 0 0 2-2v-1H10"/><path d="M5 3h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2Z"/><path d="M9 8h6M9 12h6"/>',
        boxes: '<path d="M7 7V4h10v3"/><rect x="3" y="7" width="8" height="6" rx="1"/><rect x="13" y="7" width="8" height="6" rx="1"/><rect x="8" y="13" width="8" height="6" rx="1"/>',
      }[n] || ""
    }</svg>`;

  // Labels must match the router's ROUTE_BY_LABEL exactly.
  const GROUPS = [
    ["Delivery", [
      ["Suppressions", "ban"],
      ["Streams & capacity", "waves"],
      ["Senders", "send"],
      ["SMTP", "server"],
      ["IP pools", "plug"],
    ]],
    ["Messaging", [
      ["OTP & verification", "shield"],
      ["Batch sending", "boxes"],
      ["Tracking", "target"],
    ]],
    ["Organization", [
      ["Team & roles", "team"],
      ["Billing & usage", "card"],
      ["Integrations", "grid"],
      ["Audit log", "scroll"],
      ["Manage workspaces", "layers"],
    ]],
  ];

  const ROUTE_BY_LABEL = {
    Suppressions: "suppressions",
    "Streams & capacity": "streams",
    Senders: "senders",
    SMTP: "smtp",
    "IP pools": "ip-pools",
    "OTP & verification": "otp",
    "Batch sending": "batches",
    Tracking: "tracking",
    "Team & roles": "team",
    "Billing & usage": "billing",
    Integrations: "integrations",
    "Audit log": "audit",
    "Manage workspaces": "workspaces",
  };

  let injectTimer = null;

  function inject() {
    const nav = document.querySelector(".dashboard-sidebar nav");
    if (!nav) return;
    if (nav.querySelector(`[${MARK}]`)) return; // already present

    const activeRoute =
      document.getElementById("senditto-platform-root")?.dataset.route || "";

    const frag = document.createDocumentFragment();
    for (const [group, items] of GROUPS) {
      const div = document.createElement("div");
      div.className = "nav-group";
      div.setAttribute(MARK, "true");
      const small = document.createElement("small");
      small.textContent = group;
      div.appendChild(small);
      for (const [label, ic] of items) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerHTML = `${icon(ic)}<span></span>`;
        btn.querySelector("span").textContent = label;
        if (ROUTE_BY_LABEL[label] === activeRoute) btn.classList.add("active");
        div.appendChild(btn);
      }
      frag.appendChild(div);
    }
    nav.appendChild(frag);
  }

  function schedule() {
    clearTimeout(injectTimer);
    injectTimer = setTimeout(inject, 60);
  }

  const observer = new MutationObserver(schedule);

  function start() {
    observer.observe(document.getElementById("root") || document.body, {
      subtree: true,
      childList: true,
    });
    schedule();
    [200, 600, 1400].forEach((ms) => setTimeout(schedule, ms));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
