/**
 * Overview + Email activity — real metrics from SendittoStore (no demo rows).
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const host = () => document.getElementById("senditto-platform-root");

  function requireStore() {
    const store = S();
    if (!store || typeof store.metrics !== "function") {
      throw new Error("Platform store is still loading. Click Try again in a moment.");
    }
    return store;
  }

  function setupProgress(store) {
    const m = store.metrics();
    const steps = [
      ["Create API key", m.keys > 0, "api"],
      ["Verify domain", m.verifiedDomains > 0, "domains"],
      ["Send test email", m.sent > 0, "send"],
      ["Invite your team", (store.currentWorkspace()?.members || []).length > 0, "settings"],
    ];
    const done = steps.filter((s) => s[1]).length;
    return { steps, done };
  }

  function renderOverview() {
    const h = host();
    if (!h) return;
    const store = requireStore();
    const m = store.metrics();
    const { steps, done } = setupProgress(store);
    const messages = store.list("messages").slice(0, 8);
    const logs = store.list("logs").slice(0, 5);
    const cap = store.get().capacity || {};
    const keys = store.list("keys").length;
    const domains = store.list("domains").length;
    const verified = store.list("domains").filter((d) => /verified/i.test(d.status || "")).length;
    h.dataset.overviewRealtime = "true";
    h.innerHTML = `
      <div class="pp-page ov-page">
        <div class="pp-head">
          <div>
            <small class="pp-kicker">WORKSPACE</small>
            <h1>Overview</h1>
            <p>Live snapshot of ${esc(store.currentWorkspace()?.name || "your workspace")}. Metrics update as you use the platform.</p>
          </div>
          <div class="pp-head-actions">
            <button class="pp-btn" data-ov-nav="activity">Email activity</button>
            <button class="pp-btn primary" data-ov-nav="send">Send email</button>
          </div>
        </div>
        <div class="pp-stats">
          ${stat("Emails sent", m.sent)}
          ${stat("Delivery rate", m.deliveryRate)}
          ${stat("Open rate", m.openRate)}
          ${stat("Click rate", m.clickRate)}
        </div>
        <div class="ov-grid">
          <section class="pp-card">
            <div class="pp-table-head" style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #e8eef8">
              <div><h2 style="margin:0;font-size:16px">Recent messages</h2><p style="margin:4px 0 0;color:#6b7a90;font-size:13px">From this workspace</p></div>
              <button class="pp-btn small" data-ov-nav="activity">View all</button>
            </div>
            ${
              messages.length
                ? `<div class="pp-table">${messages
                    .map(
                      (x) =>
                        `<div class="pp-row"><div class="pp-row-main"><div><b>${esc(x.subject || x.name || "Untitled")}</b><small>${esc((x.to || []).join(", ") || "—")}</small></div></div><span class="pp-badge blue">${esc(x.status || "Queued")}</span><small>${esc(store.formatRelative(x.createdAt))}</small></div>`
                    )
                    .join("")}</div>`
                : `<div class="pp-empty"><h3>No messages yet</h3><p>Send your first email to see live activity here. No demo rows are shown.</p></div>`
            }
          </section>
          <section class="pp-card">
            <div style="padding:16px 18px;border-bottom:1px solid #e8eef8;display:flex;justify-content:space-between;align-items:center">
              <div><h2 style="margin:0;font-size:16px">Quick start</h2><p style="margin:4px 0 0;color:#6b7a90;font-size:13px">Complete workspace setup</p></div>
              <b>${done}/4</b>
            </div>
            <div style="padding:8px 10px">
              ${steps
                .map(
                  ([label, ok, nav]) =>
                    `<button class="pp-btn" data-ov-nav="${nav}" style="width:100%;justify-content:flex-start;margin:6px 0;${ok ? "opacity:.75" : ""}">${ok ? "✓" : "○"} ${esc(label)}</button>`
                )
                .join("")}
            </div>
          </section>
        </div>
        <section class="pp-card" style="margin-top:16px">
          <div style="padding:16px 18px;border-bottom:1px solid #e8eef8"><h2 style="margin:0;font-size:16px">Platform health</h2></div>
          <div class="pp-stats" style="padding:12px">
            ${stat("Contacts", m.contacts)}
            ${stat("Domains", `${m.verifiedDomains}/${m.domains}`)}
            ${stat("API keys", m.activeKeys)}
            ${stat("Webhooks", m.webhooks)}
          </div>
          ${
            logs.length
              ? `<div class="pp-table">${logs
                  .map(
                    (l) =>
                      `<div class="pp-row"><div class="pp-row-main"><div><b>${esc(l.event)}</b><small>${esc(l.message || "")}</small></div></div><span class="pp-badge ${l.level === "success" ? "good" : l.level === "error" ? "warn" : "blue"}">${esc(l.level)}</span><small>${esc(store.formatRelative(l.createdAt))}</small></div>`
                  )
                  .join("")}</div>`
              : `<div class="pp-empty"><p>System events will appear as you create keys, domains and sends.</p></div>`
          }
        </section>
      </div>
      <style>
        .ov-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,.9fr);gap:16px;margin-top:16px;width:100%}
        @media (max-width:1100px){.ov-grid{grid-template-columns:1fr}}
      </style>`;
    bindNav(h);
  }

  function stat(label, value) {
    return `<article class="pp-card pp-stat"><div class="pp-stat-top"><span>${esc(label)}</span></div><b>${esc(value)}</b><small>Live workspace data</small></article>`;
  }

  function renderActivity() {
    const h = host();
    if (!h) return;
    const store = requireStore();
    const messages = store.list("messages");
    h.dataset.overviewRealtime = "activity";
    h.innerHTML = `
      <div class="pp-page">
        <div class="pp-head">
          <div>
            <small class="pp-kicker">MESSAGE STATUS</small>
            <h1>Email activity</h1>
            <p>Every message queued or sent from this workspace.</p>
          </div>
          <div class="pp-head-actions">
            <button class="pp-btn" data-ov-refresh>Refresh</button>
            <button class="pp-btn primary" data-ov-nav="send">Send email</button>
          </div>
        </div>
        <div class="pp-stats">
          ${stat("Total", messages.length)}
          ${stat("Queued", messages.filter((m) => /queued|scheduled/i.test(m.status || "")).length)}
          ${stat("Delivered", messages.filter((m) => /delivered|opened|clicked/i.test(m.status || "")).length)}
          ${stat("Bounced", messages.filter((m) => /bounce/i.test(m.status || "")).length)}
        </div>
        <section class="pp-card pp-table" style="margin-top:16px">
          <div class="pp-table-head"><span>Message</span><span>Status</span><span>Stream</span><span>When</span><span></span></div>
          ${
            messages.length
              ? messages
                  .map(
                    (x) =>
                      `<div class="pp-row"><div class="pp-row-main"><div><b>${esc(x.subject || x.name || "Untitled")}</b><small>${esc((x.to || []).join(", ") || "—")}</small></div></div><span class="pp-badge blue">${esc(x.status || "—")}</span><span>${esc(x.stream || "—")}</span><small>${esc(store.formatRelative(x.createdAt))}</small><button class="pp-btn small" data-ov-msg="${esc(x.id)}">Open</button></div>`
                  )
                  .join("")
              : `<div class="pp-empty"><h3>No email activity yet</h3><p>When you send or queue messages, they appear here in real time. Demo activity has been removed.</p></div>`
          }
        </section>
      </div>`;
    bindNav(h);
    h.querySelector("[data-ov-refresh]")?.addEventListener("click", renderActivity);
    h.querySelectorAll("[data-ov-msg]").forEach((b) => {
      b.onclick = () => {
        const msg = messages.find((m) => m.id === b.dataset.ovMsg);
        if (!msg) return;
        (window.SendittoAlert || console.log)(
          [
            msg.subject || "Untitled",
            `To: ${(msg.to || []).join(", ")}`,
            `Status: ${msg.status}`,
            `From: ${msg.from || "—"}`,
            `ID: ${msg.id}`,
          ].join("\n")
        );
      };
    });
  }

  function bindNav(h) {
    const map = {
      send: "send",
      activity: "activity",
      api: "api",
      domains: "domains",
      settings: "settings",
    };
    h.querySelectorAll("[data-ov-nav]").forEach((b) => {
      b.onclick = () => {
        const route = map[b.dataset.ovNav];
        if (route && window.SendittoNavigate) window.SendittoNavigate(route);
      };
    });
  }

  function maybeEnhance() {
    const h = host();
    const title = h?.querySelector("h1")?.textContent?.trim();
    if (title === "Overview" && h.dataset.overviewRealtime !== "true") renderOverview();
    if (title === "Email activity" && h.dataset.overviewRealtime !== "activity") renderActivity();
  }


  // Register with stable platform router
  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.overview = (root) => {
    if (root) root.id = root.id || "senditto-platform-root";
    renderOverview();
  };
  window.SendittoUI.activity = (root) => {
    if (root) root.id = root.id || "senditto-platform-root";
    renderActivity();
  };
})();
