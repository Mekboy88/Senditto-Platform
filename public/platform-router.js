/**
 * Stable dashboard router.
 * Mounts #senditto-platform-root OUTSIDE React's .dashboard-content so
 * React re-renders cannot blank our pages. Detects sidebar route and
 * renders platform UI reliably.
 */
(() => {
  const ROUTE_BY_LABEL = {
    Overview: "overview",
    "Email activity": "activity",
    Analytics: "analytics",
    "Send email": "send",
    Campaigns: "campaigns",
    Templates: "templates",
    Automations: "automations",
    Contacts: "contacts",
    Segments: "segments",
    Inbound: "inbound",
    "Inbound email": "inbound",
    Domains: "domains",
    "Sending domains": "domains",
    "API keys": "api",
    Webhooks: "webhooks",
    Logs: "logs",
    "Developer logs": "logs",
    Settings: "settings",
    "Workspace settings": "settings",
    "Manage workspaces": "workspaces",
    "Help & docs": "help",
    Suppressions: "suppressions",
    "Streams & capacity": "streams",
    "OTP & verification": "otp",
    Senders: "senders",
    "Batch sending": "batches",
    SMTP: "smtp",
    "IP pools": "ip-pools",
    Tracking: "tracking",
    "Team & roles": "team",
    "Billing & usage": "billing",
    Integrations: "integrations",
    "Audit log": "audit",
  };

  const LABEL_BY_ROUTE = Object.fromEntries(
    Object.entries(ROUTE_BY_LABEL).map(([k, v]) => [v, k])
  );

  let currentRoute = "overview";
  let mountTimer = null;
  let renderTimer = null;

  function ui() {
    return (window.SendittoUI = window.SendittoUI || {});
  }

  function ensureMount() {
    const shell = document.querySelector(".dashboard-shell");
    if (!shell) return null;

    const main = shell.querySelector(".dashboard-main");
    if (!main) return null;

    let root = document.getElementById("senditto-platform-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "senditto-platform-root";
      root.setAttribute("data-platform-root", "true");
      // Place after React main so topbar stays above; content host is ours
      const reactMain = main.querySelector(".dashboard-content");
      if (reactMain) reactMain.insertAdjacentElement("afterend", root);
      else main.appendChild(root);
    } else if (!main.contains(root)) {
      main.appendChild(root);
    }

    document.documentElement.classList.add("senditto-dashboard-locked");
    document.body.classList.add("senditto-dashboard-locked");
    shell.classList.add("senditto-layout-fixed");
    return root;
  }

  function unmountIfNeeded() {
    if (!document.querySelector(".dashboard-shell")) {
      document.getElementById("senditto-platform-root")?.remove();
      document.documentElement.classList.remove("senditto-dashboard-locked");
      document.body.classList.remove("senditto-dashboard-locked");
    }
  }

  function activeSidebarLabel() {
    const active = document.querySelector(
      ".dashboard-sidebar nav button.active, .dashboard-sidebar nav a.active"
    );
    if (!active) return null;
    const span = active.querySelector("span");
    return (span?.textContent || active.textContent || "").trim();
  }

  function detectRoute() {
    const label = activeSidebarLabel();
    if (label && ROUTE_BY_LABEL[label]) return ROUTE_BY_LABEL[label];
    return currentRoute || lastRoute() || "overview";
  }

  function setSidebarActive(route) {
    const want = LABEL_BY_ROUTE[route];
    document.querySelectorAll(".dashboard-sidebar nav button").forEach((btn) => {
      const span = btn.querySelector("span");
      const text = (span?.textContent || btn.textContent || "").trim();
      const match =
        ROUTE_BY_LABEL[text] === route ||
        text === want ||
        (route === "inbound" && text === "Inbound") ||
        (route === "domains" && text === "Domains") ||
        (route === "logs" && text === "Logs") ||
        (route === "api" && text === "API keys");
      btn.classList.toggle("active", !!match);
    });
  }

  function renderRoute(route, reason = "") {
    const root = ensureMount();
    if (!root) return;

    currentRoute = route || detectRoute();
    setSidebarActive(currentRoute);

    const pages = ui();
    const renderer = pages[currentRoute];

    root.dataset.route = currentRoute;
    root.dataset.renderReason = reason;
    // Clear page-specific flags so CSS from other pages does not leak
    delete root.dataset.sendEnhanced;
    delete root.dataset.analyticsEnhanced;
    delete root.dataset.overviewRealtime;
    delete root.dataset.platformPage;
    delete root.dataset.templateSystem;
    delete root.dataset.workspaceManager;
    root.style.removeProperty("--se-score");

    try {
      if (typeof renderer === "function") {
        renderer(root);
      } else {
        root.innerHTML = `
          <div class="pp-page">
            <div class="pp-head">
              <div>
                <small class="pp-kicker">PLATFORM</small>
                <h1>${escapeHtml(LABEL_BY_ROUTE[currentRoute] || currentRoute)}</h1>
                <p>This page is loading platform modules…</p>
              </div>
            </div>
            <div class="pp-empty">
              <h3>Preparing workspace page</h3>
              <p>If this stays empty, refresh once. No demo content is shown.</p>
            </div>
          </div>`;
        // Retry shortly — scripts may still be registering
        setTimeout(() => {
          if (typeof ui()[currentRoute] === "function") renderRoute(currentRoute, "retry");
        }, 120);
      }
    } catch (err) {
      console.error("[Senditto] page render failed", currentRoute, err);
      root.innerHTML = `
        <div class="pp-page">
          <div class="pp-empty">
            <h3>Could not open this page</h3>
            <p>${escapeHtml(err?.message || "Unknown error")}</p>
            <button class="pp-btn primary" type="button" id="senditto-retry-page">Try again</button>
          </div>
        </div>`;
      root.querySelector("#senditto-retry-page")?.addEventListener("click", () =>
        renderRoute(currentRoute, "manual-retry")
      );
    }

    // Keep topbar title in sync if present
    const titleEl = document.querySelector(".dashboard-topbar > div:first-child > span");
    if (titleEl && LABEL_BY_ROUTE[currentRoute]) {
      titleEl.textContent = LABEL_BY_ROUTE[currentRoute];
    }
  }

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function scheduleRender(route, reason) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => renderRoute(route || detectRoute(), reason), 0);
  }

  const ROUTE_KEY = "senditto_platform_route";

  /** Remember where the operator was, so a refresh returns to that page. */
  function rememberRoute(route) {
    try {
      if (route) localStorage.setItem(ROUTE_KEY, route);
    } catch {
      /* private mode */
    }
  }

  function lastRoute() {
    try {
      const r = localStorage.getItem(ROUTE_KEY);
      return r && LABEL_BY_ROUTE[r] ? r : null;
    } catch {
      return null;
    }
  }

  function navigate(route, { clickSidebar = true } = {}) {
    if (!route) return;
    currentRoute = route;
    rememberRoute(route);

    // Prefer driving the SPA state so search/top menus stay consistent
    if (clickSidebar) {
      const label = LABEL_BY_ROUTE[route];
      const btn = [...document.querySelectorAll(".dashboard-sidebar nav button")].find((el) => {
        const text = (el.querySelector("span")?.textContent || el.textContent || "").trim();
        return ROUTE_BY_LABEL[text] === route || text === label;
      });
      if (btn) {
        // Let React update active state; we still render our layer
        btn.click();
      }
    }

    scheduleRender(route, "navigate");
  }

  // Intercept sidebar / workspace menu / common CTAs
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("button, a");
      if (!btn) return;
      if (!document.querySelector(".dashboard-shell")) return;

      const raw = (btn.querySelector("span")?.textContent || btn.textContent || "")
        .replace(/\s+/g, " ")
        .trim();

      // Direct label match
      if (ROUTE_BY_LABEL[raw]) {
        currentRoute = ROUTE_BY_LABEL[raw];
        rememberRoute(currentRoute);
        // Allow SPA to mark active, then paint our page
        scheduleRender(currentRoute, "click:" + raw);
        return;
      }

      // Partial / icon-button text cleanup
      for (const [label, route] of Object.entries(ROUTE_BY_LABEL)) {
        if (raw === label || raw.endsWith(label) || raw.startsWith(label)) {
          currentRoute = route;
          rememberRoute(route);
          scheduleRender(route, "click-partial:" + label);
          return;
        }
      }
    },
    true
  );

  // In-app navigation API for our own buttons
  window.SendittoNavigate = navigate;
  window.SendittoRender = () => scheduleRender(currentRoute, "external");

  // Keep mount alive while dashboard is open
  // Restoring the remembered page has to wait for the dashboard's own sidebar
  // to exist — the button is what switches the app's internal page, and on a
  // fresh load it is not there yet when boot() first runs.
  let restored = false;
  let restoreTimer = null;

  function sidebarButtonFor(route) {
    const label = LABEL_BY_ROUTE[route];
    return [...document.querySelectorAll(".dashboard-sidebar nav button")].find((el) => {
      const text = (el.querySelector("span")?.textContent || el.textContent || "").trim();
      return ROUTE_BY_LABEL[text] === route || text === label;
    });
  }

  /**
   * Put the operator back on the page they were on. The dashboard hydrates in
   * its own time, so keep looking for the sidebar button for a few seconds
   * rather than assuming it is there the moment the shell appears.
   */
  function restoreRoute() {
    if (restored) return;
    const want = lastRoute();
    if (!want || want === "overview") {
      restored = true;
      return;
    }
    clearInterval(restoreTimer);
    const deadline = Date.now() + 12000;
    let lastClick = 0;
    const attempt = () => {
      if (restored) return clearInterval(restoreTimer);
      if (!document.querySelector(".dashboard-shell")) return;

      // Done only when the dashboard itself says it is on that page. Clicking
      // during hydration silently does nothing, so confirm rather than assume.
      if (activeSidebarLabel() === LABEL_BY_ROUTE[want]) {
        restored = true;
        clearInterval(restoreTimer);
        currentRoute = want;
        scheduleRender(want, "restore");
        return;
      }

      const btn = sidebarButtonFor(want);
      if (btn && Date.now() - lastClick > 500) {
        lastClick = Date.now();
        btn.click();
      }
      if (Date.now() > deadline) {
        restored = true;
        clearInterval(restoreTimer);
      }
    };
    attempt();
    restoreTimer = setInterval(attempt, 200);
  }

  const boot = () => {
    unmountIfNeeded();
    if (!document.querySelector(".dashboard-shell")) {
      restored = false; // signed out: allow a fresh restore next time in
      return;
    }
    ensureMount();
    scheduleRender(detectRoute(), "boot");
    restoreRoute();
  };

  const observer = new MutationObserver(() => {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(() => {
      if (!document.querySelector(".dashboard-shell")) {
        unmountIfNeeded();
        return;
      }
      const root = ensureMount();
      if (!root) return;
      restoreRoute();
      // If React remounted shell and wiped our root, re-render
      if (!root.dataset.route || root.childElementCount === 0) {
        scheduleRender(detectRoute(), "remount");
      } else {
        // Sync if SPA changed active nav without our click handler catching it
        const detected = detectRoute();
        if (detected && detected !== currentRoute) {
          scheduleRender(detected, "active-sync");
        }
      }
    }, 40);
  });

  const start = () => {
    observer.observe(document.getElementById("root") || document.body, {
      subtree: true,
      childList: true,
    });
    boot();
    // Safety retries while SPA hydrates
    [100, 300, 700, 1500].forEach((ms) => setTimeout(boot, ms));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  // Re-render on store changes for live data (skip while a modal is open)
  window.addEventListener("senditto:store", () => {
    if (!document.getElementById("senditto-platform-root")) return;
    if (document.querySelector(".pp-modal, .tpl-modal, .wm-modal, .se-modal, .an-modal")) return;
    scheduleRender(currentRoute, "store");
  });
})();
