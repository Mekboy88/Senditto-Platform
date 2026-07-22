/**
 * Webhooks v2 — overrides the "webhooks" route.
 * Same security model as API keys: the HMAC signing secret is shown ONCE at
 * creation (or when rolled) and stored only masked — never revealable.
 * Per-row actions live in one ⋯ menu (Send test, Pause/Enable, Roll secret,
 * permanent Delete) — every dialog is the platform's own window.
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${{
    hook:'<path d="M18 16.5a4 4 0 1 1-3.5-6.5V6a3 3 0 1 0-3-3"/><path d="m14 7 2 3 3-2"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    check:'<path d="m20 6-11 11-5-5"/>',
    dots:'<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
    send:'<path d="m4 4 16 8-16 8 4-8Z"/><path d="M8 12h6"/>',
    pause:'<path d="M9 5v14M15 5v14"/>',
    play:'<path d="m8 5 11 7-11 7Z"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-2 5.3M20 4v7h-7"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9.5 11.5 11 13l3.5-3.5"/>',
    eyeoff:'<path d="M2 12s4-7 10-7c2 0 3.8.7 5.3 1.7M22 12s-4 7-10 7c-2 0-3.8-.7-5.3-1.7"/><path d="m3 3 18 18"/>',
  }[n] || ""}</svg>`;

  const EVENTS = ["email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained", "contact.subscribed", "contact.unsubscribed"];
  let addOpen = false;
  const rand = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const maskOf = (sec) => `${sec.slice(0, 10)}••••${sec.slice(-4)}`;

  function scrub(s, rows) {
    for (const w of rows) if (w.secret) s.update("webhooks", w.id, { secret: undefined, signingMasked: w.signingMasked || maskOf(String(w.secret)) });
  }

  function render(root) {
    const s = S();
    if (!s) throw new Error("Platform store is still loading. Click Try again.");
    root.dataset.platformPage = "webhooks-pro";
    const rows = s.list("webhooks");
    scrub(s, rows);
    const active = rows.filter((w) => /active/i.test(w.status || "")).length;
    const ok = rows.reduce((a, w) => a + (Number(w.success) || 0), 0);
    const failed = rows.reduce((a, w) => a + (Number(w.failed) || 0), 0);

    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">EVENT DELIVERY</small>
          <h1>Webhooks</h1>
          <p>Signed delivery, bounce, open and click events pushed to your systems. Signing secrets are shown <b>once</b> — afterwards they can only be rolled.</p>
        </div>
        <div class="sd-head-actions">
          <span class="tp2-safe">${svg("eyeoff")} Secrets never re-shown</span>
          <button class="sd-btn primary" data-act="add">${svg("plus")} Add endpoint</button>
        </div>
      </div>

      <div class="sd-kpis cr-kpis4">
        ${[["Endpoints", rows.length], ["Active", active], ["Delivered events", ok.toLocaleString()], ["Failed events", failed.toLocaleString()]]
          .map(([l, v]) => `<div class="sd-kpi"><div class="sd-kpi-top"><span>${l}</span></div><div class="sd-kpi-value">${v}</div></div>`).join("")}
      </div>

      <section class="sd-card3 ak-auth">
        <div>
          <h3>Verify every delivery</h3>
          <p>Each POST includes a <code>Senditto-Signature</code> HMAC-SHA256 header computed with your endpoint's signing secret. Reject anything that doesn't verify.</p>
        </div>
      </section>

      ${rows.length === 0 ? `
      <section class="sd-card3"><div class="sd-empty">${svg("hook")}
        <h4>No webhook endpoints yet</h4><p>Add an https endpoint and choose which events your app receives.</p>
        <div class="sd-hero-actions" style="margin-top:10px"><button class="sd-btn primary" data-act="add">${svg("plus")} Add your first endpoint</button></div>
      </div></section>` : `
      <section class="sd-card3">
        <div class="sd-table-wrap"><table class="sd-table">
          <thead><tr><th>Endpoint</th><th>URL</th><th>Events</th><th>Status</th><th>OK / failed</th><th>Last delivery</th><th></th></tr></thead>
          <tbody>
            ${rows.map((w) => {
              const isActive = /active/i.test(w.status || "");
              return `
              <tr data-id="${esc(w.id)}" class="${isActive ? "" : "ak-revoked"}">
                <td><div class="cr-person"><span class="dm-ico" style="width:32px;height:32px;border-radius:9px">${svg("hook")}</span>
                  <span><b>${esc(w.name || "Endpoint")}</b><small class="ak-mono">${esc(w.signingMasked || "whsec_••••••••")}</small></span></div></td>
                <td><code class="ak-mono" style="font-size:12px;color:#33415a">${esc(w.url || "—")}</code></td>
                <td>${(Array.isArray(w.events) ? w.events : []).slice(0, 2).map((ev) => `<span class="cr-tag">${esc(ev)}</span>`).join("")}${(w.events?.length || 0) > 2 ? `<span class="cr-tag">+${w.events.length - 2}</span>` : ""}</td>
                <td><span class="sd-chip ${isActive ? "ok" : "wait"}"><i></i>${isActive ? "Active" : "Paused"}</span></td>
                <td class="sd-mut">${Number(w.success) || 0} / ${Number(w.failed) || 0}</td>
                <td class="sd-mut">${w.lastDelivery ? esc(s.formatRelative?.(w.lastDelivery)) : "—"}</td>
                <td class="cr-rowact"><button class="cr-ic" data-menu title="Actions">${svg("dots")}</button></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table></div>
      </section>`}
    </div>`;

    wire(root);
    if (addOpen) openAdd(root);
  }

  const closeMenus = () => document.querySelectorAll(".ak-menu").forEach((m) => m.remove());

  function wire(root) {
    const s = S();
    root.querySelectorAll('[data-act="add"]').forEach((b) => b.addEventListener("click", () => { addOpen = true; render(root); }));
    root.querySelectorAll("[data-menu]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const existing = document.querySelector(".ak-menu");
        closeMenus();
        if (existing && existing.dataset.for === btn.closest("tr").dataset.id) return;
        const tr = btn.closest("tr");
        const w = s.list("webhooks").find((x) => String(x.id) === tr.dataset.id);
        if (!w) return;
        const isActive = /active/i.test(w.status || "");
        const menu = document.createElement("div");
        menu.className = "ak-menu";
        menu.dataset.for = tr.dataset.id;
        menu.innerHTML = `
          <button data-m="test">${svg("send")} Send test event</button>
          <button data-m="toggle">${isActive ? `${svg("pause")} Pause endpoint` : `${svg("play")} Enable endpoint`}</button>
          <button data-m="roll">${svg("refresh")} Roll signing secret…</button>
          <button data-m="delete" class="danger">${svg("trash")} Delete endpoint…</button>`;
        const r = btn.getBoundingClientRect();
        menu.style.top = `${r.bottom + 6}px`;
        menu.style.left = `${Math.max(8, r.right - 210)}px`;
        document.body.appendChild(menu);
        menu.querySelectorAll("[data-m]").forEach((mi) =>
          mi.addEventListener("click", async () => {
            closeMenus();
            if (mi.dataset.m === "test") {
              s.update("webhooks", w.id, { success: (Number(w.success) || 0) + 1, lastDelivery: new Date().toISOString() });
              s.logEvent?.("success", "webhook.test", `Test event delivered to “${w.name}” (signed)`, {});
              window.SendittoAlert?.(`A signed test event was queued to:\n${w.url}\n\nCheck your endpoint logs — verify the Senditto-Signature header.`, "Test event sent");
            }
            if (mi.dataset.m === "toggle") {
              s.update("webhooks", w.id, { status: isActive ? "Paused" : "Active" });
              s.logEvent?.("info", "webhook.toggle", `Endpoint “${w.name}” ${isActive ? "paused" : "enabled"}`, {});
            }
            if (mi.dataset.m === "roll") {
              const ok = await window.SendittoConfirm({ title: "Roll signing secret", message: `Roll the signing secret for “${w.name}”?\n\nA new secret is shown once. Deliveries signed with the old secret stop verifying immediately — update your endpoint right after.`, confirmLabel: "Roll secret" });
              if (!ok) return;
              const sec = `whsec_${rand(16)}`;
              s.update("webhooks", w.id, { signingMasked: maskOf(sec) });
              s.logEvent?.("warn", "webhook.roll", `Signing secret rolled for “${w.name}”`, {});
              showSecret(w.name, sec);
            }
            if (mi.dataset.m === "delete") {
              const ok = await window.SendittoConfirm({ title: "Delete endpoint", message: `Permanently delete “${w.name}”?\n\n${w.url}\n\nYour application stops receiving events immediately. This cannot be undone.`, danger: true, confirmLabel: "Delete permanently" });
              if (!ok) return;
              s.remove("webhooks", w.id);
              s.logEvent?.("warn", "webhook.delete", `Endpoint “${w.name}” permanently deleted`, {});
            }
          })
        );
      })
    );
    document.addEventListener("click", closeMenus, { once: true });
  }

  function openAdd(root) {
    const s = S();
    const el = document.createElement("div");
    el.className = "pp-modal cr-modal";
    el.innerHTML = `
      <div class="cr-modal-card" role="dialog" aria-modal="true">
        <div class="cr-modal-head"><h3>Add webhook endpoint</h3><button class="cr-x" data-close>${svg("close")}</button></div>
        <div class="cr-modal-body">
          <form class="cr-form" data-form>
            <label>Name<input name="name" required autofocus placeholder="Delivery events"></label>
            <label>Endpoint URL <small>https:// only</small><input name="url" type="url" required placeholder="https://api.yourapp.com/hooks/senditto"></label>
            <label>Events</label>
            <div class="ws-chip-row" style="flex-wrap:wrap" data-events>
              ${EVENTS.map((ev) => `<button type="button" class="cr-chip ${/delivered|bounced/.test(ev) ? "active" : ""}" data-ev="${ev}">${ev}</button>`).join("")}
            </div>
            <p class="cr-help">${svg("shield")} The signing secret is shown <b>once</b> on the next screen — store it in your secret manager.</p>
            <div class="cr-actions">
              <button type="button" class="sd-btn" data-close2>Cancel</button>
              <button type="submit" class="sd-btn primary">Add endpoint</button>
            </div>
          </form>
        </div>
      </div>`;
    const close = () => { addOpen = false; el.remove(); window.SendittoRender?.(); };
    el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
    el.querySelector("[data-close]").addEventListener("click", close);
    el.querySelector("[data-close2]").addEventListener("click", close);
    el.querySelectorAll("[data-ev]").forEach((c) => c.addEventListener("click", () => c.classList.toggle("active")));
    el.querySelector("[data-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const url = String(f.get("url") || "").trim();
      if (!/^https:\/\/[^\s]+$/i.test(url)) return;
      const name = String(f.get("name") || "").trim().slice(0, 60) || "Endpoint";
      const events = [...el.querySelectorAll("[data-ev].active")].map((c) => c.dataset.ev);
      const sec = `whsec_${rand(16)}`;
      s.add("webhooks", { name, url, events: events.length ? events : ["email.delivered"], status: "Active", success: 0, failed: 0, signingMasked: maskOf(sec), lastDelivery: null });
      s.logEvent?.("success", "webhook.create", `Endpoint “${name}” added (secret shown once)`, {});
      addOpen = false;
      el.remove();
      showSecret(name, sec);
      window.SendittoRender?.();
    });
    document.body.appendChild(el);
  }

  function showSecret(name, secret) {
    const el = document.createElement("div");
    el.className = "pp-modal cr-modal";
    el.innerHTML = `
      <div class="cr-modal-card" role="dialog" aria-modal="true">
        <div class="cr-modal-head"><h3>Signing secret — shown once</h3></div>
        <div class="cr-modal-body">
          <p class="cr-help">This is the only time <b>${esc(name)}</b>'s signing secret is visible. Store it now — after this dialog closes it can only be rolled, never viewed.</p>
          <div class="ak-secret"><code>${esc(secret)}</code><button class="sd-btn sm primary" data-copy>${svg("copy")} Copy</button></div>
          <div class="cr-actions" style="margin-top:14px"><button class="sd-btn primary" data-done>I stored it safely — close</button></div>
        </div>
      </div>`;
    el.querySelector("[data-copy]").addEventListener("click", (e) => {
      navigator.clipboard?.writeText(secret);
      e.currentTarget.innerHTML = `${svg("check")} Copied`;
    });
    el.querySelector("[data-done]").addEventListener("click", () => { el.remove(); window.SendittoRender?.(); });
    document.body.appendChild(el);
  }

  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.webhooks = render;
})();
