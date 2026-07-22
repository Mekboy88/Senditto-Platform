/**
 * Senditto Platform Pro layer
 * Rich, production-style pages for API keys, domains, webhooks,
 * suppressions, streams, capacity — visibly more complete product surface.
 */
(() => {
  const host = () => document.getElementById("senditto-platform-root");
  const store = () => {
    const s = window.SendittoStore;
    if (!s) throw new Error("Platform store loading…");
    return s;
  };
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const icon = (n) =>
    ({
      key: "🔑",
      globe: "🌐",
      hook: "🔗",
      shield: "🛡",
      bolt: "⚡",
      mail: "✉",
      copy: "⎘",
      plus: "+",
      check: "✓",
      warn: "!",
      chart: "▤",
    })[n] || "•";

  function toast(msg) {
    document.querySelector(".pp-toast")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="pp-toast">${esc(msg)}</div>`
    );
    setTimeout(() => document.querySelector(".pp-toast")?.remove(), 2400);
  }

  function copy(text, label = "Copied") {
    const v = String(text || "");
    if (!v) return toast("Nothing to copy");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(v).then(() => toast(label)).catch(() => fallbackCopy(v, label));
    } else fallbackCopy(v, label);
  }

  function fallbackCopy(v, label) {
    const ta = document.createElement("textarea");
    ta.value = v;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast(label);
  }

  function modal(html, wide = false) {
    document.querySelector(".pro-modal")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="pro-modal pp-modal"><button class="pp-backdrop" data-pro-close></button><section class="pp-dialog ${wide ? "wide" : ""}"><button class="pp-close" data-pro-close aria-label="Close">✕</button>${html}</section></div>`
    );
    const m = document.querySelector(".pro-modal");
    m.querySelectorAll("[data-pro-close]").forEach((b) => (b.onclick = () => m.remove()));
    return m;
  }

  function mask(secret) {
    const s = String(secret || "");
    if (s.length < 12) return "••••••••";
    return `${s.slice(0, 12)}••••${s.slice(-4)}`;
  }

  function token(prefix) {
    let body = "";
    try {
      body = Array.from(crypto.getRandomValues(new Uint8Array(18)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      body = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
    }
    return `${prefix}_${body.slice(0, 36)}`;
  }

  function shell(kicker, title, copy, actionsHtml, bodyHtml) {
    return `<div class="pp-page pro-page">
      <div class="pp-head"><div><small class="pp-kicker">${esc(kicker)}</small><h1>${esc(title)}</h1><p>${esc(copy)}</p></div><div class="pp-head-actions">${actionsHtml}</div></div>
      ${bodyHtml}
    </div>`;
  }

  function stats(items) {
    return `<div class="pp-stats pro-stats">${items
      .map(
        ([label, value, hint]) =>
          `<article class="pp-card pp-stat"><div class="pp-stat-top"><span>${esc(label)}</span></div><b>${esc(value)}</b><small>${esc(hint || "Workspace")}</small></article>`
      )
      .join("")}</div>`;
  }

  // ---------- API KEYS (full product page) ----------
  function apiKeysPage() {
    const h = host();
    if (!h) return;
    const keys = store().list("keys");
    const active = keys.filter((k) => /active/i.test(k.status || "")).length;
    h.dataset.proPage = "api";
    h.innerHTML = shell(
      "DEVELOPER ACCESS",
      "API keys",
      "Create scoped credentials for production traffic. Full secrets are shown once on create so you can copy them into your apps.",
      `<button type="button" class="pp-btn primary" data-pro-create-key>${icon("plus")} Create API key</button>`,
      `${stats([
        ["Active keys", String(active), "Ready to authenticate"],
        ["Total keys", String(keys.length), "This workspace"],
        ["Default rate limit", "100 req/s", "Configurable per key"],
        ["Auth scheme", "Bearer", "Authorization header"],
      ])}
      <section class="pp-card pro-guide">
        <div><b>How production apps authenticate</b><p>Send <code>Authorization: Bearer sk_live_…</code> on every API request. Rotate keys regularly. Never embed live keys in public frontends.</p></div>
        <button type="button" class="pp-btn" data-pro-show-curl>Show curl example</button>
      </section>
      <section class="pp-card pro-table-wrap">
        <div class="pro-table-head"><span>Key</span><span>Environment</span><span>Permissions</span><span>Status</span><span>Created</span><span></span></div>
        ${
          keys.length
            ? keys
                .map(
                  (k) => `<div class="pro-table-row">
            <div><b>${esc(k.name)}</b><small class="mono">${esc(k.tokenMasked || mask(k.secret))}</small></div>
            <span>${esc(k.env || k.count || "—")}</span>
            <span>${esc((k.permissions || ["email:send"]).join(", "))}</span>
            <span class="pp-badge ${/active/i.test(k.status || "") ? "good" : "warn"}">${esc(k.status || "—")}</span>
            <small>${esc(store().formatRelative(k.createdAt))}</small>
            <div class="pro-row-actions">
              <button type="button" class="pp-btn small" data-pro-copy-key="${esc(k.id)}">Copy secret</button>
              <button type="button" class="pp-btn small" data-pro-open-key="${esc(k.id)}">Open</button>
              <button type="button" class="pp-btn small danger" data-pro-revoke-key="${esc(k.id)}">Revoke</button>
            </div>
          </div>`
                )
                .join("")
            : `<div class="pp-empty"><h3>No API keys yet</h3><p>Create your first key to start integrating Senditto into your product.</p><button type="button" class="pp-btn primary" data-pro-create-key>Create API key</button></div>`
        }
      </section>`
    );

    h.querySelectorAll("[data-pro-create-key]").forEach((b) => (b.onclick = createApiKeyWizard));
    h.querySelector("[data-pro-show-curl]")?.addEventListener("click", () => {
      const sample = keys.find((k) => k.secret)?.secret || "sk_live_YOUR_KEY";
      modal(
        `<h2>Send a message via API</h2><p>Copy this example into your terminal or backend.</p><pre class="pp-code">curl -X POST https://api.senditto.com/v1/emails \\
  -H "Authorization: Bearer ${esc(sample)}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "Acme &lt;hello@yourdomain.com&gt;",
    "to": ["user@example.com"],
    "subject": "Hello from Senditto",
    "text": "Your infrastructure is ready."
  }'</pre><div class="pp-modal-actions"><button class="pp-btn" data-copy-curl>Copy curl</button><button class="pp-btn primary" data-pro-close>Done</button></div>`
      ).querySelector("[data-copy-curl]")?.addEventListener("click", () => {
        copy(
          `curl -X POST https://api.senditto.com/v1/emails -H "Authorization: Bearer ${sample}" -H "Content-Type: application/json" -d '{"from":"Acme <hello@yourdomain.com>","to":["user@example.com"],"subject":"Hello from Senditto","text":"Your infrastructure is ready."}'`,
          "curl copied"
        );
      });
    });
    h.querySelectorAll("[data-pro-copy-key]").forEach((b) => {
      b.onclick = () => {
        const k = keys.find((x) => x.id === b.dataset.proCopyKey);
        if (!k?.secret) return toast("Secret unavailable");
        copy(k.secret, "API key copied");
      };
    });
    h.querySelectorAll("[data-pro-open-key]").forEach((b) => {
      b.onclick = () => openApiKey(keys.find((x) => x.id === b.dataset.proOpenKey));
    });
    h.querySelectorAll("[data-pro-revoke-key]").forEach((b) => {
      b.onclick = () => {
        store().update("keys", b.dataset.proRevokeKey, { status: "Revoked" });
        store().logEvent("warning", "api_key.revoke", "API key revoked");
        toast("Key revoked");
        apiKeysPage();
      };
    });
  }

  function createApiKeyWizard() {
    const m = modal(
      `<div class="pp-modal-icon">${icon("key")}</div>
      <h2>Create API key</h2>
      <p>Configure permissions for high-volume sending. The full secret is shown once so you can copy it.</p>
      <form class="pp-form pp-form-stack" data-pro-key-form>
        <label class="full"><span class="pp-label-text">Key name</span><input class="pp-input" name="name" placeholder="Production backend" required></label>
        <label class="full"><span class="pp-label-text">Environment</span><select class="pp-input" name="env"><option>Production</option><option>Staging</option><option>Development</option></select></label>
        <label class="full"><span class="pp-label-text">Permissions</span>
          <div class="pro-checks">
            <label class="pro-check"><input type="checkbox" name="perm" value="email:send" checked> email:send</label>
            <label class="pro-check"><input type="checkbox" name="perm" value="email:batch" checked> email:batch</label>
            <label class="pro-check"><input type="checkbox" name="perm" value="domains:read" checked> domains:read</label>
            <label class="pro-check"><input type="checkbox" name="perm" value="webhooks:manage"> webhooks:manage</label>
            <label class="pro-check"><input type="checkbox" name="perm" value="analytics:read"> analytics:read</label>
          </div>
        </label>
        <label class="full"><span class="pp-label-text">Rate limit (requests / second)</span><input class="pp-input" name="rateLimit" type="number" min="1" max="10000" value="100" required></label>
      </form>
      <div class="pp-modal-actions"><button class="pp-btn" data-pro-close>Cancel</button><button class="pp-btn primary" data-pro-key-save>Create key</button></div>`,
      true
    );
    m.querySelector("[data-pro-key-save]").onclick = () => {
      const form = m.querySelector("[data-pro-key-form]");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const env = String(fd.get("env") || "Production");
      const prefix = env === "Production" ? "sk_live" : env === "Staging" ? "sk_test" : "sk_dev";
      const secret = token(prefix);
      const permissions = [...form.querySelectorAll('input[name="perm"]:checked')].map((x) => x.value);
      const rec = store().add("keys", {
        name: String(fd.get("name")),
        env,
        count: env,
        scope: permissions.join(", ") || "email:send",
        detail: permissions.join(", ") || "email:send",
        permissions: permissions.length ? permissions : ["email:send"],
        rateLimit: Number(fd.get("rateLimit") || 100),
        secret,
        tokenMasked: mask(secret),
        status: "Active",
      });
      store().logEvent("success", "api_key.create", `Created API key ${rec.name}`, { id: rec.id });
      m.remove();
      apiKeysPage();
      showSecretCreated({
        title: "API key created — copy it now",
        subtitle: `“${rec.name}” · ${env} · ${permissions.join(", ") || "email:send"}`,
        secret,
        extras: [
          ["Rate limit", `${rec.rateLimit} req/s`],
          ["Header", "Authorization: Bearer <key>"],
          ["Key ID", rec.id],
        ],
      });
    };
  }

  function showSecretCreated({ title, subtitle, secret, extras = [] }) {
    const m = modal(
      `<div class="pp-modal-icon">${icon("check")}</div>
      <h2>${esc(title)}</h2>
      <p>${esc(subtitle)}</p>
      <div class="pro-secret-card">
        <small>SECRET (copy and store securely)</small>
        <code data-pro-secret>${esc(secret)}</code>
        <div class="pro-secret-actions">
          <button type="button" class="pp-btn primary" data-pro-copy-secret>${icon("copy")} Copy secret</button>
          <button type="button" class="pp-btn" data-pro-copy-bearer>Copy Bearer header</button>
        </div>
      </div>
      <div class="pp-detail">${extras
        .map(([a, b]) => `<div class="pp-detail-row"><span>${esc(a)}</span><b>${esc(b)}</b></div>`)
        .join("")}</div>
      <p class="pp-secret-note">This control-plane stores the secret locally until the real API/database is connected. In production, secrets are shown only once server-side.</p>
      <div class="pp-modal-actions"><button class="pp-btn primary" data-pro-close>I have copied the secret</button></div>`,
      true
    );
    m.querySelector("[data-pro-copy-secret]")?.addEventListener("click", () => copy(secret, "Secret copied"));
    m.querySelector("[data-pro-copy-bearer]")?.addEventListener("click", () =>
      copy(`Authorization: Bearer ${secret}`, "Bearer header copied")
    );
  }

  function openApiKey(k) {
    if (!k) return;
    modal(
      `<h2>${esc(k.name)}</h2>
      <p>${esc(k.env || "")} · ${esc((k.permissions || []).join(", ") || k.scope || "")}</p>
      <div class="pro-secret-card">
        <small>FULL SECRET</small>
        <code>${esc(k.secret || "—")}</code>
        <div class="pro-secret-actions">
          <button type="button" class="pp-btn primary" data-copy-full>Copy secret</button>
        </div>
      </div>
      <div class="pp-detail">
        <div class="pp-detail-row"><span>Masked</span><b class="mono">${esc(k.tokenMasked || mask(k.secret))}</b></div>
        <div class="pp-detail-row"><span>Status</span><b>${esc(k.status)}</b></div>
        <div class="pp-detail-row"><span>Rate limit</span><b>${esc(k.rateLimit || 100)} req/s</b></div>
        <div class="pp-detail-row"><span>Created</span><b>${esc(store().formatRelative(k.createdAt))}</b></div>
      </div>
      <div class="pp-modal-actions"><button class="pp-btn primary" data-pro-close>Done</button></div>`,
      true
    ).querySelector("[data-copy-full]")?.addEventListener("click", () => copy(k.secret, "Secret copied"));
  }

  // ---------- DOMAINS ----------
  function domainsPage() {
    const h = host();
    if (!h) return;
    const domains = store().list("domains");
    const verified = domains.filter((d) => /verified/i.test(d.status || "")).length;
    h.dataset.proPage = "domains";
    h.innerHTML = shell(
      "DELIVERABILITY",
      "Domains",
      "Authenticate sending domains with SPF, DKIM and DMARC so mail reaches the inbox at scale.",
      `<button type="button" class="pp-btn primary" data-pro-add-domain>${icon("plus")} Add domain</button>`,
      `${stats([
        ["Domains", String(domains.length), "Configured"],
        ["Verified", String(verified), "Ready to send"],
        ["Pending", String(domains.length - verified), "Needs DNS"],
        ["Alignment", verified ? "SPF+DKIM" : "Not ready", "Production baseline"],
      ])}
      <section class="pp-card pro-table-wrap">
        <div class="pro-table-head"><span>Domain</span><span>Purpose</span><span>Status</span><span>Environment</span><span></span></div>
        ${
          domains.length
            ? domains
                .map(
                  (d) => `<div class="pro-table-row">
            <div><b>${esc(d.name)}</b><small>Sending identity</small></div>
            <span>${esc(d.detail || "—")}</span>
            <span class="pp-badge ${/verified/i.test(d.status || "") ? "good" : "warn"}">${esc(d.status || "Pending")}</span>
            <span>${esc(d.env || d.count || "—")}</span>
            <div class="pro-row-actions">
              <button type="button" class="pp-btn small" data-pro-dns="${esc(d.id)}">DNS records</button>
              <button type="button" class="pp-btn small" data-pro-verify="${esc(d.id)}">Mark verified</button>
              <button type="button" class="pp-btn small danger" data-pro-del-domain="${esc(d.id)}">Remove</button>
            </div>
          </div>`
                )
                .join("")
            : `<div class="pp-empty"><h3>No sending domains</h3><p>Add a domain, publish DNS, then verify before production traffic.</p><button type="button" class="pp-btn primary" data-pro-add-domain>Add domain</button></div>`
        }
      </section>`
    );
    h.querySelectorAll("[data-pro-add-domain]").forEach((b) => (b.onclick = addDomainWizard));
    h.querySelectorAll("[data-pro-dns]").forEach((b) => {
      b.onclick = () => showDns(domains.find((d) => d.id === b.dataset.proDns));
    });
    h.querySelectorAll("[data-pro-verify]").forEach((b) => {
      b.onclick = () => {
        store().update("domains", b.dataset.proVerify, { status: "Verified" });
        store().logEvent("success", "domain.verify", "Domain marked verified");
        toast("Domain verified");
        domainsPage();
      };
    });
    h.querySelectorAll("[data-pro-del-domain]").forEach((b) => {
      b.onclick = () => {
        store().remove("domains", b.dataset.proDelDomain);
        toast("Domain removed");
        domainsPage();
      };
    });
  }

  function addDomainWizard() {
    const m = modal(
      `<h2>Add sending domain</h2>
      <p>You will receive DNS records to publish at your DNS provider.</p>
      <form class="pp-form pp-form-stack" data-domain-form>
        <label class="full"><span class="pp-label-text">Domain</span><input class="pp-input" name="name" placeholder="mail.yourcompany.com" required></label>
        <label class="full"><span class="pp-label-text">Purpose</span><input class="pp-input" name="detail" placeholder="Transactional + product email" required></label>
        <label class="full"><span class="pp-label-text">Environment</span><select class="pp-input" name="env"><option>Production</option><option>Staging</option></select></label>
      </form>
      <div class="pp-modal-actions"><button class="pp-btn" data-pro-close>Cancel</button><button class="pp-btn primary" data-domain-save>Add domain</button></div>`
    );
    m.querySelector("[data-domain-save]").onclick = () => {
      const form = m.querySelector("[data-domain-form]");
      if (!form.reportValidity()) return;
      const fd = Object.fromEntries(new FormData(form));
      const rec = store().add("domains", {
        name: fd.name,
        detail: fd.detail,
        env: fd.env,
        count: fd.env,
        status: "Pending",
      });
      store().logEvent("info", "domain.create", `Domain ${rec.name} added`);
      m.remove();
      domainsPage();
      showDns(rec);
    };
  }

  function showDns(d) {
    if (!d) return;
    const domain = d.name;
    const rows = [
      ["TXT", "@", `v=spf1 include:_spf.senditto.com ~all`],
      ["CNAME", `s1._domainkey`, `s1.dkim.senditto.com`],
      ["CNAME", `s2._domainkey`, `s2.dkim.senditto.com`],
      ["TXT", `_dmarc`, `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`],
    ];
    const m = modal(
      `<h2>DNS for ${esc(domain)}</h2>
      <p>Publish these records, wait for propagation, then mark verified.</p>
      <div class="pp-detail pp-dns-list">${rows
        .map(
          ([type, hostName, value]) =>
            `<div class="pp-detail-row pp-dns-row"><span><b>${esc(type)}</b><small>${esc(hostName)}.${esc(domain)}</small></span><code>${esc(value)}</code><button type="button" class="pp-btn small" data-copy-val="${esc(value)}">Copy</button></div>`
        )
        .join("")}</div>
      <div class="pp-modal-actions"><button class="pp-btn" data-pro-close>Close</button><button class="pp-btn primary" data-mark-verified>Mark verified</button></div>`,
      true
    );
    m.querySelectorAll("[data-copy-val]").forEach((b) => {
      b.onclick = () => copy(b.dataset.copyVal, "DNS value copied");
    });
    m.querySelector("[data-mark-verified]")?.addEventListener("click", () => {
      store().update("domains", d.id, { status: "Verified" });
      m.remove();
      toast("Domain verified");
      domainsPage();
    });
  }

  // ---------- WEBHOOKS ----------
  function webhooksPage() {
    const h = host();
    if (!h) return;
    const hooks = store().list("webhooks");
    h.dataset.proPage = "webhooks";
    h.innerHTML = shell(
      "EVENT DELIVERY",
      "Webhooks",
      "Receive signed delivery, bounce, open and click events in your systems — required for large-scale observability.",
      `<button type="button" class="pp-btn primary" data-pro-add-hook>${icon("plus")} Add endpoint</button>`,
      `${stats([
        ["Endpoints", String(hooks.length), "Configured"],
        ["Healthy", String(hooks.filter((x) => /healthy|active/i.test(x.status || "")).length), "Live"],
        ["Events", "signed", "HMAC ready"],
        ["Retries", "auto", "When workers connect"],
      ])}
      <section class="pp-card pro-table-wrap">
        ${
          hooks.length
            ? `<div class="pro-table-head"><span>Endpoint</span><span>URL</span><span>Status</span><span>Env</span><span></span></div>` +
              hooks
                .map(
                  (w) => `<div class="pro-table-row">
              <div><b>${esc(w.name)}</b><small class="mono">${esc(mask(w.signingSecret))}</small></div>
              <span class="mono truncate">${esc(w.detail || "")}</span>
              <span class="pp-badge ${/healthy|active/i.test(w.status || "") ? "good" : "warn"}">${esc(w.status || "—")}</span>
              <span>${esc(w.env || w.count || "—")}</span>
              <div class="pro-row-actions">
                <button type="button" class="pp-btn small" data-pro-copy-whsec="${esc(w.id)}">Copy secret</button>
                <button type="button" class="pp-btn small" data-pro-test-hook="${esc(w.id)}">Send test</button>
                <button type="button" class="pp-btn small danger" data-pro-del-hook="${esc(w.id)}">Delete</button>
              </div>
            </div>`
                )
                .join("")
            : `<div class="pp-empty"><h3>No webhook endpoints</h3><p>Add an HTTPS endpoint to receive delivery events at scale.</p><button type="button" class="pp-btn primary" data-pro-add-hook>Add endpoint</button></div>`
        }
      </section>`
    );
    h.querySelectorAll("[data-pro-add-hook]").forEach((b) => (b.onclick = addWebhookWizard));
    h.querySelectorAll("[data-pro-copy-whsec]").forEach((b) => {
      b.onclick = () => {
        const w = hooks.find((x) => x.id === b.dataset.proCopyWhsec);
        copy(w?.signingSecret || "", "Signing secret copied");
      };
    });
    h.querySelectorAll("[data-pro-test-hook]").forEach((b) => {
      b.onclick = () => {
        const w = hooks.find((x) => x.id === b.dataset.proTestHook);
        store().logEvent("success", "webhook.test", `Test delivered to ${w?.name}`, { id: w?.id });
        toast("Test event logged");
      };
    });
    h.querySelectorAll("[data-pro-del-hook]").forEach((b) => {
      b.onclick = () => {
        store().remove("webhooks", b.dataset.proDelHook);
        toast("Endpoint deleted");
        webhooksPage();
      };
    });
  }

  function addWebhookWizard() {
    const m = modal(
      `<h2>Add webhook endpoint</h2>
      <form class="pp-form pp-form-stack" data-hook-form>
        <label class="full"><span class="pp-label-text">Name</span><input class="pp-input" name="name" placeholder="Production events" required></label>
        <label class="full"><span class="pp-label-text">HTTPS URL</span><input class="pp-input" type="url" name="detail" placeholder="https://api.yourapp.com/senditto/events" required></label>
        <label class="full"><span class="pp-label-text">Events</span>
          <div class="pro-checks">
            <label class="pro-check"><input type="checkbox" checked disabled> email.delivered</label>
            <label class="pro-check"><input type="checkbox" checked disabled> email.bounced</label>
            <label class="pro-check"><input type="checkbox" checked disabled> email.opened</label>
            <label class="pro-check"><input type="checkbox" checked disabled> email.clicked</label>
          </div>
        </label>
        <label class="full"><span class="pp-label-text">Environment</span><select class="pp-input" name="env"><option>Production</option><option>Staging</option></select></label>
      </form>
      <div class="pp-modal-actions"><button class="pp-btn" data-pro-close>Cancel</button><button class="pp-btn primary" data-hook-save>Create endpoint</button></div>`
    );
    m.querySelector("[data-hook-save]").onclick = () => {
      const form = m.querySelector("[data-hook-form]");
      if (!form.reportValidity()) return;
      const fd = Object.fromEntries(new FormData(form));
      const signingSecret = token("whsec");
      const rec = store().add("webhooks", {
        name: fd.name,
        detail: fd.detail,
        env: fd.env,
        count: fd.env,
        status: "Healthy",
        signingSecret,
      });
      store().logEvent("success", "webhook.create", `Webhook ${rec.name} created`);
      m.remove();
      webhooksPage();
      showSecretCreated({
        title: "Webhook created — copy signing secret",
        subtitle: `${rec.name} · ${rec.detail}`,
        secret: signingSecret,
        extras: [
          ["URL", rec.detail],
          ["Signature header", "Senditto-Signature"],
          ["ID", rec.id],
        ],
      });
    };
  }

  // ---------- SUPPRESSIONS ----------
  function suppressionsPage() {
    const v2 = window.SendittoUI && window.SendittoUI["suppressions"];
    if (v2 && v2 !== suppressionsPage) { const r = document.getElementById("senditto-platform-root"); if (r) return v2(r); }
    const h = host();
    if (!h) return;
    const list = store().list("suppressions");
    h.dataset.proPage = "suppressions";
    h.innerHTML = shell(
      "REPUTATION PROTECTION",
      "Suppressions",
      "Hard bounces, complaints and manual blocks. Critical for high-volume sending reputation.",
      `<button type="button" class="pp-btn primary" data-pro-add-sup>${icon("plus")} Add address</button>`,
      `${stats([
        ["Suppressed", String(list.length), "Will not receive mail"],
        ["Bounces", String(list.filter((x) => x.reason === "Hard bounce").length), "Auto path later"],
        ["Complaints", String(list.filter((x) => x.reason === "Complaint").length), "Spam reports"],
        ["Manual", String(list.filter((x) => x.reason === "Manual").length), "Operator blocks"],
      ])}
      <section class="pp-card pro-table-wrap">
        ${
          list.length
            ? `<div class="pro-table-head"><span>Email</span><span>Reason</span><span>Source</span><span>Added</span><span></span></div>` +
              list
                .map(
                  (s) => `<div class="pro-table-row">
              <div><b>${esc(s.email || s.name)}</b></div>
              <span>${esc(s.reason || "—")}</span>
              <span>${esc(s.source || "Manual")}</span>
              <small>${esc(store().formatRelative(s.createdAt))}</small>
              <button type="button" class="pp-btn small danger" data-pro-del-sup="${esc(s.id)}">Remove</button>
            </div>`
                )
                .join("")
            : `<div class="pp-empty"><h3>Suppression list is empty</h3><p>When real sending is connected, bounces and complaints land here automatically.</p><button type="button" class="pp-btn primary" data-pro-add-sup>Add address</button></div>`
        }
      </section>`
    );
    h.querySelectorAll("[data-pro-add-sup]").forEach((b) => {
      b.onclick = () => {
        const m = modal(
          `<h2>Add suppression</h2>
          <form class="pp-form pp-form-stack" data-sup-form>
            <label class="full"><span class="pp-label-text">Email</span><input class="pp-input" type="email" name="email" required></label>
            <label class="full"><span class="pp-label-text">Reason</span><select class="pp-input" name="reason"><option>Manual</option><option>Hard bounce</option><option>Complaint</option><option>Unsubscribe</option></select></label>
          </form>
          <div class="pp-modal-actions"><button class="pp-btn" data-pro-close>Cancel</button><button class="pp-btn primary" data-sup-save>Add</button></div>`
        );
        m.querySelector("[data-sup-save]").onclick = () => {
          const form = m.querySelector("[data-sup-form]");
          if (!form.reportValidity()) return;
          const fd = Object.fromEntries(new FormData(form));
          store().add("suppressions", {
            name: fd.email,
            email: fd.email,
            reason: fd.reason,
            source: "Manual",
            status: "Active",
          });
          m.remove();
          toast("Address suppressed");
          suppressionsPage();
        };
      };
    });
    h.querySelectorAll("[data-pro-del-sup]").forEach((b) => {
      b.onclick = () => {
        store().remove("suppressions", b.dataset.proDelSup);
        suppressionsPage();
      };
    });
  }

  // ---------- STREAMS + CAPACITY ----------
  function streamsPage() {
    const h = host();
    if (!h) return;
    const streams = store().list("streams");
    const cap = store().get().capacity || {};
    h.dataset.proPage = "streams";
    h.innerHTML = shell(
      "TRAFFIC CONTROL",
      "Streams & capacity",
      "Separate transactional, marketing and automation traffic — required to protect reputation while scaling to huge volumes.",
      `<button type="button" class="pp-btn" data-pro-edit-capacity>Edit capacity</button>`,
      `${stats([
        ["Monthly quota", Number(cap.monthlyQuota || 0).toLocaleString(), "Plan allowance"],
        ["Burst / second", String(cap.burstPerSecond || 0), "Peak throughput"],
        ["Concurrent sends", String(cap.concurrentSends || 0), "Worker pool size"],
        ["Regions", (cap.regions || []).join(", ") || "—", "Routing footprint"],
      ])}
      <section class="pp-card pro-table-wrap">
        <div class="pro-table-head"><span>Stream</span><span>Type</span><span>Priority</span><span>Daily cap</span><span>Status</span></div>
        ${streams
          .map(
            (s) => `<div class="pro-table-row">
            <div><b>${esc(s.name)}</b></div>
            <span>${esc(s.type)}</span>
            <span>${esc(s.priority)}</span>
            <span>${s.dailyCap ? Number(s.dailyCap).toLocaleString() : "Unlimited"}</span>
            <span class="pp-badge good">${esc(s.status || "Ready")}</span>
          </div>`
          )
          .join("")}
      </section>
      <section class="pp-card pro-guide">
        <div>
          <b>Scale model (control plane)</b>
          <p>Quota, burst, concurrency and region routing will bind to the send workers and queue system. Dedicated IPs and warmup are ${cap.dedicatedIp ? "enabled" : "disabled"} · warmup ${cap.warmupEnabled ? "on" : "off"}.</p>
        </div>
      </section>`
    );
    h.querySelector("[data-pro-edit-capacity]")?.addEventListener("click", () => {
      const c = store().get().capacity || {};
      const m = modal(
        `<h2>Edit capacity</h2>
        <form class="pp-form" data-cap-form>
          <label><span class="pp-label-text">Monthly quota</span><input class="pp-input" name="monthlyQuota" type="number" value="${esc(c.monthlyQuota || 1000000)}"></label>
          <label><span class="pp-label-text">Burst / second</span><input class="pp-input" name="burstPerSecond" type="number" value="${esc(c.burstPerSecond || 100)}"></label>
          <label><span class="pp-label-text">Concurrent sends</span><input class="pp-input" name="concurrentSends" type="number" value="${esc(c.concurrentSends || 50)}"></label>
          <label><span class="pp-label-text">Regions (comma-separated)</span><input class="pp-input" name="regions" value="${esc((c.regions || []).join(", "))}"></label>
        </form>
        <div class="pp-modal-actions"><button class="pp-btn" data-pro-close>Cancel</button><button class="pp-btn primary" data-cap-save>Save</button></div>`
      );
      m.querySelector("[data-cap-save]").onclick = () => {
        const fd = Object.fromEntries(new FormData(m.querySelector("[data-cap-form]")));
        const next = {
          ...c,
          monthlyQuota: Number(fd.monthlyQuota || 0),
          burstPerSecond: Number(fd.burstPerSecond || 0),
          concurrentSends: Number(fd.concurrentSends || 0),
          regions: String(fd.regions || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        };
        const st = store().get();
        st.capacity = next;
        store().persist();
        store().emit("capacity:update", next);
        m.remove();
        toast("Capacity updated");
        streamsPage();
      };
    });
  }

  // ---------- NAV INJECTION ----------
  function injectNav() {
    const nav = document.querySelector(".dashboard-sidebar nav");
    if (!nav || nav.dataset.proNav === "1") return;
    nav.dataset.proNav = "1";
    const group = document.createElement("div");
    group.className = "nav-group";
    group.innerHTML = `<small>INFRASTRUCTURE</small>
      <button type="button" data-pro-nav="suppressions"><span>Suppressions</span></button>
      <button type="button" data-pro-nav="streams"><span>Streams & capacity</span></button>`;
    nav.appendChild(group);
    group.querySelectorAll("[data-pro-nav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const route = btn.dataset.proNav;
        document.querySelectorAll(".dashboard-sidebar nav button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (window.SendittoNavigate) {
          // set current without requiring SPA button
          window.SendittoUI && window.SendittoRender;
        }
        const root = host();
        if (!root) return;
        root.dataset.route = route;
        if (route === "suppressions") suppressionsPage();
        if (route === "streams") streamsPage();
      });
    });
  }

  // Register / override routes (pro pages win)
  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.api = apiKeysPage;
  window.SendittoUI.domains = domainsPage;
  window.SendittoUI.webhooks = webhooksPage;
  window.SendittoUI.suppressions = suppressionsPage;
  window.SendittoUI.streams = streamsPage;

  // Extend router labels if present
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("button,a");
      if (!btn) return;
      const text = (btn.querySelector("span")?.textContent || btn.textContent || "").trim();
      if (text === "Suppressions") {
        e.preventDefault();
        setTimeout(suppressionsPage, 20);
      }
      if (text === "Streams & capacity") {
        e.preventDefault();
        setTimeout(streamsPage, 20);
      }
    },
    true
  );

  const boot = () => injectNav();
  [100, 400, 1000, 2000].forEach((ms) => setTimeout(boot, ms));
  new MutationObserver(boot).observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });
})();
