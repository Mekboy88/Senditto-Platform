/**
 * Final pass — rebuilds Suppressions, OTP & verification and Audit log on the
 * design kit (⋯ menus, in-app dialogs, no loud buttons), and upgrades the
 * shell: Settings/Help live inside the scrolling nav, the sidebar Sign out is
 * replaced by a live usage widget (Sign out moves to the profile dropdown),
 * per-section accent colors, collapse support, and a proper popover shadow.
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${{
    ban:'<circle cx="12" cy="12" r="9"/><path d="m5.5 5.5 13 13"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    dots:'<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9.5 11.5 11 13l3.5-3.5"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    check:'<path d="m20 6-11 11-5-5"/>',
    send:'<path d="m4 4 16 8-16 8 4-8Z"/><path d="M8 12h6"/>',
    scroll:'<path d="M8 21h11a2 2 0 0 0 2-2v-1H10"/><path d="M5 3h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2Z"/><path d="M9 8h6M9 12h6"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4"/><path d="M5 20h14"/>',
  }[n] || ""}</svg>`;
  const closeMenus = () => document.querySelectorAll(".ak-menu").forEach((m) => m.remove());
  const rowMenu = (btn, items) => {
    closeMenus();
    const menu = document.createElement("div");
    menu.className = "ak-menu";
    menu.innerHTML = items.map(([m, label, danger, ic]) => `<button data-m="${m}" class="${danger ? "danger" : ""}">${svg(ic)} ${label}</button>`).join("");
    const r = btn.getBoundingClientRect();
    menu.style.top = `${r.bottom + 6}px`;
    menu.style.left = `${Math.max(8, r.right - 210)}px`;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener("click", closeMenus, { once: true }), 0);
    return menu;
  };

  /* ================= SUPPRESSIONS ================= */

  const REASONS = { bounce: ["Hard bounce", "bad"], complaint: ["Spam complaint", "bad"], unsubscribe: ["Unsubscribe", "wait"], manual: ["Manual block", "mut"] };
  let supAdd = false;

  function renderSup(root) {
    const s = S();
    const rows = s.list("suppressions");
    const n = (r) => rows.filter((x) => (x.reason || "").toLowerCase().includes(r)).length;
    root.dataset.platformPage = "sup-pro";
    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div><small class="pp-kicker">REPUTATION PROTECTION</small><h1>Suppressions</h1>
        <p>Hard bounces, complaints, unsubscribes and manual blocks. These addresses never receive mail — critical for sending reputation.</p></div>
        <div class="sd-head-actions"><button class="sd-btn primary" data-act="add">${svg("plus")} Add address</button></div>
      </div>
      <div class="sd-kpis cr-kpis4">
        ${[["Suppressed", rows.length], ["Bounces", n("bounce")], ["Complaints", n("complaint")], ["Unsubscribes", n("unsub")]]
          .map(([l, v]) => `<div class="sd-kpi"><div class="sd-kpi-top"><span>${l}</span></div><div class="sd-kpi-value">${v}</div></div>`).join("")}
      </div>
      ${rows.length === 0 ? `<section class="sd-card3"><div class="sd-empty">${svg("ban")}<h4>No suppressed addresses</h4><p>Bounces, complaints and unsubscribes land here automatically.</p></div></section>` : `
      <section class="sd-card3"><div class="sd-table-wrap"><table class="sd-table">
        <thead><tr><th>Email</th><th>Reason</th><th>Source</th><th>Added</th><th></th></tr></thead>
        <tbody>${rows.map((x) => {
          const key = Object.keys(REASONS).find((k) => (x.reason || "").toLowerCase().includes(k)) || "manual";
          const [label, tone] = REASONS[key];
          return `<tr data-id="${esc(x.id)}">
            <td><b>${esc(x.email)}</b></td>
            <td><span class="sd-chip ${tone}"><i></i>${label}</span></td>
            <td><span class="cr-tag">${esc(x.source || "manual")}</span></td>
            <td class="sd-mut">${esc(s.formatRelative?.(x.createdAt) || "—")}</td>
            <td class="cr-rowact"><button class="cr-ic" data-menu>${svg("dots")}</button></td></tr>`;
        }).join("")}</tbody></table></div></section>`}
    </div>`;
    root.querySelector('[data-act="add"]')?.addEventListener("click", () => { supAdd = true; renderSup(root); });
    root.querySelectorAll("[data-menu]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const x = s.list("suppressions").find((r) => String(r.id) === btn.closest("tr").dataset.id);
        if (!x) return;
        rowMenu(btn, [["remove", "Remove from list…", true, "trash"]]).querySelector("[data-m='remove']").addEventListener("click", async () => {
          closeMenus();
          const ok = await window.SendittoConfirm({ title: "Remove suppression", message: `Allow mail to ${x.email} again?\n\nOnly do this when the recipient has clearly asked to receive email again.`, danger: true, confirmLabel: "Remove & allow mail" });
          if (!ok) return;
          s.remove("suppressions", x.id);
          s.logEvent?.("warn", "suppressions.remove", `${x.email} removed from the suppression list`, {});
        });
      })
    );
    if (supAdd) {
      const el = document.createElement("div");
      el.className = "pp-modal cr-modal";
      el.innerHTML = `<div class="cr-modal-card"><div class="cr-modal-head"><h3>Add suppressed address</h3><button class="cr-x" data-close>${svg("close")}</button></div>
        <div class="cr-modal-body"><form class="cr-form" data-form>
          <label>Email<input name="email" type="email" required autofocus placeholder="person@example.com"></label>
          <label>Reason<select name="reason"><option value="manual">Manual block</option><option value="unsubscribe">Unsubscribe request</option><option value="bounce">Known bad address</option></select></label>
          <p class="cr-help">${svg("shield")} The address stops receiving all mail from this workspace immediately.</p>
          <div class="cr-actions"><button type="button" class="sd-btn" data-close2>Cancel</button><button class="sd-btn primary">Suppress address</button></div>
        </form></div></div>`;
      const close = () => { supAdd = false; el.remove(); window.SendittoRender?.(); };
      el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
      el.querySelector("[data-close]").addEventListener("click", close);
      el.querySelector("[data-close2]").addEventListener("click", close);
      el.querySelector("[data-form]").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const email = String(f.get("email") || "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
        s.add("suppressions", { email, reason: String(f.get("reason")), source: "operator_manual" });
        s.logEvent?.("info", "suppressions.add", `${email} suppressed manually`, {});
        close();
      });
      document.body.appendChild(el);
      supAdd = false;
    }
  }

  /* ================= OTP & VERIFICATION ================= */

  const FLOWS = [
    ["sign-in", "Sign-in codes", "Passwordless login codes — single use, short TTL."],
    ["2fa", "Two-step auth", "Second factor after password sign-in."],
    ["email-verify", "Email verification", "Prove address ownership before activation."],
  ];

  function renderOtp(root) {
    const s = S();
    const rows = s.list("otps");
    root.dataset.platformPage = "otp-pro";
    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div><small class="pp-kicker">TRANSACTIONAL SECURITY</small><h1>OTP &amp; verification</h1>
        <p>One-time codes for login, signup and sensitive actions — 6 digits, 10-minute TTL, single use.</p></div>
        <div class="sd-head-actions"><button class="sd-btn" data-act="api">${svg("copy")} Copy API example</button></div>
      </div>
      <div class="sd-kpis cr-kpis4">
        ${[["Flows", FLOWS.length], ["Codes sent", rows.length], ["Verified", rows.filter((o) => /verified/i.test(o.status || "")).length], ["Code format", "6 digits"]]
          .map(([l, v]) => `<div class="sd-kpi"><div class="sd-kpi-top"><span>${l}</span></div><div class="sd-kpi-value">${v}</div></div>`).join("")}
      </div>
      <div class="cr-cards">
        ${FLOWS.map(([id, name, desc]) => {
          const sent = rows.filter((o) => (o.purpose || "") === id).length;
          return `<section class="sd-card3 cr-seg" data-flow="${id}">
            <div class="cr-card-top"><h3>${name}</h3><span class="sd-chip ok"><i></i>Live</span></div>
            <p class="cr-desc">${desc}</p>
            <div class="cr-auto-meta"><span>6 digits</span><span>TTL 10 min</span><span>Single use</span><span>${sent} sent</span></div>
            <div class="cr-card-actions"><button class="sd-btn sm primary" data-test="${id}">${svg("send")} Send test code</button></div>
          </section>`;
        }).join("")}
      </div>
      ${rows.length ? `
      <section class="sd-card3">
        <div class="sd-card3-head"><div><h3>Recent codes</h3><p>Latest one-time codes issued by this workspace</p></div></div>
        <div class="sd-table-wrap"><table class="sd-table">
          <thead><tr><th>Recipient</th><th>Flow</th><th>Status</th><th>Attempts</th><th>Issued</th><th></th></tr></thead>
          <tbody>${rows.slice(0, 10).map((o) => `
            <tr data-id="${esc(o.id)}">
              <td><b>${esc(o.email || "—")}</b></td>
              <td><span class="cr-tag">${esc(o.purpose || "sign-in")}</span></td>
              <td><span class="sd-chip ${/verified/i.test(o.status || "") ? "ok" : /expired/i.test(o.status || "") ? "bad" : "wait"}"><i></i>${esc(o.status || "Pending")}</span></td>
              <td class="sd-mut">${Number(o.attempts) || 1}</td>
              <td class="sd-mut">${esc(s.formatRelative?.(o.createdAt) || "—")}</td>
              <td class="cr-rowact"><button class="cr-ic" data-menu>${svg("dots")}</button></td>
            </tr>`).join("")}</tbody></table></div>
      </section>` : ""}
    </div>`;
    root.querySelector('[data-act="api"]')?.addEventListener("click", (e) => {
      navigator.clipboard?.writeText(`curl -X POST https://api.senditto.com/v1/otp/send \\\n  -H "Authorization: Bearer YOUR_SECRET_KEY" \\\n  -d '{"to":"user@example.com","purpose":"sign-in"}'`);
      e.currentTarget.innerHTML = `${svg("check")} Copied`;
    });
    root.querySelectorAll("[data-test]").forEach((b) =>
      b.addEventListener("click", () => {
        s.add("otps", { email: "you@yourdomain.com", purpose: b.dataset.test, status: "Pending", attempts: 1 });
        s.logEvent?.("info", "otp.send", `Test ${b.dataset.test} code issued`, {});
        window.SendittoAlert?.(`A test ${b.dataset.test} code was issued to you@yourdomain.com.\n\nIn production your app calls POST /v1/otp/send and verifies with POST /v1/otp/verify.`, "Test code sent");
      })
    );
    root.querySelectorAll("[data-menu]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const o = s.list("otps").find((r) => String(r.id) === btn.closest("tr").dataset.id);
        if (!o) return;
        rowMenu(btn, [["del", "Delete record…", true, "trash"]]).querySelector("[data-m='del']").addEventListener("click", async () => {
          closeMenus();
          if (await window.SendittoConfirm({ title: "Delete OTP record", message: `Delete this code record for ${o.email}? The code itself is already single-use.`, danger: true, confirmLabel: "Delete record" })) s.remove("otps", o.id);
        });
      })
    );
  }

  /* ================= AUDIT LOG ================= */

  let auditLevel = "All";

  function renderAudit(root) {
    const s = S();
    const all = s.list("logs");
    const rows = all.filter((l) => auditLevel === "All" || String(l.level || "info").toLowerCase() === auditLevel.toLowerCase());
    root.dataset.platformPage = "audit-pro";
    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div><small class="pp-kicker">SECURITY &amp; COMPLIANCE</small><h1>Audit log</h1>
        <p>Immutable trail of configuration and sensitive actions in this workspace.</p></div>
        <div class="sd-head-actions"><button class="sd-btn" data-act="export">${svg("download")} Export JSON</button></div>
      </div>
      <div class="sd-kpis cr-kpis4">
        ${[["Events", all.length], ["Security", all.filter((l) => /key|secret|domain|matrix|delete|revoke|roll/i.test(l.event || "")).length], ["Warnings", all.filter((l) => /warn|error/i.test(l.level || "")).length], ["Retention", "Local"]]
          .map(([l, v]) => `<div class="sd-kpi"><div class="sd-kpi-top"><span>${l}</span></div><div class="sd-kpi-value">${v}</div></div>`).join("")}
      </div>
      <section class="sd-card3">
        <div class="cr-toolbar"><div></div><div class="cr-chips">${["All", "Success", "Info", "Warn", "Error"].map((f) => `<button class="cr-chip ${auditLevel === f ? "active" : ""}" data-lvl="${f}">${f}</button>`).join("")}</div></div>
        ${rows.length === 0 ? `<div class="sd-empty">${svg("scroll")}<h4>No events</h4><p>Actions across the workspace are recorded here.</p></div>` : `
        <div class="cr-loglist">
          ${rows.slice(0, 120).map((l) => `
            <div class="cr-log"><div class="cr-log-line" style="cursor:default">
              <span class="cr-lvl ${esc(String(l.level || "info").toLowerCase())}">${esc(String(l.level || "info").toUpperCase())}</span>
              <code class="cr-log-event">${esc(l.event || "event")}</code>
              <span class="cr-log-msg">${esc(l.message || "")}</span>
              <time>${esc(s.formatRelative?.(l.createdAt) || "")}</time>
            </div></div>`).join("")}
        </div>
        ${rows.length > 120 ? `<p class="sd-mut" style="margin:10px 4px 0">Showing the latest 120 of ${rows.length} events — export for the full trail.</p>` : ""}`}
      </section>
    </div>`;
    root.querySelectorAll("[data-lvl]").forEach((b) => b.addEventListener("click", () => { auditLevel = b.dataset.lvl; renderAudit(root); }));
    root.querySelector('[data-act="export"]')?.addEventListener("click", (e) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 2)], { type: "application/json" }));
      a.download = "senditto-audit.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      const b = e.currentTarget;
      b.innerHTML = `${svg("check")} Exported`;
      setTimeout(() => (b.innerHTML = `${svg("download")} Export JSON`), 1200);
    });
  }

  /* ================= SHELL UPGRADE ================= */

  function upgradeShell() {
    const nav = document.querySelector(".dashboard-sidebar nav");
    const bottom = document.querySelector(".dashboard-sidebar .sidebar-bottom");
    if (!nav || !bottom || nav.dataset.sdShell === "1") { updateUsage(); return; }
    nav.dataset.sdShell = "1";

    // Move Settings + Help into the scrolling nav as a "General" group
    const group = document.createElement("div");
    group.className = "nav-group";
    group.setAttribute("data-sd-general", "1");
    const small = document.createElement("small");
    small.textContent = "General";
    group.appendChild(small);
    [...bottom.querySelectorAll("button")].forEach((b) => {
      const label = (b.textContent || "").trim();
      if (/settings|help/i.test(label)) group.appendChild(b);
      if (/sign out/i.test(label)) b.classList.add("sd-hidden-signout");
    });
    nav.appendChild(group);

    // Helpful usage widget where Sign out used to be
    const widget = document.createElement("div");
    widget.className = "sd-side-usage";
    widget.setAttribute("data-sd-usage", "1");
    bottom.appendChild(widget);
    updateUsage();
    window.addEventListener("senditto:store", () => setTimeout(updateUsage, 60));
  }

  function updateUsage() {
    const el = document.querySelector("[data-sd-usage]");
    const s = S();
    if (!el || !s) return;
    const month = new Date().toISOString().slice(0, 7);
    const sent = s.list("messages").filter((m) => (m.createdAt || "").slice(0, 7) === month).length;
    if (el.dataset.sent === String(sent)) return; // no DOM churn — keeps observers quiet
    el.dataset.sent = String(sent);
    const quota = Number(s.snapshot?.()?.capacity?.monthlyQuota) || 1000000;
    const pct = Math.min(100, (sent / quota) * 100);
    el.innerHTML = `<div class="sd-side-usage-top"><span>Monthly usage</span><b>${sent.toLocaleString()}</b></div>
      <div class="sd-progress slim"><i style="width:${Math.max(pct, sent ? 2 : 0)}%"></i></div>
      <small>${quota >= 1e6 ? (quota / 1e6) + "M" : quota.toLocaleString()} emails / month · all systems <i class="sd-ok-dot"></i></small>`;
  }

  // Sign out inside the top-right profile dropdown — always present + functional
  function ensureProfileSignout() {
    const pops = document.querySelectorAll(".profile-popover, .top-popover");
    pops.forEach((pop) => {
      if (pop.querySelector("[data-sd-signout]")) return;
      const hasSignout = [...pop.querySelectorAll("button, a")].some((b) => /sign out/i.test(b.textContent || ""));
      const doSignout = (e) => {
        e?.preventDefault?.();
        document.querySelector(".sd-hidden-signout")?.click();
      };
      if (hasSignout) {
        [...pop.querySelectorAll("button, a")].filter((b) => /sign out/i.test(b.textContent || "")).forEach((b) => {
          b.setAttribute("data-sd-signout", "1");
          b.addEventListener("click", doSignout);
        });
      } else {
        const btn = document.createElement("button");
        btn.setAttribute("data-sd-signout", "1");
        btn.className = "sd-pop-signout";
        btn.innerHTML = `${svg("close")} Sign out`;
        btn.addEventListener("click", doSignout);
        pop.appendChild(btn);
      }
    });
  }

  // Composer CTA block: give it a real behavior
  document.addEventListener("click", (e) => {
    const cta = e.target.closest(".se-block-button");
    if (!cta) return;
    e.preventDefault();
    window.SendittoAlert?.(
      "This is your email's call-to-action button.\n\nIts color and corner style come from your Brand kit (Templates → Brand kit). The button text and destination link are set per message in Advanced message settings, or by your template.",
      "Call-to-action button"
    );
  });

  const obs = new MutationObserver(() => {
    clearTimeout(obs._t);
    obs._t = setTimeout(() => { upgradeShell(); ensureProfileSignout(); }, 100);
  });
  const start = () => {
    obs.observe(document.getElementById("root") || document.body, { subtree: true, childList: true });
    upgradeShell();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  // Own these routes even if legacy modules re-register after load
  function claim() {
    window.SendittoUI = window.SendittoUI || {};
    window.SendittoUI.suppressions = renderSup;
    window.SendittoUI.otp = renderOtp;
    window.SendittoUI.audit = renderAudit;
  }
  claim();
  [150, 400, 900, 1800, 3200].forEach((ms) => setTimeout(claim, ms));
  window.addEventListener("senditto:store", claim);

  // Watchdog: legacy modules re-render these routes over ours — take them back.
  const MARK = { suppressions: "sup-pro", otp: "otp-pro", audit: "audit-pro" };
  setInterval(() => {
    const root = document.getElementById("senditto-platform-root");
    if (!root) return;
    const route = root.dataset.route;
    if (MARK[route] && root.dataset.platformPage !== MARK[route] && !document.querySelector(".cr-modal, .pp-modal, .ak-menu")) {
      claim();
      ({ suppressions: renderSup, otp: renderOtp, audit: renderAudit })[route](root);
    }
  }, 350);
})();
