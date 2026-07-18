/**
 * Top-bar Help / docs / profile menus — bulletproof portal version.
 *
 * The SPA toggles .docs-popover but:
 *  1) menu items have no onClick
 *  2) overflow on .dashboard-shell can clip absolute popovers
 *
 * We take over Help: open a fixed portal menu, wire every item, close cleanly.
 */
(() => {
  const MENU_ID = "senditto-help-portal";
  const STYLE_ID = "senditto-help-portal-style";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      #${MENU_ID} {
        position: fixed;
        z-index: 2147483000;
        width: min(320px, calc(100vw - 24px));
        max-height: min(70vh, 520px);
        overflow-x: hidden;
        overflow-y: auto;
        background: #fff;
        border: 1px solid #dfe6ef;
        border-radius: 15px;
        padding: 9px;
        box-shadow: 0 22px 60px #192b452b;
        font-family: Manrope, DM Sans, system-ui, sans-serif;
        color: #1a2433;
      }
      #${MENU_ID} .sh-title {
        border-bottom: 1px solid #edf1f5;
        height: 38px;
        margin-bottom: 5px;
        padding: 0 9px;
        display: flex;
        align-items: center;
        font: 700 13px Manrope, system-ui, sans-serif;
      }
      #${MENU_ID} button.sh-item {
        text-align: left;
        color: #526278;
        background: #fff;
        border: 0;
        border-radius: 9px;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 52px;
        padding: 8px 9px;
        display: flex;
        cursor: pointer;
        font: inherit;
      }
      #${MENU_ID} button.sh-item:hover {
        background: #f4f7fb;
      }
      #${MENU_ID} .sh-ico {
        color: #2875eb;
        background: #edf4ff;
        border-radius: 9px;
        flex: none;
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        font-size: 14px;
      }
      #${MENU_ID} .sh-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      #${MENU_ID} .sh-text b {
        font: 700 13px Manrope, system-ui, sans-serif;
        color: #1a2433;
      }
      #${MENU_ID} .sh-text small {
        font-size: 11px;
        color: #8b98a9;
        line-height: 1.3;
      }
      #${MENU_ID} .sh-chev {
        color: #a0aec0;
        flex: none;
        font-size: 16px;
      }
      /* Hide SPA's native docs popover while ours is open (avoid double menu) */
      body.senditto-help-open .docs-popover,
      body.senditto-help-open .top-popover.docs-popover {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      /* Topbar only — do NOT open .dashboard-main overflow (sidebar must stay fixed) */
      .dashboard-topbar {
        overflow: visible !important;
      }
      .dashboard-topbar {
        z-index: 80 !important;
      }
      .dashboard-topbar .top-actions,
      .dashboard-topbar .top-action-wrap {
        overflow: visible !important;
        position: relative !important;
        z-index: 81 !important;
      }
      .top-popover,
      .notification-popover,
      .profile-popover,
      .search-popover {
        z-index: 90 !important;
        pointer-events: auto !important;
      }
      .top-dismiss {
        z-index: 70 !important;
      }
      #senditto-platform-root {
        z-index: 1 !important;
        position: relative !important;
      }
      .pp-modal.topbar-status,
      .pp-modal.topbar-help-modal {
        z-index: 2147483001 !important;
      }
    `;
    document.head.appendChild(s);
  }

  function closeMenu() {
    document.getElementById(MENU_ID)?.remove();
    document.body.classList.remove("senditto-help-open");
    // Also close SPA top menu if open
    document.querySelector(".top-dismiss")?.click();
  }

  function closeOverlayModals() {
    document.querySelectorAll(".pp-modal.topbar-status, .pp-modal.topbar-api-ref, .pp-modal.topbar-support, .pp-modal.topbar-help-modal").forEach((m) => m.remove());
  }

  function isOpen() {
    return !!document.getElementById(MENU_ID);
  }

  function goRoute(route, renderFn) {
    const root = document.getElementById("senditto-platform-root");
    if (root) root.dataset.route = route;
    if (typeof renderFn === "function") {
      renderFn(root || undefined);
    } else if (window.SendittoUI?.[route]) {
      window.SendittoUI[route](root || undefined);
    }
    document.querySelectorAll(".dashboard-sidebar nav button").forEach((b) => {
      const t = (b.querySelector("span")?.textContent || b.textContent || "").trim();
      const active =
        (route === "help" && (t === "Help & docs" || /help/i.test(t))) ||
        (route === "settings" && /settings/i.test(t));
      b.classList.toggle("active", active);
    });
  }

  function showStatusModal() {
    document.querySelector(".pp-modal.topbar-status")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="pp-modal topbar-status topbar-help-modal"><button class="pp-backdrop" data-close type="button"></button>
      <section class="pp-dialog">
        <button class="pp-close" data-close type="button">✕</button>
        <h2>System status</h2>
        <p>Control-plane health for this workspace session.</p>
        <div class="pp-detail">
          <div class="pp-detail-row"><span>API edge</span><b style="color:#14966b">Operational</b></div>
          <div class="pp-detail-row"><span>SMTP edge</span><b style="color:#14966b">Operational</b></div>
          <div class="pp-detail-row"><span>Webhooks</span><b style="color:#14966b">Operational</b></div>
          <div class="pp-detail-row"><span>Inbound</span><b style="color:#14966b">Operational</b></div>
          <div class="pp-detail-row"><span>Dashboard</span><b style="color:#14966b">Operational</b></div>
        </div>
        <p style="color:#6b7a90;font-size:13px;margin-top:12px">Live multi-region status will bind when production edge is connected.</p>
        <div class="pp-modal-actions"><button class="pp-btn primary" data-close type="button">Done</button></div>
      </section></div>`
    );
    document.querySelectorAll(".topbar-status [data-close]").forEach((b) => {
      b.onclick = () => document.querySelector(".topbar-status")?.remove();
    });
  }

  function showApiRefModal() {
    document.querySelector(".pp-modal.topbar-api-ref")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="pp-modal topbar-api-ref topbar-help-modal"><button class="pp-backdrop" data-close type="button"></button>
      <section class="pp-dialog">
        <button class="pp-close" data-close type="button">✕</button>
        <h2>API reference</h2>
        <p>Endpoints, SDKs and examples for the Senditto control plane.</p>
        <pre class="pp-code" style="white-space:pre-wrap;font-size:12px;line-height:1.5;background:#f4f7fb;padding:14px;border-radius:10px;overflow:auto">POST /v1/emails
POST /v1/emails/batch
POST /v1/otp/send
POST /v1/otp/verify
GET  /v1/domains
POST /v1/domains
GET  /v1/messages/{id}
POST /v1/webhooks
GET  /v1/suppressions

# Node example
const res = await fetch("https://api.senditto.com/v1/emails", {
  method: "POST",
  headers: {
    "Authorization": "Bearer $SENDITTO_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "hello@yourdomain.com",
    to: "user@example.com",
    subject: "Welcome",
    html: "&lt;p&gt;Hello&lt;/p&gt;"
  })
});</pre>
        <div class="pp-modal-actions">
          <button class="pp-btn" data-go-docs type="button">Open full docs</button>
          <button class="pp-btn primary" data-close type="button">Close</button>
        </div>
      </section></div>`
    );
    const modal = document.querySelector(".topbar-api-ref");
    modal?.querySelectorAll("[data-close]").forEach((b) => {
      b.onclick = () => modal.remove();
    });
    modal?.querySelector("[data-go-docs]")?.addEventListener("click", () => {
      modal.remove();
      openHelp("docs");
    });
  }

  function showSupportModal() {
    document.querySelector(".pp-modal.topbar-support")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="pp-modal topbar-support topbar-help-modal"><button class="pp-backdrop" data-close type="button"></button>
      <section class="pp-dialog">
        <button class="pp-close" data-close type="button">✕</button>
        <h2>Contact support</h2>
        <p>Get help from our team. Requests are stored in this workspace session.</p>
        <form class="pp-form pp-form-stack" data-f style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
          <label class="full"><span class="pp-label-text">Topic</span>
            <select class="pp-input" name="topic">
              <option>Technical</option>
              <option>Deliverability</option>
              <option>Billing</option>
              <option>Security</option>
              <option>Documentation</option>
            </select>
          </label>
          <label class="full"><span class="pp-label-text">Message</span>
            <textarea class="pp-input pp-textarea" name="body" rows="4" required placeholder="Describe the issue…"></textarea>
          </label>
        </form>
        <div class="pp-modal-actions">
          <button class="pp-btn" data-close type="button">Cancel</button>
          <button class="pp-btn primary" data-save type="button">Submit</button>
        </div>
      </section></div>`
    );
    const modal = document.querySelector(".topbar-support");
    modal?.querySelectorAll("[data-close]").forEach((b) => {
      b.onclick = () => modal.remove();
    });
    modal?.querySelector("[data-save]")?.addEventListener("click", () => {
      const f = modal.querySelector("[data-f]");
      if (f && !f.reportValidity()) return;
      const d = f ? Object.fromEntries(new FormData(f)) : {};
      try {
        window.SendittoStore?.logEvent?.("info", "support.request", `${d.topic || "Support"}: ${(d.body || "").slice(0, 80)}`);
      } catch (_) {}
      modal.remove();
      try {
        window.SendittoUI?.toast?.("Support request logged") ||
          console.info("[Senditto] Support request logged");
      } catch (_) {}
      // lightweight toast fallback
      const t = document.createElement("div");
      t.textContent = "Support request logged";
      t.style.cssText =
        "position:fixed;bottom:24px;right:24px;z-index:2147483647;background:#0f172a;color:#fff;padding:12px 16px;border-radius:10px;font:600 13px system-ui";
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2200);
    });
  }

  function openHelp(section) {
    // Status / support / API can open as self-contained modals without waiting on page
    if (section === "status") {
      showStatusModal();
      return;
    }
    if (section === "api") {
      // Prefer in-page enterprise API ref when Help page is available; else modal
      if (window.SendittoUI?.help) {
        goRoute("help", window.SendittoUI.help);
        setTimeout(() => {
          const btn = document.querySelector("#senditto-platform-root [data-ent-api-ref]");
          if (btn) btn.click();
          else showApiRefModal();
        }, 80);
      } else {
        showApiRefModal();
      }
      return;
    }
    if (section === "support") {
      if (window.SendittoUI?.help) {
        goRoute("help", window.SendittoUI.help);
        setTimeout(() => {
          const btn = document.querySelector("#senditto-platform-root [data-ent-support]");
          if (btn) btn.click();
          else showSupportModal();
        }, 80);
      } else {
        showSupportModal();
      }
      return;
    }
    // docs
    if (window.SendittoUI?.help) {
      goRoute("help", window.SendittoUI.help);
    }
  }

  function positionMenu(menu, anchor) {
    const r = anchor.getBoundingClientRect();
    const mw = Math.min(320, window.innerWidth - 24);
    let left = r.right - mw;
    if (left < 12) left = 12;
    if (left + mw > window.innerWidth - 12) left = window.innerWidth - mw - 12;
    let top = r.bottom + 8;
    // measure after paint if needed
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    requestAnimationFrame(() => {
      const h = menu.getBoundingClientRect().height;
      if (top + h > window.innerHeight - 12) {
        top = Math.max(12, r.top - h - 8);
        menu.style.top = `${Math.round(top)}px`;
      }
    });
  }

  function openMenu(anchor) {
    ensureStyles();
    closeOverlayModals();
    closeMenu();
    // prevent SPA from also showing clipped popover
    document.body.classList.add("senditto-help-open");

    const menu = document.createElement("div");
    menu.id = MENU_ID;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Help & documentation");
    menu.innerHTML = `
      <div class="sh-title">Help &amp; documentation</div>
      <button type="button" class="sh-item" data-action="docs" role="menuitem">
        <span class="sh-ico">📘</span>
        <span class="sh-text"><b>Documentation</b><small>Feature guides and tutorials</small></span>
        <span class="sh-chev">›</span>
      </button>
      <button type="button" class="sh-item" data-action="api" role="menuitem">
        <span class="sh-ico">⌘</span>
        <span class="sh-text"><b>API reference</b><small>Endpoints, SDKs and examples</small></span>
        <span class="sh-chev">›</span>
      </button>
      <button type="button" class="sh-item" data-action="status" role="menuitem">
        <span class="sh-ico">●</span>
        <span class="sh-text"><b>System status</b><small>All systems operational</small></span>
        <span class="sh-chev">›</span>
      </button>
      <button type="button" class="sh-item" data-action="support" role="menuitem">
        <span class="sh-ico">💬</span>
        <span class="sh-text"><b>Contact support</b><small>Get help from our team</small></span>
        <span class="sh-chev">›</span>
      </button>
    `;
    document.body.appendChild(menu);
    positionMenu(menu, anchor);

    menu.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = btn.dataset.action;
        closeMenu();
        if (action === "docs") openHelp("docs");
        else if (action === "api") openHelp("api");
        else if (action === "status") openHelp("status");
        else if (action === "support") openHelp("support");
      });
    });
  }

  function findHelpButton(from) {
    if (!from) return null;
    return (
      from.closest?.('button[aria-label="Help and documentation"]') ||
      from.closest?.(".top-action-wrap > button")
    );
  }

  function isHelpButton(el) {
    if (!el || el.tagName !== "BUTTON") return false;
    const label = (el.getAttribute("aria-label") || "").toLowerCase();
    if (label.includes("help and documentation") || label.includes("help")) return true;
    // help is typically the first icon button in top-actions
    const wrap = el.closest(".top-action-wrap");
    if (!wrap) return false;
    const actions = el.closest(".top-actions");
    if (!actions) return false;
    // only treat as help if aria-label matches or it's the docs toggle (class active + docs popover sibling)
    return label.includes("documentation");
  }

  // Capture-phase: own the Help button completely
  document.addEventListener(
    "click",
    (e) => {
      const portal = document.getElementById(MENU_ID);
      if (portal && portal.contains(e.target)) return; // item handlers

      const helpBtn =
        e.target.closest?.('button[aria-label="Help and documentation"]') ||
        e.target.closest?.('button[aria-label="Help & documentation"]');

      if (helpBtn) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        if (isOpen()) closeMenu();
        else openMenu(helpBtn);
        return;
      }

      // outside click closes portal
      if (portal && !portal.contains(e.target)) {
        closeMenu();
      }
    },
    true
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) closeMenu();
  });

  window.addEventListener("resize", () => {
    if (isOpen()) closeMenu();
  });
  window.addEventListener(
    "scroll",
    () => {
      if (isOpen()) closeMenu();
    },
    true
  );

  // Profile popover items (settings / workspaces) — keep lightweight enhance
  function bindProfilePopover(popover) {
    if (!popover || popover.dataset.boundMenus === "1") return;
    popover.dataset.boundMenus = "1";
    popover.querySelectorAll("button").forEach((btn) => {
      const label = (btn.querySelector("b")?.textContent || btn.textContent || "").trim();
      btn.addEventListener("click", (e) => {
        if (/settings/i.test(label) && window.SendittoUI?.settings) {
          e.stopPropagation();
          document.querySelector(".top-dismiss")?.click();
          goRoute("settings", window.SendittoUI.settings);
        }
        if (/workspace/i.test(label) && window.SendittoUI?.workspaces) {
          e.stopPropagation();
          document.querySelector(".top-dismiss")?.click();
          goRoute("workspaces", window.SendittoUI.workspaces);
        }
      });
    });
  }

  // Also wire SPA docs-popover items if they ever appear (fallback)
  function bindDocsPopover(popover) {
    if (!popover || popover.dataset.boundMenus === "1") return;
    popover.dataset.boundMenus = "1";
    popover.querySelectorAll("button").forEach((btn) => {
      const label = (btn.querySelector("b")?.textContent || btn.textContent || "").trim();
      if (!label || label === "Help & documentation") return;
      btn.style.cursor = "pointer";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelector(".top-dismiss")?.click();
        if (/documentation/i.test(label)) openHelp("docs");
        else if (/api reference/i.test(label)) openHelp("api");
        else if (/system status/i.test(label)) openHelp("status");
        else if (/contact support/i.test(label)) openHelp("support");
      });
    });
  }

  function scan() {
    document.querySelectorAll(".docs-popover").forEach(bindDocsPopover);
    document.querySelectorAll(".profile-popover").forEach(bindProfilePopover);
  }

  const obs = new MutationObserver(() => scan());
  const start = () => {
    ensureStyles();
    obs.observe(document.body, { childList: true, subtree: true });
    scan();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
