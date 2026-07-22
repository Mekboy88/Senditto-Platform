/**
 * API keys v2 — overrides the "api" route with a correct security model:
 *  - Full secrets are shown ONCE, in the create/rotate dialog only.
 *  - Secrets are never stored and can never be revealed again — the store
 *    keeps only the masked form (sk_live_ab12••••cd34). Any legacy rows that
 *    still contain a full secret are scrubbed on first render.
 *  - Per-row actions live in a single ⋯ menu: Rotate (new secret, old key
 *    revoked), Revoke, and Remove (revoked keys only) — all confirmed.
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${{
    key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-3 3 3 3m-6 0 3 3"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    check:'<path d="m20 6-11 11-5-5"/>',
    dots:'<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9.5 11.5 11 13l3.5-3.5"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-2 5.3M20 4v7h-7"/>',
    ban:'<circle cx="12" cy="12" r="9"/><path d="m5.5 5.5 13 13"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    eyeoff:'<path d="M2 12s4-7 10-7c2 0 3.8.7 5.3 1.7M22 12s-4 7-10 7c-2 0-3.8-.7-5.3-1.7"/><path d="m3 3 18 18"/>',
  }[n] || ""}</svg>`;

  const SCOPES = ["email:send", "email:batch", "email:read", "domains:read", "domains:write", "suppressions:read", "suppressions:write", "analytics:read"];
  let addOpen = false;
  let onceSecret = null; // {name, secret} — exists only in memory until dialog closes

  const rand = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const maskOf = (secret) => `${secret.slice(0, 12)}••••${secret.slice(-4)}`;

  function scrub(s, rows) {
    for (const k of rows) {
      if (k.secret) s.update("keys", k.id, { secret: undefined, masked: k.masked || maskOf(String(k.secret)) });
    }
  }

  function render(root) {
    const s = S();
    if (!s) throw new Error("Platform store is still loading. Click Try again.");
    root.dataset.platformPage = "keys-pro";
    const rows = s.list("keys");
    scrub(s, rows);
    const active = rows.filter((k) => /active/i.test(k.status || "")).length;

    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">DEVELOPER ACCESS</small>
          <h1>API keys</h1>
          <p>Scoped credentials for your apps. Secrets are shown <b>once</b> when created — after that they can only be rotated or revoked, never revealed.</p>
        </div>
        <div class="sd-head-actions">
          <span class="tp2-safe">${svg("eyeoff")} Secrets never re-shown</span>
          <button class="sd-btn primary" data-act="add">${svg("plus")} Create API key</button>
        </div>
      </div>

      <div class="sd-kpis cr-kpis4">
        ${[["Active keys", active], ["Total keys", rows.length], ["Rate limit", "100 req/s"], ["Auth scheme", "Bearer"]]
          .map(([l, v]) => `<div class="sd-kpi"><div class="sd-kpi-top"><span>${l}</span></div><div class="sd-kpi-value">${v}</div></div>`).join("")}
      </div>

      <section class="sd-card3 ak-auth">
        <div>
          <h3>How production apps authenticate</h3>
          <p>Send <code>Authorization: Bearer sk_live_…</code> on every request. Rotate regularly. Never embed live keys in public frontends — if a secret leaks, revoke it immediately.</p>
        </div>
        <button class="sd-btn sm" data-act="curl">${svg("copy")} Copy curl example</button>
      </section>

      ${rows.length === 0 ? `
      <section class="sd-card3"><div class="sd-empty">${svg("key")}
        <h4>No API keys yet</h4><p>Create a key to authenticate your first request. You'll see the secret exactly once.</p>
        <div class="sd-hero-actions" style="margin-top:10px"><button class="sd-btn primary" data-act="add">${svg("plus")} Create your first key</button></div>
      </div></section>` : `
      <section class="sd-card3">
        <div class="sd-table-wrap"><table class="sd-table">
          <thead><tr><th>Key</th><th>Environment</th><th>Permissions</th><th>Status</th><th>Created</th><th>Last used</th><th></th></tr></thead>
          <tbody>
            ${rows.map((k) => {
              const revoked = /revoked/i.test(k.status || "");
              return `
              <tr data-id="${esc(k.id)}" class="${revoked ? "ak-revoked" : ""}">
                <td><div class="cr-person"><span class="dm-ico" style="width:32px;height:32px;border-radius:9px">${svg("key")}</span>
                  <span><b>${esc(k.name || "Key")}</b><small class="ak-mono">${esc(k.masked || `${k.key_prefix || "sk_live_"}••••••••`)}</small></span></div></td>
                <td><span class="sd-chip ${/test/i.test(k.environment || "") ? "mut" : "ok"}"><i></i>${esc(k.environment || "Live")}</span></td>
                <td>${(Array.isArray(k.scopes) ? k.scopes : []).slice(0, 3).map((sc) => `<span class="cr-tag">${esc(sc)}</span>`).join("")}${(k.scopes?.length || 0) > 3 ? `<span class="cr-tag">+${k.scopes.length - 3}</span>` : ""}</td>
                <td><span class="sd-chip ${revoked ? "bad" : "ok"}"><i></i>${revoked ? "Revoked" : "Active"}</span></td>
                <td class="sd-mut">${esc(s.formatRelative?.(k.createdAt) || "—")}</td>
                <td class="sd-mut">${k.lastUsed || k.last_used ? esc(s.formatRelative?.(k.lastUsed || k.last_used)) : "Never"}</td>
                <td class="cr-rowact"><button class="cr-ic ak-menu-btn" data-menu title="Actions">${svg("dots")}</button></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table></div>
      </section>`}
    </div>`;

    wire(root);
    if (addOpen) openCreate(root);
    if (onceSecret) openSecret(root);
  }

  function closeMenus() { document.querySelectorAll(".ak-menu").forEach((m) => m.remove()); }

  function wire(root) {
    const s = S();
    root.querySelectorAll('[data-act="add"]').forEach((b) => b.addEventListener("click", () => { addOpen = true; render(root); }));
    root.querySelector('[data-act="curl"]')?.addEventListener("click", (e) => {
      navigator.clipboard?.writeText(`curl -X POST https://api.senditto.com/v1/emails \\\n  -H "Authorization: Bearer YOUR_SECRET_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"from":"you@yourdomain.com","to":["user@example.com"],"subject":"Hello","html":"<p>Hi!</p>"}'`);
      e.currentTarget.innerHTML = `${svg("check")} Copied`;
    });
    root.querySelectorAll("[data-menu]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const existing = document.querySelector(".ak-menu");
        closeMenus();
        if (existing && existing.dataset.for === btn.closest("tr").dataset.id) return;
        const tr = btn.closest("tr");
        const k = s.list("keys").find((x) => String(x.id) === tr.dataset.id);
        if (!k) return;
        const revoked = /revoked/i.test(k.status || "");
        const menu = document.createElement("div");
        menu.className = "ak-menu";
        menu.dataset.for = tr.dataset.id;
        menu.innerHTML = `
          ${revoked ? "" : `<button data-m="rotate">${svg("refresh")} Rotate key…</button>
          <button data-m="revoke" class="danger">${svg("ban")} Revoke key…</button>`}
          ${revoked ? `<button data-m="remove" class="danger">${svg("trash")} Remove from list…</button>` : ""}`;
        const r = btn.getBoundingClientRect();
        menu.style.top = `${r.bottom + 6}px`;
        menu.style.left = `${Math.max(8, r.right - 190)}px`;
        document.body.appendChild(menu);
        menu.querySelectorAll("[data-m]").forEach((mi) =>
          mi.addEventListener("click", () => {
            closeMenus();
            if (mi.dataset.m === "revoke" && window.confirm(`Revoke “${k.name}”?\n\nRequests using this key stop working immediately. This cannot be undone — create or rotate to get a new key.`)) {
              s.update("keys", k.id, { status: "revoked" });
              s.logEvent?.("warn", "keys.revoke", `API key “${k.name}” revoked`, {});
            }
            if (mi.dataset.m === "remove" && window.confirm(`Remove the revoked key “${k.name}” from the list?`)) {
              s.remove("keys", k.id);
            }
            if (mi.dataset.m === "rotate" && window.confirm(`Rotate “${k.name}”?\n\nA new secret is generated and shown once. The old secret is revoked immediately.`)) {
              const env = /test/i.test(k.environment || "") ? "test" : "live";
              const secret = `sk_${env}_${rand(20)}`;
              s.update("keys", k.id, { status: "revoked", name: `${k.name} (rotated out)` });
              s.add("keys", { name: k.name, environment: k.environment || "Live", key_prefix: `sk_${env}_`, masked: maskOf(secret), scopes: k.scopes || ["email:send"], status: "active", lastUsed: null });
              s.logEvent?.("warn", "keys.rotate", `API key “${k.name}” rotated — old secret revoked`, {});
              onceSecret = { name: k.name, secret };
            }
          })
        );
      })
    );
    document.addEventListener("click", closeMenus, { once: true });
  }

  function openCreate(root) {
    const s = S();
    const el = document.createElement("div");
    el.className = "pp-modal cr-modal";
    el.innerHTML = `
      <div class="cr-modal-card" role="dialog" aria-modal="true">
        <div class="cr-modal-head"><h3>Create API key</h3><button class="cr-x" data-close>${svg("close")}</button></div>
        <div class="cr-modal-body">
          <form class="cr-form" data-form>
            <label>Name<input name="name" required autofocus placeholder="Production backend"></label>
            <label>Environment<select name="environment"><option>Live</option><option>Test</option></select></label>
            <label>Permissions</label>
            <div class="ws-chip-row" style="flex-wrap:wrap" data-scopes>
              ${SCOPES.map((sc) => `<button type="button" class="cr-chip ${sc === "email:send" ? "active" : ""}" data-scope="${sc}">${sc}</button>`).join("")}
            </div>
            <p class="cr-help">${svg("shield")} The secret is shown <b>once</b> on the next screen. Store it in your secret manager — it can never be viewed again.</p>
            <div class="cr-actions">
              <button type="button" class="sd-btn" data-close2>Cancel</button>
              <button type="submit" class="sd-btn primary">Create key</button>
            </div>
          </form>
        </div>
      </div>`;
    const close = () => { addOpen = false; el.remove(); window.SendittoRender?.(); };
    el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
    el.querySelector("[data-close]").addEventListener("click", close);
    el.querySelector("[data-close2]").addEventListener("click", close);
    el.querySelectorAll("[data-scope]").forEach((c) => c.addEventListener("click", () => c.classList.toggle("active")));
    el.querySelector("[data-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const name = String(f.get("name") || "").trim().slice(0, 60) || "API key";
      const env = /test/i.test(String(f.get("environment"))) ? "test" : "live";
      const scopes = [...el.querySelectorAll("[data-scope].active")].map((c) => c.dataset.scope);
      const secret = `sk_${env}_${rand(20)}`;
      s.add("keys", { name, environment: env === "test" ? "Test" : "Live", key_prefix: `sk_${env}_`, masked: maskOf(secret), scopes: scopes.length ? scopes : ["email:send"], status: "active", lastUsed: null });
      s.logEvent?.("success", "keys.create", `API key “${name}” created (secret shown once)`, {});
      addOpen = false;
      onceSecret = { name, secret };
      el.remove();
      window.SendittoRender?.();
    });
    document.body.appendChild(el);
  }

  function openSecret(root) {
    const { name, secret } = onceSecret;
    const el = document.createElement("div");
    el.className = "pp-modal cr-modal";
    el.innerHTML = `
      <div class="cr-modal-card" role="dialog" aria-modal="true">
        <div class="cr-modal-head"><h3>Your new secret — shown once</h3></div>
        <div class="cr-modal-body">
          <p class="cr-help">This is the only time <b>${esc(name)}</b>'s secret is visible. Copy it into your secret manager now — when this dialog closes it is gone forever.</p>
          <div class="ak-secret"><code>${esc(secret)}</code><button class="sd-btn sm primary" data-copy>${svg("copy")} Copy</button></div>
          <div class="cr-actions" style="margin-top:14px">
            <button class="sd-btn primary" data-done>I stored it safely — close</button>
          </div>
        </div>
      </div>`;
    el.querySelector("[data-copy]").addEventListener("click", (e) => {
      navigator.clipboard?.writeText(secret);
      e.currentTarget.innerHTML = `${svg("check")} Copied`;
    });
    el.querySelector("[data-done]").addEventListener("click", () => {
      onceSecret = null;
      el.remove();
      window.SendittoRender?.();
    });
    document.body.appendChild(el);
  }

  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.api = render;
})();
