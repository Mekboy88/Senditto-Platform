/**
 * Senditto Enterprise product surface
 * Full control-plane pages for a high-volume email platform:
 * OTP, senders, SMTP, batches, IP pools, inbound, settings, help,
 * team, billing, tracking, integrations, audit — not thin stubs.
 */
(() => {
  const host = () => document.getElementById("senditto-platform-root");
  const S = () => {
    const s = window.SendittoStore;
    if (!s) throw new Error("Store loading…");
    return s;
  };
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function toast(t) {
    document.querySelector(".pp-toast")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div class="pp-toast">${esc(t)}</div>`);
    setTimeout(() => document.querySelector(".pp-toast")?.remove(), 2400);
  }
  function copy(v, msg = "Copied") {
    const t = String(v || "");
    if (!t) return toast("Nothing to copy");
    navigator.clipboard?.writeText(t).then(() => toast(msg)).catch(() => {
      const a = document.createElement("textarea");
      a.value = t;
      document.body.appendChild(a);
      a.select();
      document.execCommand("copy");
      a.remove();
      toast(msg);
    });
  }
  function modal(html, wide = false) {
    document.querySelector(".ent-modal")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="ent-modal pp-modal"><button class="pp-backdrop" data-x></button><section class="pp-dialog ${wide ? "wide" : ""}"><button class="pp-close" data-x>✕</button>${html}</section></div>`
    );
    const m = document.querySelector(".ent-modal");
    m.querySelectorAll("[data-x]").forEach((b) => (b.onclick = () => m.remove()));
    return m;
  }
  function token(prefix) {
    let body = "";
    try {
      body = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      body = Date.now().toString(16) + Math.random().toString(16).slice(2);
    }
    return `${prefix}_${body.slice(0, 32)}`;
  }
  function stats(rows) {
    return `<div class="pp-stats pro-stats">${rows
      .map(([a, b, c]) => `<article class="pp-card pp-stat"><div class="pp-stat-top"><span>${esc(a)}</span></div><b>${esc(b)}</b><small>${esc(c || "")}</small></article>`)
      .join("")}</div>`;
  }
  function page(kicker, title, lead, actions, body) {
    return `<div class="pp-page pro-page ent-page">
      <div class="pp-head"><div><small class="pp-kicker">${esc(kicker)}</small><h1>${esc(title)}</h1><p>${esc(lead)}</p></div><div class="pp-head-actions">${actions}</div></div>
      ${body}
    </div>`;
  }
  function empty(title, cta, action) {
    return `<div class="pp-empty"><h3>${esc(title)}</h3><p>${esc(cta)}</p>${action || ""}</div>`;
  }

  // ========== INBOUND (full product) ==========
  function inboundPage() {
    const h = host();
    if (!h) return;
    const routes = S().list("inbound");
    const received = S().list("messages").filter((m) => /inbound/i.test(m.stream || m.status || "")).length;
    h.innerHTML = page(
      "RECEIVING",
      "Inbound email",
      "Receive, parse and route customer replies, support mail and parsed payloads into webhooks or your product API — at volume.",
      `<button class="pp-btn" data-ent-mx>MX setup guide</button><button class="pp-btn primary" data-ent-add-inbound>+ Add inbound route</button>`,
      `${stats([
        ["Routes", String(routes.length), "Configured addresses"],
        ["Active", String(routes.filter((r) => /active/i.test(r.status || "")).length), "Receiving"],
        ["Parsed events", String(received), "Local activity"],
        ["Parse modes", "MIME · JSON", "Attachments supported later"],
      ])}
      <div class="ent-grid-3">
        <article class="pp-card ent-feature"><h3>Support routing</h3><p>Map support@yourdomain.com to a ticket webhook or CRM.</p></article>
        <article class="pp-card ent-feature"><h3>Reply threading</h3><p>Capture replies to transactional mail and attach them to the original message id.</p></article>
        <article class="pp-card ent-feature"><h3>Structured parse</h3><p>Extract headers, body text/HTML, attachments metadata, and envelope recipients.</p></article>
      </div>
      <section class="pp-card pro-table-wrap" style="margin-top:16px">
        <div class="pro-table-head"><span>Address</span><span>Destination</span><span>Parse</span><span>Status</span><span></span></div>
        ${
          routes.length
            ? routes
                .map(
                  (r) => `<div class="pro-table-row">
            <div><b>${esc(r.name)}</b><small>${esc(r.env || r.count || "Production")}</small></div>
            <span>${esc(r.detail || "—")}</span>
            <span>${esc(r.parseMode || "MIME + text")}</span>
            <span class="pp-badge ${/active/i.test(r.status || "") ? "good" : "blue"}">${esc(r.status || "Draft")}</span>
            <div class="pro-row-actions">
              <button class="pp-btn small" data-ent-inbound-open="${esc(r.id)}">Configure</button>
              <button class="pp-btn small danger" data-ent-inbound-del="${esc(r.id)}">Delete</button>
            </div>
          </div>`
                )
                .join("")
            : empty("No inbound routes", "Add an address to start receiving and parsing email into your product.", `<button class="pp-btn primary" data-ent-add-inbound>+ Add inbound route</button>`)
        }
      </section>
      <section class="pp-card ent-panel" style="margin-top:16px">
        <h3>Receiving pipeline (when backend is connected)</h3>
        <ol class="ent-steps">
          <li>MX points to Senditto inbound edge</li>
          <li>Message accepted, virus/attachment policy applied</li>
          <li>MIME parsed → normalized event</li>
          <li>Route rules match address / domain / headers</li>
          <li>Webhook or store + optional auto-reply</li>
        </ol>
      </section>`
    );
    h.querySelectorAll("[data-ent-add-inbound]").forEach((b) => (b.onclick = addInbound));
    h.querySelector("[data-ent-mx]")?.addEventListener("click", () =>
      modal(
        `<h2>MX setup</h2><p>Point your domain’s MX to Senditto when inbound edge is provisioned.</p><div class="pp-detail"><div class="pp-detail-row"><span>Priority 10</span><b>inbound.senditto.com</b></div><div class="pp-detail-row"><span>SPF</span><b>include:_spf.senditto.com</b></div></div><div class="pp-modal-actions"><button class="pp-btn primary" data-x>Done</button></div>`
      )
    );
    h.querySelectorAll("[data-ent-inbound-del]").forEach(
      (b) =>
        (b.onclick = () => {
          S().remove("inbound", b.dataset.entInboundDel);
          inboundPage();
        })
    );
    h.querySelectorAll("[data-ent-inbound-open]").forEach((b) => {
      b.onclick = () => {
        const r = S().list("inbound").find((x) => x.id === b.dataset.entInboundOpen);
        if (!r) return;
        modal(
          `<h2>${esc(r.name)}</h2><div class="pp-detail">
          <div class="pp-detail-row"><span>Destination</span><b>${esc(r.detail)}</b></div>
          <div class="pp-detail-row"><span>Parse mode</span><b>${esc(r.parseMode || "MIME + text")}</b></div>
          <div class="pp-detail-row"><span>Store raw</span><b>${r.storeRaw ? "Yes" : "No"}</b></div>
          <div class="pp-detail-row"><span>Status</span><b>${esc(r.status)}</b></div>
        </div><div class="pp-modal-actions"><button class="pp-btn primary" data-x>Close</button></div>`
        );
      };
    });
  }
  function addInbound() {
    const m = modal(
      `<h2>Add inbound route</h2>
      <form class="pp-form pp-form-stack" data-f>
        <label class="full"><span class="pp-label-text">Inbound address</span><input class="pp-input" name="name" placeholder="support@inbound.yourdomain.com" required></label>
        <label class="full"><span class="pp-label-text">Destination webhook URL</span><input class="pp-input" name="detail" type="url" placeholder="https://api.yourapp.com/inbound" required></label>
        <label class="full"><span class="pp-label-text">Parse mode</span><select class="pp-input" name="parseMode"><option>MIME + text</option><option>Text only</option><option>JSON fields</option><option>Raw store</option></select></label>
        <label class="full"><span class="pp-label-text">Status</span><select class="pp-input" name="status"><option>Active</option><option>Draft</option><option>Paused</option></select></label>
      </form>
      <div class="pp-modal-actions"><button class="pp-btn" data-x>Cancel</button><button class="pp-btn primary" data-save>Create route</button></div>`
    );
    m.querySelector("[data-save]").onclick = () => {
      const f = m.querySelector("[data-f]");
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      S().add("inbound", { ...d, storeRaw: d.parseMode === "Raw store", env: "Production", count: "Production" });
      m.remove();
      toast("Inbound route created");
      inboundPage();
    };
  }

  // ========== OTP / VERIFICATION ==========
  function otpPage() {
    const h = host();
    if (!h) return;
    const otps = S().list("otps");
    h.innerHTML = page(
      "TRANSACTIONAL SECURITY",
      "OTP & verification",
      "One-time passwords and verification codes for login, signup, password reset and sensitive actions — optimized for deliverability and speed.",
      `<button class="pp-btn" data-ent-otp-docs>Integration guide</button><button class="pp-btn primary" data-ent-otp-create>+ Create OTP template</button>`,
      `${stats([
        ["Templates", String(otps.length), "OTP flows"],
        ["Default TTL", "10 min", "Configurable"],
        ["Code length", "6 digits", "Numeric / alphanumeric"],
        ["Channel", "Email", "SMS later optional"],
      ])}
      <div class="ent-grid-3">
        <article class="pp-card ent-feature"><h3>Login codes</h3><p>Passwordless or 2FA codes with short TTL and single-use enforcement.</p></article>
        <article class="pp-card ent-feature"><h3>Signup confirm</h3><p>Verify email ownership before activating accounts.</p></article>
        <article class="pp-card ent-feature"><h3>Sensitive actions</h3><p>Confirm payments, domain changes, API key creation.</p></article>
      </div>
      <section class="pp-card pro-table-wrap" style="margin-top:16px">
        ${
          otps.length
            ? `<div class="pro-table-head"><span>Flow</span><span>Code</span><span>TTL</span><span>Status</span><span></span></div>` +
              otps
                .map(
                  (o) => `<div class="pro-table-row">
              <div><b>${esc(o.name)}</b><small>${esc(o.purpose || "Verification")}</small></div>
              <span>${esc(o.codeLength || 6)} ${esc(o.codeType || "digits")}</span>
              <span>${esc(o.ttlMinutes || 10)} min</span>
              <span class="pp-badge good">${esc(o.status || "Active")}</span>
              <div class="pro-row-actions">
                <button class="pp-btn small" data-ent-otp-sample="${esc(o.id)}">Sample API</button>
                <button class="pp-btn small" data-ent-otp-send="${esc(o.id)}">Queue test</button>
                <button class="pp-btn small danger" data-ent-otp-del="${esc(o.id)}">Delete</button>
              </div>
            </div>`
                )
                .join("")
            : empty("No OTP templates", "Create a verification flow for login, signup or sensitive actions.", `<button class="pp-btn primary" data-ent-otp-create>+ Create OTP template</button>`)
        }
      </section>
      <section class="pp-card ent-panel" style="margin-top:16px">
        <h3>Recommended API shape</h3>
        <pre class="pp-code">POST /v1/otp/send
{ "template": "login-code", "to": "user@example.com", "data": { "code": "482193" } }

POST /v1/otp/verify
{ "template": "login-code", "to": "user@example.com", "code": "482193" }</pre>
      </section>`
    );
    h.querySelectorAll("[data-ent-otp-create]").forEach((b) => (b.onclick = createOtp));
    h.querySelector("[data-ent-otp-docs]")?.addEventListener("click", () =>
      modal(
        `<h2>OTP integration</h2><p>1) Create template · 2) Call send · 3) Verify once · 4) Expire / rate-limit attempts.</p><div class="pp-modal-actions"><button class="pp-btn primary" data-x>Done</button></div>`
      )
    );
    h.querySelectorAll("[data-ent-otp-del]").forEach(
      (b) =>
        (b.onclick = () => {
          S().remove("otps", b.dataset.entOtpDel);
          otpPage();
        })
    );
    h.querySelectorAll("[data-ent-otp-sample]").forEach((b) => {
      b.onclick = () => {
        const o = S().list("otps").find((x) => x.id === b.dataset.entOtpSample);
        const sample = `curl -X POST https://api.senditto.com/v1/otp/send -H "Authorization: Bearer $SENDITTO_API_KEY" -H "Content-Type: application/json" -d '{"template":"${o?.name || "login-code"}","to":"user@example.com"}'`;
        modal(
          `<h2>Sample send</h2><pre class="pp-code">${esc(sample)}</pre><div class="pp-modal-actions"><button class="pp-btn" data-copy>Copy</button><button class="pp-btn primary" data-x>Done</button></div>`
        ).querySelector("[data-copy]")?.addEventListener("click", () => copy(sample));
      };
    });
    h.querySelectorAll("[data-ent-otp-send]").forEach((b) => {
      b.onclick = () => {
        const o = S().list("otps").find((x) => x.id === b.dataset.entOtpSend);
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const msg = S().queueMessage({
          from: S().currentWorkspace()?.sending?.from || "noreply@senditto.local",
          to: ["test@example.com"],
          subject: o?.subject || `Your verification code: ${code}`,
          body: (o?.body || "Your code is {{code}}").replaceAll("{{code}}", code),
          stream: "Transactional",
          status: "Queued",
          tags: ["otp", o?.name || "otp"],
        });
        toast(`OTP test queued · ${msg.id} · code ${code}`);
      };
    });
  }
  function createOtp() {
    const m = modal(
      `<h2>Create OTP template</h2>
      <form class="pp-form pp-form-stack" data-f>
        <label class="full"><span class="pp-label-text">Template name</span><input class="pp-input" name="name" placeholder="login-code" required></label>
        <label class="full"><span class="pp-label-text">Purpose</span><select class="pp-input" name="purpose"><option>Login</option><option>Signup</option><option>Password reset</option><option>Sensitive action</option><option>2FA</option></select></label>
        <label><span class="pp-label-text">Code length</span><input class="pp-input" name="codeLength" type="number" value="6" min="4" max="10"></label>
        <label><span class="pp-label-text">TTL (minutes)</span><input class="pp-input" name="ttlMinutes" type="number" value="10" min="1" max="60"></label>
        <label class="full"><span class="pp-label-text">Subject</span><input class="pp-input" name="subject" value="Your verification code" required></label>
        <label class="full"><span class="pp-label-text">Body</span><textarea class="pp-input pp-textarea" name="body" required>Your verification code is {{code}}. It expires in {{ttl}} minutes.</textarea></label>
      </form>
      <div class="pp-modal-actions"><button class="pp-btn" data-x>Cancel</button><button class="pp-btn primary" data-save>Create</button></div>`,
      true
    );
    m.querySelector("[data-save]").onclick = () => {
      const f = m.querySelector("[data-f]");
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      S().add("otps", {
        ...d,
        codeType: "digits",
        status: "Active",
        codeLength: Number(d.codeLength || 6),
        ttlMinutes: Number(d.ttlMinutes || 10),
      });
      m.remove();
      toast("OTP template created");
      otpPage();
    };
  }

  // ========== SENDERS ==========
  function sendersPage() {
    const h = host();
    if (!h) return;
    const list = S().list("senders");
    h.innerHTML = page(
      "FROM IDENTITIES",
      "Senders",
      "Verified From identities used for transactional, OTP and marketing streams. Domains must be authenticated first.",
      `<button class="pp-btn primary" data-ent-add-sender>+ Add sender</button>`,
      `${stats([
        ["Senders", String(list.length), "Identities"],
        ["Verified domains", String(S().list("domains").filter((d) => /verified/i.test(d.status || "")).length), "Available roots"],
        ["Default stream", "Transactional", "Per sender override"],
        ["Reply-to", "Supported", "Optional"],
      ])}
      <section class="pp-card pro-table-wrap">
        ${
          list.length
            ? `<div class="pro-table-head"><span>From</span><span>Reply-to</span><span>Stream</span><span>Status</span><span></span></div>` +
              list
                .map(
                  (s) => `<div class="pro-table-row">
              <div><b>${esc(s.name)}</b><small>${esc(s.fromEmail)}</small></div>
              <span>${esc(s.replyTo || "—")}</span>
              <span>${esc(s.stream || "Transactional")}</span>
              <span class="pp-badge good">${esc(s.status || "Active")}</span>
              <div class="pro-row-actions">
                <button class="pp-btn small" data-ent-use-sender="${esc(s.id)}">Set default</button>
                <button class="pp-btn small danger" data-ent-del-sender="${esc(s.id)}">Delete</button>
              </div>
            </div>`
                )
                .join("")
            : empty("No senders", "Add a From identity like “Acme <hello@mail.acme.com>”.", `<button class="pp-btn primary" data-ent-add-sender>+ Add sender</button>`)
        }
      </section>`
    );
    h.querySelectorAll("[data-ent-add-sender]").forEach((b) => {
      b.onclick = () => {
        const m = modal(
          `<h2>Add sender</h2>
          <form class="pp-form pp-form-stack" data-f>
            <label class="full"><span class="pp-label-text">Display name</span><input class="pp-input" name="name" placeholder="Acme" required></label>
            <label class="full"><span class="pp-label-text">From email</span><input class="pp-input" type="email" name="fromEmail" placeholder="hello@mail.yourdomain.com" required></label>
            <label class="full"><span class="pp-label-text">Reply-to</span><input class="pp-input" type="email" name="replyTo" placeholder="support@yourdomain.com"></label>
            <label class="full"><span class="pp-label-text">Default stream</span><select class="pp-input" name="stream"><option>Transactional</option><option>Marketing</option><option>Automations</option></select></label>
          </form>
          <div class="pp-modal-actions"><button class="pp-btn" data-x>Cancel</button><button class="pp-btn primary" data-save>Save sender</button></div>`
        );
        m.querySelector("[data-save]").onclick = () => {
          const f = m.querySelector("[data-f]");
          if (!f.reportValidity()) return;
          const d = Object.fromEntries(new FormData(f));
          S().add("senders", { ...d, status: "Active", detail: d.fromEmail });
          const ws = S().currentWorkspace();
          if (ws && !ws.sending?.from) {
            S().updateWorkspace(ws.id, {
              sending: { ...(ws.sending || {}), from: `${d.name} <${d.fromEmail}>`, replyTo: d.replyTo || "" },
            });
          }
          m.remove();
          toast("Sender added");
          sendersPage();
        };
      };
    });
    h.querySelectorAll("[data-ent-del-sender]").forEach(
      (b) =>
        (b.onclick = () => {
          S().remove("senders", b.dataset.entDelSender);
          sendersPage();
        })
    );
    h.querySelectorAll("[data-ent-use-sender]").forEach((b) => {
      b.onclick = () => {
        const s = S().list("senders").find((x) => x.id === b.dataset.entUseSender);
        const ws = S().currentWorkspace();
        if (!s || !ws) return;
        S().updateWorkspace(ws.id, {
          sending: {
            ...(ws.sending || {}),
            from: `${s.name} <${s.fromEmail}>`,
            replyTo: s.replyTo || "",
            stream: s.stream || "Transactional",
          },
        });
        toast("Default sender updated for workspace");
      };
    });
  }

  // ========== SMTP ==========
  function smtpPage() {
    const h = host();
    if (!h) return;
    const list = S().list("smtpCredentials");
    h.innerHTML = page(
      "LEGACY & APP COMPAT",
      "SMTP credentials",
      "SMTP users for apps that cannot use the HTTP API yet. Same deliverability stack, separate credentials per environment.",
      `<button class="pp-btn primary" data-ent-smtp-create>+ Create SMTP user</button>`,
      `${stats([
        ["SMTP users", String(list.length), "Credentials"],
        ["Host", "smtp.senditto.com", "When edge is live"],
        ["Ports", "587 · 465", "STARTTLS / TLS"],
        ["Auth", "PLAIN / LOGIN", "Username + password"],
      ])}
      <section class="pp-card pro-table-wrap">
        ${
          list.length
            ? list
                .map(
                  (s) => `<div class="pro-table-row">
              <div><b>${esc(s.name)}</b><small class="mono">${esc(s.username)}</small></div>
              <span>${esc(s.env || "Production")}</span>
              <span class="pp-badge good">${esc(s.status || "Active")}</span>
              <div class="pro-row-actions">
                <button class="pp-btn small" data-ent-smtp-show="${esc(s.id)}">Show password</button>
                <button class="pp-btn small danger" data-ent-smtp-del="${esc(s.id)}">Revoke</button>
              </div>
            </div>`
                )
                .join("")
            : empty("No SMTP credentials", "Create an SMTP user for WordPress, ERP, or legacy apps.", `<button class="pp-btn primary" data-ent-smtp-create>+ Create SMTP user</button>`)
        }
      </section>
      <section class="pp-card ent-panel" style="margin-top:16px">
        <h3>Connection settings</h3>
        <div class="pp-detail">
          <div class="pp-detail-row"><span>Host</span><b>smtp.senditto.com</b></div>
          <div class="pp-detail-row"><span>Port</span><b>587 (STARTTLS) or 465 (TLS)</b></div>
          <div class="pp-detail-row"><span>Encryption</span><b>Required</b></div>
        </div>
      </section>`
    );
    h.querySelectorAll("[data-ent-smtp-create]").forEach((b) => {
      b.onclick = () => {
        const m = modal(
          `<h2>Create SMTP user</h2>
          <form class="pp-form pp-form-stack" data-f>
            <label class="full"><span class="pp-label-text">Label</span><input class="pp-input" name="name" placeholder="WordPress production" required></label>
            <label class="full"><span class="pp-label-text">Environment</span><select class="pp-input" name="env"><option>Production</option><option>Staging</option></select></label>
          </form>
          <div class="pp-modal-actions"><button class="pp-btn" data-x>Cancel</button><button class="pp-btn primary" data-save>Create</button></div>`
        );
        m.querySelector("[data-save]").onclick = () => {
          const f = m.querySelector("[data-f]");
          if (!f.reportValidity()) return;
          const d = Object.fromEntries(new FormData(f));
          const username = `smtp_${Math.random().toString(36).slice(2, 10)}`;
          const password = token("smtppw");
          const rec = S().add("smtpCredentials", {
            name: d.name,
            env: d.env,
            username,
            password,
            status: "Active",
          });
          m.remove();
          smtpPage();
          modal(
            `<h2>SMTP user created</h2>
            <div class="pro-secret-card"><small>USERNAME</small><code>${esc(username)}</code>
            <div class="pro-secret-actions"><button class="pp-btn" data-c1>Copy username</button></div></div>
            <div class="pro-secret-card"><small>PASSWORD</small><code>${esc(password)}</code>
            <div class="pro-secret-actions"><button class="pp-btn primary" data-c2>Copy password</button></div></div>
            <div class="pp-modal-actions"><button class="pp-btn primary" data-x>Done</button></div>`
          );
          document.querySelector("[data-c1]")?.addEventListener("click", () => copy(username));
          document.querySelector("[data-c2]")?.addEventListener("click", () => copy(password));
          S().logEvent("success", "smtp.create", `SMTP user ${rec.name}`);
        };
      };
    });
    h.querySelectorAll("[data-ent-smtp-show]").forEach((b) => {
      b.onclick = () => {
        const s = S().list("smtpCredentials").find((x) => x.id === b.dataset.entSmtpShow);
        if (!s) return;
        modal(
          `<h2>${esc(s.name)}</h2><div class="pp-detail">
          <div class="pp-detail-row"><span>Username</span><b class="mono">${esc(s.username)}</b></div>
          <div class="pp-detail-row"><span>Password</span><b class="mono">${esc(s.password)}</b></div>
        </div><div class="pp-modal-actions"><button class="pp-btn" data-cp>Copy password</button><button class="pp-btn primary" data-x>Close</button></div>`
        ).querySelector("[data-cp]")?.addEventListener("click", () => copy(s.password));
      };
    });
    h.querySelectorAll("[data-ent-smtp-del]").forEach(
      (b) =>
        (b.onclick = () => {
          S().remove("smtpCredentials", b.dataset.entSmtpDel);
          smtpPage();
        })
    );
  }

  // ========== BATCHES ==========
  function batchesPage() {
    const h = host();
    if (!h) return;
    const list = S().list("batches");
    h.innerHTML = page(
      "HIGH VOLUME",
      "Batch sending",
      "Submit large recipient sets for campaigns or lifecycle blasts. Jobs track accepted, failed and suppressed counts.",
      `<button class="pp-btn primary" data-ent-batch>+ Create batch job</button>`,
      `${stats([
        ["Jobs", String(list.length), "Local control plane"],
        ["Queued", String(list.filter((b) => b.status === "Queued").length), "Waiting workers"],
        ["Completed", String(list.filter((b) => b.status === "Completed").length), "Finished"],
        ["Max recipients", "Unlimited*", "*when backend workers live"],
      ])}
      <section class="pp-card pro-table-wrap">
        ${
          list.length
            ? list
                .map(
                  (b) => `<div class="pro-table-row">
              <div><b>${esc(b.name)}</b><small>${esc(b.stream || "Marketing")}</small></div>
              <span>${Number(b.recipients || 0).toLocaleString()} recipients</span>
              <span class="pp-badge ${b.status === "Completed" ? "good" : "blue"}">${esc(b.status)}</span>
              <small>${esc(S().formatRelative(b.createdAt))}</small>
              <button class="pp-btn small danger" data-ent-batch-del="${esc(b.id)}">Delete</button>
            </div>`
                )
                .join("")
            : empty("No batch jobs", "Create a batch to model high-volume campaign submission.", `<button class="pp-btn primary" data-ent-batch>+ Create batch job</button>`)
        }
      </section>`
    );
    h.querySelectorAll("[data-ent-batch]").forEach((b) => {
      b.onclick = () => {
        const m = modal(
          `<h2>Create batch job</h2>
          <form class="pp-form pp-form-stack" data-f>
            <label class="full"><span class="pp-label-text">Job name</span><input class="pp-input" name="name" required placeholder="March promo wave 1"></label>
            <label class="full"><span class="pp-label-text">Stream</span><select class="pp-input" name="stream"><option>Marketing</option><option>Transactional</option><option>Automations</option></select></label>
            <label class="full"><span class="pp-label-text">Recipients (count)</span><input class="pp-input" type="number" name="recipients" min="1" value="10000" required></label>
            <label class="full"><span class="pp-label-text">Template / subject</span><input class="pp-input" name="subject" placeholder="March updates" required></label>
          </form>
          <div class="pp-modal-actions"><button class="pp-btn" data-x>Cancel</button><button class="pp-btn primary" data-save>Queue batch</button></div>`
        );
        m.querySelector("[data-save]").onclick = () => {
          const f = m.querySelector("[data-f]");
          if (!f.reportValidity()) return;
          const d = Object.fromEntries(new FormData(f));
          S().add("batches", {
            name: d.name,
            stream: d.stream,
            recipients: Number(d.recipients),
            subject: d.subject,
            status: "Queued",
            accepted: 0,
            failed: 0,
            suppressed: 0,
          });
          S().logEvent("info", "batch.queue", `Batch ${d.name} queued for ${d.recipients} recipients`);
          m.remove();
          toast("Batch job queued in control plane");
          batchesPage();
        };
      };
    });
    h.querySelectorAll("[data-ent-batch-del]").forEach(
      (b) =>
        (b.onclick = () => {
          S().remove("batches", b.dataset.entBatchDel);
          batchesPage();
        })
    );
  }

  // ========== IP POOLS ==========
  function ipPoolsPage() {
    const h = host();
    if (!h) return;
    const list = S().list("ipPools");
    h.innerHTML = page(
      "DELIVERABILITY INFRA",
      "IP pools",
      "Separate reputation for transactional vs marketing. Shared pool by default; dedicated IPs for high-volume senders.",
      `<button class="pp-btn primary" data-ent-ip>+ Add IP pool</button>`,
      `${stats([
        ["Pools", String(list.length || 1), "Configured"],
        ["Mode", S().get().capacity?.dedicatedIp ? "Dedicated" : "Shared", "Workspace"],
        ["Warmup", S().get().capacity?.warmupEnabled ? "Enabled" : "Off", "New IPs"],
        ["Regions", (S().get().capacity?.regions || []).join(", ") || "—", "Egress"],
      ])}
      <section class="pp-card pro-table-wrap">
        ${
          list.length
            ? list
                .map(
                  (p) => `<div class="pro-table-row">
              <div><b>${esc(p.name)}</b><small>${esc(p.type || "shared")}</small></div>
              <span>${esc(p.stream || "All streams")}</span>
              <span class="pp-badge good">${esc(p.status || "Active")}</span>
              <button class="pp-btn small danger" data-ent-ip-del="${esc(p.id)}">Remove</button>
            </div>`
                )
                .join("")
            : empty("Using shared IP pool", "Add a dedicated pool when your volume and compliance require isolated reputation.", `<button class="pp-btn primary" data-ent-ip>+ Add IP pool</button>`)
        }
      </section>`
    );
    h.querySelectorAll("[data-ent-ip]").forEach((b) => {
      b.onclick = () => {
        const m = modal(
          `<h2>Add IP pool</h2>
          <form class="pp-form pp-form-stack" data-f>
            <label class="full"><span class="pp-label-text">Pool name</span><input class="pp-input" name="name" required placeholder="Marketing dedicated"></label>
            <label class="full"><span class="pp-label-text">Type</span><select class="pp-input" name="type"><option>shared</option><option>dedicated</option></select></label>
            <label class="full"><span class="pp-label-text">Bound stream</span><select class="pp-input" name="stream"><option>All streams</option><option>Transactional</option><option>Marketing</option><option>Automations</option></select></label>
          </form>
          <div class="pp-modal-actions"><button class="pp-btn" data-x>Cancel</button><button class="pp-btn primary" data-save>Create</button></div>`
        );
        m.querySelector("[data-save]").onclick = () => {
          const f = m.querySelector("[data-f]");
          if (!f.reportValidity()) return;
          const d = Object.fromEntries(new FormData(f));
          S().add("ipPools", { ...d, status: "Active" });
          if (d.type === "dedicated") {
            const cap = S().get().capacity || {};
            S().get().capacity = { ...cap, dedicatedIp: true };
            S().persist();
          }
          m.remove();
          ipPoolsPage();
        };
      };
    });
    h.querySelectorAll("[data-ent-ip-del]").forEach(
      (b) =>
        (b.onclick = () => {
          S().remove("ipPools", b.dataset.entIpDel);
          ipPoolsPage();
        })
    );
  }

  // ========== TRACKING ==========
  function trackingPage() {
    const h = host();
    if (!h) return;
    const t = S().get().tracking || {};
    h.innerHTML = page(
      "ENGAGEMENT",
      "Tracking & compliance",
      "Open/click tracking, List-Unsubscribe headers and UTM defaults for advertising and product analytics.",
      `<button class="pp-btn primary" data-ent-track-save>Save tracking</button>`,
      `${stats([
        ["Open tracking", t.openTracking ? "On" : "Off", "Pixel"],
        ["Click tracking", t.clickTracking ? "On" : "Off", "Redirect links"],
        ["Unsubscribe header", t.unsubscribeHeader ? "On" : "Off", "One-click"],
        ["UTM defaults", t.utmDefaults ? "On" : "Off", "Campaign tags"],
      ])}
      <section class="pp-card ent-panel">
        <div class="ent-toggles">
          ${toggleRow("openTracking", "Open tracking", "Insert open pixel for engagement analytics", t.openTracking !== false)}
          ${toggleRow("clickTracking", "Click tracking", "Rewrite links to measure clicks", t.clickTracking !== false)}
          ${toggleRow("unsubscribeHeader", "List-Unsubscribe header", "RFC-compliant one-click unsubscribe for marketing", t.unsubscribeHeader !== false)}
          ${toggleRow("utmDefaults", "UTM defaults", "Apply utm_source=senditto on campaign links", !!t.utmDefaults)}
        </div>
      </section>
      <section class="pp-card ent-panel" style="margin-top:16px">
        <h3>Advertising vs transactional</h3>
        <p class="ent-muted">Marketing streams should always include unsubscribe. Transactional/OTP streams should avoid marketing footers and list-unsubscribe when not required.</p>
      </section>`
    );
    function toggleRow(key, title, copy, on) {
      return `<div class="pp-switch-row"><div><b>${esc(title)}</b><small>${esc(copy)}</small></div><button type="button" class="pp-toggle ${on ? "on" : ""}" data-ent-tog="${key}"><i></i></button></div>`;
    }
    const state = { ...t };
    h.querySelectorAll("[data-ent-tog]").forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.entTog;
        state[k] = !state[k];
        b.classList.toggle("on", state[k]);
      };
    });
    h.querySelector("[data-ent-track-save]")?.addEventListener("click", () => {
      const st = S().get();
      st.tracking = { ...st.tracking, ...state };
      S().persist();
      S().emit("tracking:update", st.tracking);
      toast("Tracking settings saved");
      trackingPage();
    });
  }

  // ========== TEAM ==========
  function teamPage() {
    const h = host();
    if (!h) return;
    const ws = S().currentWorkspace();
    const members = ws?.members || [];
    const invites = S().list("teamInvites");
    h.innerHTML = page(
      "ACCESS CONTROL",
      "Team & roles",
      "Invite operators with least-privilege roles. Critical for safe high-volume production changes.",
      `<button class="pp-btn primary" data-ent-invite>+ Invite member</button>`,
      `${stats([
        ["Members", String(members.length), "In workspace"],
        ["Pending invites", String(invites.length), "Awaiting accept"],
        ["Roles", "Owner · Admin · Developer · Marketer · Viewer", "Scoped"],
        ["Approvals", ws?.security?.approvals ? "On" : "Off", "Production changes"],
      ])}
      <section class="pp-card pro-table-wrap">
        <div class="pro-table-head"><span>Member</span><span>Role</span><span>Status</span><span></span></div>
        ${
          members.length
            ? members
                .map(
                  (m, i) => `<div class="pro-table-row">
              <div><b>${esc(m[0] || m.name)}</b><small>${esc(m[1] || m.email)}</small></div>
              <span>${esc(m[2] || m.role || "Member")}</span>
              <span class="pp-badge good">Active</span>
              <button class="pp-btn small danger" data-ent-rm-member="${i}" ${ (m[2]||m.role)==="Owner" ? "disabled" : "" }>Remove</button>
            </div>`
                )
                .join("")
            : empty("No members yet", "Invite developers and marketers with scoped roles.", `<button class="pp-btn primary" data-ent-invite>+ Invite member</button>`)
        }
      </section>
      ${
        invites.length
          ? `<section class="pp-card pro-table-wrap" style="margin-top:16px"><h3 style="padding:16px 16px 0">Pending invites</h3>${invites
              .map(
                (inv) =>
                  `<div class="pro-table-row"><div><b>${esc(inv.email)}</b></div><span>${esc(inv.role)}</span><span class="pp-badge blue">Pending</span><button class="pp-btn small danger" data-ent-rm-invite="${esc(inv.id)}">Cancel</button></div>`
              )
              .join("")}</section>`
          : ""
      }
      <section class="pp-card ent-panel" style="margin-top:16px">
        <h3>Role matrix</h3>
        <div class="ent-matrix">
          <div><b>Permission</b><b>Admin</b><b>Developer</b><b>Marketer</b><b>Viewer</b></div>
          ${[
            ["Manage members", "✓", "—", "—", "—"],
            ["API keys & SMTP", "✓", "✓", "—", "—"],
            ["Send transactional / OTP", "✓", "✓", "—", "—"],
            ["Campaigns & templates", "✓", "✓", "✓", "—"],
            ["View analytics & logs", "✓", "✓", "✓", "✓"],
          ]
            .map((r) => `<div>${r.map((c) => `<span>${c}</span>`).join("")}</div>`)
            .join("")}
        </div>
      </section>`
    );
    h.querySelectorAll("[data-ent-invite]").forEach((b) => {
      b.onclick = () => {
        const m = modal(
          `<h2>Invite member</h2>
          <form class="pp-form pp-form-stack" data-f>
            <label class="full"><span class="pp-label-text">Email</span><input class="pp-input" type="email" name="email" required></label>
            <label class="full"><span class="pp-label-text">Role</span><select class="pp-input" name="role"><option>Admin</option><option>Developer</option><option>Marketer</option><option>Viewer</option></select></label>
          </form>
          <div class="pp-modal-actions"><button class="pp-btn" data-x>Cancel</button><button class="pp-btn primary" data-save>Send invite</button></div>`
        );
        m.querySelector("[data-save]").onclick = () => {
          const f = m.querySelector("[data-f]");
          if (!f.reportValidity()) return;
          const d = Object.fromEntries(new FormData(f));
          S().add("teamInvites", { email: d.email, role: d.role, status: "Pending", name: d.email });
          const w = S().currentWorkspace();
          if (w) {
            const members = [...(w.members || []), [String(d.email).split("@")[0], d.email, d.role]];
            S().updateWorkspace(w.id, { members });
          }
          m.remove();
          toast("Invite recorded");
          teamPage();
        };
      };
    });
    h.querySelectorAll("[data-ent-rm-member]").forEach((b) => {
      b.onclick = () => {
        const w = S().currentWorkspace();
        if (!w) return;
        const members = [...(w.members || [])];
        members.splice(Number(b.dataset.entRmMember), 1);
        S().updateWorkspace(w.id, { members });
        teamPage();
      };
    });
    h.querySelectorAll("[data-ent-rm-invite]").forEach((b) => {
      b.onclick = () => {
        S().remove("teamInvites", b.dataset.entRmInvite);
        teamPage();
      };
    });
  }

  // ========== BILLING ==========
  function billingPage() {
    const h = host();
    if (!h) return;
    const settings = S().get().settings || {};
    const cap = S().get().capacity || {};
    const used = S().metrics().sent;
    const quota = cap.monthlyQuota || settings.monthlyAllowance || 1000000;
    const pct = quota ? Math.min(100, Math.round((used / quota) * 100)) : 0;
    h.innerHTML = page(
      "PLAN & USAGE",
      "Billing & usage",
      "Usage-based email infrastructure. Track quota, burst and plan tier for production scale.",
      `<button class="pp-btn" data-ent-export-usage>Export usage</button><button class="pp-btn primary" data-ent-change-plan>Change plan</button>`,
      `${stats([
        ["Plan", settings.plan || "Scale", "Current"],
        ["Used this period", String(used), "Queued/sent local"],
        ["Quota", Number(quota).toLocaleString(), "Emails / month"],
        ["Usage", `${pct}%`, "Of quota"],
      ])}
      <section class="pp-card ent-panel">
        <h3>Usage meter</h3>
        <div class="ent-meter"><i style="width:${pct}%"></i></div>
        <p class="ent-muted">${used.toLocaleString()} of ${Number(quota).toLocaleString()} emails · burst ${cap.burstPerSecond || 0}/s · concurrency ${cap.concurrentSends || 0}</p>
      </section>
      <div class="ent-grid-3" style="margin-top:16px">
        ${[
          ["Developer", "50k emails", "Start building"],
          ["Scale", "1M+ emails", "Growth workloads"],
          ["Enterprise", "Custom", "Dedicated IPs · SSO · SLA"],
        ]
          .map(
            ([n, v, d]) =>
              `<article class="pp-card ent-feature"><span class="pp-badge ${n === (settings.plan || "Scale") ? "good" : "blue"}">${n === (settings.plan || "Scale") ? "Current" : "Plan"}</span><h3>${n}</h3><p><b>${v}</b><br>${d}</p></article>`
          )
          .join("")}
      </div>`
    );
    h.querySelector("[data-ent-export-usage]")?.addEventListener("click", () => {
      const csv = `metric,value\nplan,${settings.plan}\nused,${used}\nquota,${quota}\nburst,${cap.burstPerSecond}\n`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "senditto-usage.csv";
      a.click();
      toast("Usage exported");
    });
    h.querySelector("[data-ent-change-plan]")?.addEventListener("click", () => {
      const m = modal(
        `<h2>Change plan</h2>
        <form class="pp-form pp-form-stack" data-f>
          <label class="full"><span class="pp-label-text">Plan</span><select class="pp-input" name="plan"><option>Developer</option><option selected>Scale</option><option>Enterprise</option></select></label>
          <label class="full"><span class="pp-label-text">Monthly quota</span><input class="pp-input" type="number" name="quota" value="${quota}"></label>
        </form>
        <div class="pp-modal-actions"><button class="pp-btn" data-x>Cancel</button><button class="pp-btn primary" data-save>Save plan</button></div>`
      );
      m.querySelector("[data-save]").onclick = () => {
        const d = Object.fromEntries(new FormData(m.querySelector("[data-f]")));
        S().setSettings({ plan: d.plan, monthlyAllowance: Number(d.quota) });
        const st = S().get();
        st.capacity = { ...(st.capacity || {}), monthlyQuota: Number(d.quota) };
        S().persist();
        m.remove();
        toast("Plan updated");
        billingPage();
      };
    });
  }

  // ========== INTEGRATIONS ==========
  function integrationsPage() {
    const h = host();
    if (!h) return;
    const catalog = [
      ["Stripe", "Billing events → receipts", "payments"],
      ["Clerk / Auth", "Signup → OTP / welcome", "auth"],
      ["Shopify", "Orders → receipts & marketing", "commerce"],
      ["Segment", "Events → automations", "cdp"],
      ["Slack", "Delivery incident alerts", "ops"],
      ["Datadog", "Metrics & logs export", "observability"],
    ];
    const enabled = S().list("integrations");
    h.innerHTML = page(
      "ECOSYSTEM",
      "Integrations",
      "Connect product, commerce and ops tools. Integrations emit sends and react to delivery events.",
      ``,
      `<div class="ent-grid-3">${catalog
        .map(([name, desc, key]) => {
          const on = enabled.some((i) => i.key === key);
          return `<article class="pp-card ent-feature">
            <h3>${esc(name)}</h3><p>${esc(desc)}</p>
            <button class="pp-btn ${on ? "" : "primary"} small" data-ent-int="${key}" data-ent-int-name="${esc(name)}">${on ? "Configured" : "Enable"}</button>
          </article>`;
        })
        .join("")}</div>`
    );
    h.querySelectorAll("[data-ent-int]").forEach((b) => {
      b.onclick = () => {
        const key = b.dataset.entInt;
        const existing = S().list("integrations").find((i) => i.key === key);
        if (existing) {
          S().remove("integrations", existing.id);
          toast("Integration disabled");
        } else {
          S().add("integrations", {
            key,
            name: b.dataset.entIntName,
            status: "Configured",
            detail: "Local control-plane placeholder",
          });
          toast("Integration enabled (local)");
        }
        integrationsPage();
      };
    });
  }

  // ========== AUDIT ==========
  function auditPage() {
    const h = host();
    if (!h) return;
    const logs = S().list("logs");
    h.innerHTML = page(
      "SECURITY & COMPLIANCE",
      "Audit log",
      "Immutable-style trail of configuration and sensitive actions in this workspace control plane.",
      `<button class="pp-btn" data-ent-audit-export>Export JSON</button>`,
      `${stats([
        ["Events", String(logs.length), "Recorded"],
        ["Creates", String(logs.filter((l) => /create/i.test(l.event || "")).length), "Resources"],
        ["Security", String(logs.filter((l) => /revoke|delete|security/i.test(l.event || l.message || "")).length), "Sensitive"],
        ["Retention", "Local", "Server retention later"],
      ])}
      <section class="pp-card" data-log-list>
        ${
          logs.length
            ? logs
                .slice(0, 100)
                .map(
                  (l) =>
                    `<button class="pp-log-line" type="button"><code>${esc(S().formatRelative(l.createdAt))}</code><b>${esc(l.event)}</b><span class="pp-badge ${l.level === "success" ? "good" : l.level === "warning" ? "warn" : "blue"}">${esc(l.level)}</span><span>${esc(l.message || "")}</span><small>${esc(l.id)}</small></button>`
                )
                .join("")
            : empty("No audit events yet", "Create keys, domains, senders and sends to populate the audit trail.")
        }
      </section>`
    );
    h.querySelector("[data-ent-audit-export]")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "senditto-audit.json";
      a.click();
      toast("Audit exported");
    });
  }

  // ========== SETTINGS (full) ==========
  function settingsPage() {
    const h = host();
    if (!h) return;
    const s = S().get().settings || {};
    const ws = S().currentWorkspace();
    h.innerHTML = page(
      "ACCOUNT & WORKSPACE",
      "Settings",
      "Profile, security, notifications, data residency preferences and workspace defaults for production operations.",
      `<button class="pp-btn primary" data-ent-settings-save>Save all</button>`,
      `<div class="ent-settings">
        <aside class="pp-card ent-settings-nav">
          ${["Profile", "Security", "Notifications", "Workspace", "Data & privacy", "Danger zone"]
            .map((t, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-ent-stab="${t}">${t}</button>`)
            .join("")}
        </aside>
        <main class="pp-card ent-settings-main" data-ent-spanel>
          ${settingsProfile(s)}
        </main>
      </div>`
    );
    const panel = h.querySelector("[data-ent-spanel]");
    h.querySelectorAll("[data-ent-stab]").forEach((b) => {
      b.onclick = () => {
        h.querySelectorAll("[data-ent-stab]").forEach((x) => x.classList.toggle("active", x === b));
        const tab = b.dataset.entStab;
        if (tab === "Profile") panel.innerHTML = settingsProfile(s);
        if (tab === "Security") panel.innerHTML = settingsSecurity(ws);
        if (tab === "Notifications") panel.innerHTML = settingsNotes(s);
        if (tab === "Workspace") panel.innerHTML = settingsWorkspace(ws);
        if (tab === "Data & privacy") panel.innerHTML = settingsData(s);
        if (tab === "Danger zone") panel.innerHTML = settingsDanger();
        bindSettingsPanel(panel, tab);
      };
    });
    bindSettingsPanel(panel, "Profile");
    h.querySelector("[data-ent-settings-save]")?.addEventListener("click", () => {
      toast("Use section actions to save — or edit fields and click Save in Profile");
    });
  }
  function settingsProfile(s) {
    return `<h2>Profile</h2><p class="ent-muted">Your operator identity for this control plane.</p>
      <form class="pp-form" data-prof>
        <label><span class="pp-label-text">Display name</span><input class="pp-input" name="displayName" value="${esc(s.displayName || "")}"></label>
        <label><span class="pp-label-text">Work email</span><input class="pp-input" type="email" name="email" value="${esc(s.email || "")}"></label>
        <label><span class="pp-label-text">Language</span><select class="pp-input" name="language"><option>English</option><option>English (US)</option></select></label>
        <label><span class="pp-label-text">Timezone</span><input class="pp-input" name="timezone" value="${esc(s.timezone || "")}"></label>
      </form>
      <div class="pp-actions" style="margin-top:16px"><button class="pp-btn primary" data-save-prof>Save profile</button></div>`;
  }
  function settingsSecurity(ws) {
    const sec = ws?.security || {};
    return `<h2>Security</h2><p class="ent-muted">Workspace security controls for production changes.</p>
      ${switchRow("mfa", "Require MFA", "Enforce second factor for admins", !!sec.mfa)}
      ${switchRow("domainLock", "Domain-change protection", "Owner confirmation for DNS changes", sec.domainLock !== false)}
      ${switchRow("approvals", "Two-person approval", "Approve production key/domain changes", !!sec.approvals)}
      ${switchRow("audit", "Extended audit retention", "Keep security events longer", sec.audit !== false)}
      <div class="pp-actions" style="margin-top:16px"><button class="pp-btn primary" data-save-sec>Save security</button></div>`;
  }
  function settingsNotes(s) {
    const n = s.notifications || {};
    return `<h2>Notifications</h2>
      ${switchRow("deliveryIncidents", "Delivery incidents", "Outages and degradation", n.deliveryIncidents !== false)}
      ${switchRow("weeklyReport", "Weekly report", "Performance summary", !!n.weeklyReport)}
      ${switchRow("securityActivity", "Security activity", "Key and login changes", n.securityActivity !== false)}
      ${switchRow("productUpdates", "Product updates", "Platform news", !!n.productUpdates)}
      <div class="pp-actions" style="margin-top:16px"><button class="pp-btn primary" data-save-notes>Save notifications</button></div>`;
  }
  function settingsWorkspace(ws) {
    return `<h2>Workspace defaults</h2>
      <form class="pp-form" data-ws>
        <label><span class="pp-label-text">Workspace name</span><input class="pp-input" name="name" value="${esc(ws?.name || "")}"></label>
        <label><span class="pp-label-text">Type</span><select class="pp-input" name="type"><option>Developer workspace</option><option>Marketing workspace</option><option>Business workspace</option></select></label>
        <label><span class="pp-label-text">Region</span><input class="pp-input" name="region" value="${esc(ws?.region || "")}" placeholder="Europe (London)"></label>
        <label><span class="pp-label-text">Timezone</span><input class="pp-input" name="timezone" value="${esc(ws?.timezone || "")}"></label>
      </form>
      <div class="pp-actions" style="margin-top:16px"><button class="pp-btn primary" data-save-ws>Save workspace</button></div>`;
  }
  function settingsData(s) {
    const p = s.privacy || {};
    return `<h2>Data & privacy</h2>
      ${switchRow("analytics", "Product analytics", "Aggregated product usage", !!p.analytics)}
      ${switchRow("regional", "Regional processing preference", "Prefer selected region", p.regional !== false)}
      ${switchRow("diagnostics", "Diagnostic reporting", "Anonymized errors", !!p.diagnostics)}
      <div class="pp-actions" style="margin-top:16px">
        <button class="pp-btn" data-export-all>Export all local data</button>
        <button class="pp-btn primary" data-save-data>Save privacy</button>
      </div>`;
  }
  function settingsDanger() {
    return `<h2>Danger zone</h2><p class="ent-muted">Destructive local actions. Production deletion will require server-side confirmation.</p>
      <div class="pp-actions">
        <button class="pp-btn danger" data-clear-local>Clear all local platform data</button>
      </div>`;
  }
  function switchRow(key, title, copy, on) {
    return `<div class="pp-switch-row"><div><b>${esc(title)}</b><small>${esc(copy)}</small></div><button type="button" class="pp-toggle ${on ? "on" : ""}" data-sw="${key}"><i></i></button></div>`;
  }
  function bindSettingsPanel(panel, tab) {
    const toggles = {};
    panel.querySelectorAll("[data-sw]").forEach((b) => {
      toggles[b.dataset.sw] = b.classList.contains("on");
      b.onclick = () => {
        b.classList.toggle("on");
        toggles[b.dataset.sw] = b.classList.contains("on");
      };
    });
    panel.querySelector("[data-save-prof]")?.addEventListener("click", () => {
      const d = Object.fromEntries(new FormData(panel.querySelector("[data-prof]")));
      S().setSettings(d);
      toast("Profile saved");
    });
    panel.querySelector("[data-save-sec]")?.addEventListener("click", () => {
      const ws = S().currentWorkspace();
      if (!ws) return;
      S().updateWorkspace(ws.id, { security: { ...(ws.security || {}), ...toggles } });
      toast("Security saved");
    });
    panel.querySelector("[data-save-notes]")?.addEventListener("click", () => {
      S().setSettings({ notifications: { ...(S().get().settings.notifications || {}), ...toggles } });
      toast("Notifications saved");
    });
    panel.querySelector("[data-save-ws]")?.addEventListener("click", () => {
      const ws = S().currentWorkspace();
      const d = Object.fromEntries(new FormData(panel.querySelector("[data-ws]")));
      if (ws) S().updateWorkspace(ws.id, d);
      toast("Workspace saved");
    });
    panel.querySelector("[data-save-data]")?.addEventListener("click", () => {
      S().setSettings({ privacy: { ...(S().get().settings.privacy || {}), ...toggles } });
      toast("Privacy saved");
    });
    panel.querySelector("[data-export-all]")?.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([S().exportJson()], { type: "application/json" }));
      a.download = "senditto-platform-export.json";
      a.click();
      toast("Export downloaded");
    });
    panel.querySelector("[data-clear-local]")?.addEventListener("click", () => {
      (window.SendittoConfirm ? window.SendittoConfirm({ title: "Clear all platform data", message: "Clear ALL local Senditto platform data? Every record stored in this browser is removed.", danger: true, confirmLabel: "Clear everything" }) : Promise.resolve(false)).then((ok) => {
        if (!ok) return;
        S().resetAll();
        toast("Local data cleared");
        settingsPage();
      });
    });
  }

  // ========== HELP ==========
  function helpPage() {
    const h = host();
    if (!h) return;
    const guides = [
      ["Quickstart", "Send first email via API in 5 minutes", "getting-started"],
      ["OTP verification", "Login codes, signup confirm, 2FA patterns", "otp"],
      ["Domain authentication", "SPF, DKIM, DMARC, BIMI roadmap", "domains"],
      ["High-volume sending", "Batches, streams, warm-up, IP pools", "scale"],
      ["Inbound routing", "MX, parse, webhooks for replies", "inbound"],
      ["Webhooks", "Signatures, retries, event catalog", "webhooks"],
      ["Suppressions", "Bounces, complaints, compliance", "suppressions"],
      ["SMTP bridge", "Legacy apps over SMTP", "smtp"],
      ["Security model", "Keys, roles, approvals, audit", "security"],
      ["Advertising / marketing", "Campaigns, UTM, unsubscribe", "marketing"],
      ["Deliverability", "Reputation, alignment, content", "deliverability"],
      ["Error reference", "API error codes and recovery", "errors"],
    ];
    h.innerHTML = page(
      "DOCUMENTATION",
      "Help & docs",
      "Guides for building transactional, OTP and marketing email on Senditto — for developers and operators.",
      `<button class="pp-btn" data-ent-api-ref>API reference</button><button class="pp-btn primary" data-ent-support>Contact support</button>`,
      `<div class="pp-card pp-toolbar"><label class="pp-search">⌕<input data-ent-doc-search placeholder="Search docs"></label></div>
      <div class="ent-grid-3" data-ent-docs>${guides
        .map(
          ([t, d, k]) =>
            `<article class="pp-card ent-feature" data-doc="${k}"><h3>${esc(t)}</h3><p>${esc(d)}</p><button class="pp-btn small" data-open-doc="${esc(t)}">Open guide</button></article>`
        )
        .join("")}</div>
      <section class="pp-card ent-panel" style="margin-top:16px">
        <h3>Event catalog (webhooks)</h3>
        <div class="pp-detail">
          ${["email.sent", "email.delivered", "email.bounced", "email.complained", "email.opened", "email.clicked", "email.unsubscribed", "inbound.message"]
            .map((e) => `<div class="pp-detail-row"><span>Event</span><b class="mono">${e}</b></div>`)
            .join("")}
        </div>
      </section>`
    );
    h.querySelector("[data-ent-doc-search]")?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      h.querySelectorAll("[data-doc]").forEach((card) => {
        card.hidden = !card.textContent.toLowerCase().includes(q);
      });
    });
    h.querySelectorAll("[data-open-doc]").forEach((b) => {
      b.onclick = () =>
        modal(
          `<h2>${esc(b.dataset.openDoc)}</h2>
          <div class="pp-detail">
            <div class="pp-detail-row"><span>1</span><b>Choose workspace + environment</b></div>
            <div class="pp-detail-row"><span>2</span><b>Authenticate domain and create scoped key</b></div>
            <div class="pp-detail-row"><span>3</span><b>Test in staging before production volume</b></div>
            <div class="pp-detail-row"><span>4</span><b>Monitor logs, webhooks, suppressions</b></div>
          </div>
          <pre class="pp-code">Authorization: Bearer $SENDITTO_API_KEY</pre>
          <div class="pp-modal-actions"><button class="pp-btn primary" data-x>Done</button></div>`,
          true
        );
    });
    h.querySelector("[data-ent-api-ref]")?.addEventListener("click", () =>
      modal(
        `<h2>API reference (preview)</h2>
        <pre class="pp-code">POST /v1/emails
POST /v1/emails/batch
POST /v1/otp/send
POST /v1/otp/verify
GET  /v1/domains
POST /v1/domains
GET  /v1/messages/{id}
POST /v1/webhooks
GET  /v1/suppressions</pre>
        <div class="pp-modal-actions"><button class="pp-btn primary" data-x>Close</button></div>`,
        true
      )
    );
    h.querySelector("[data-ent-support]")?.addEventListener("click", () => {
      const m = modal(
        `<h2>Contact support</h2>
        <form class="pp-form pp-form-stack" data-f>
          <label class="full"><span class="pp-label-text">Topic</span><select class="pp-input" name="topic"><option>Technical</option><option>Deliverability</option><option>Billing</option><option>Security</option></select></label>
          <label class="full"><span class="pp-label-text">Message</span><textarea class="pp-input pp-textarea" name="body" required></textarea></label>
        </form>
        <div class="pp-modal-actions"><button class="pp-btn" data-x>Cancel</button><button class="pp-btn primary" data-save>Submit</button></div>`
      );
      m.querySelector("[data-save]").onclick = () => {
        const f = m.querySelector("[data-f]");
        if (!f.reportValidity()) return;
        const d = Object.fromEntries(new FormData(f));
        S().logEvent("info", "support.request", `${d.topic}: ${d.body.slice(0, 80)}`);
        m.remove();
        toast("Support request logged locally");
      };
    });
  }

  // ========== NAV ==========
  function injectNav() {
    const nav = document.querySelector(".dashboard-sidebar nav");
    if (!nav) return;
    if (!nav.dataset.entNav) {
      nav.dataset.entNav = "1";
      const groups = [
        [
          "PRODUCT",
          [
            ["otp", "OTP & verification"],
            ["senders", "Senders"],
            ["batches", "Batch sending"],
          ],
        ],
        [
          "INFRASTRUCTURE",
          [
            ["smtp", "SMTP"],
            ["ip-pools", "IP pools"],
            ["tracking", "Tracking"],
            ["suppressions", "Suppressions"],
            ["streams", "Streams & capacity"],
          ],
        ],
        [
          "ORGANIZATION",
          [
            ["team", "Team & roles"],
            ["billing", "Billing & usage"],
            ["integrations", "Integrations"],
            ["audit", "Audit log"],
          ],
        ],
      ];
      groups.forEach(([label, items]) => {
        const g = document.createElement("div");
        g.className = "nav-group";
        g.innerHTML = `<small>${label}</small>${items
          .map((i) => `<button type="button" data-ent-nav="${i[0]}"><span>${i[1]}</span></button>`)
          .join("")}`;
        nav.appendChild(g);
      });
    }
    nav.querySelectorAll("[data-ent-nav]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll(".dashboard-sidebar nav button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        go(btn.dataset.entNav);
      });
    });
  }

  const routes = {
    inbound: inboundPage,
    otp: otpPage,
    senders: sendersPage,
    smtp: smtpPage,
    batches: batchesPage,
    "ip-pools": ipPoolsPage,
    tracking: trackingPage,
    team: teamPage,
    billing: billingPage,
    integrations: integrationsPage,
    audit: auditPage,
    settings: settingsPage,
    help: helpPage,
  };

  function go(route) {
    const root = host();
    if (!root) return;
    root.dataset.route = route;
    try {
      routes[route]?.();
    } catch (err) {
      root.innerHTML = `<div class="pp-empty"><h3>Could not open page</h3><p>${esc(err.message)}</p></div>`;
    }
  }

  // Override core routes with enterprise surfaces
  window.SendittoUI = window.SendittoUI || {};
  Object.assign(window.SendittoUI, {
    inbound: inboundPage,
    settings: settingsPage,
    help: helpPage,
    otp: otpPage,
    senders: sendersPage,
    smtp: smtpPage,
    batches: batchesPage,
    "ip-pools": ipPoolsPage,
    tracking: trackingPage,
    team: teamPage,
    billing: billingPage,
    integrations: integrationsPage,
    audit: auditPage,
  });

  // Label map extension for main router clicks
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("button,a");
      if (!btn || !document.querySelector(".dashboard-shell")) return;
      const text = (btn.querySelector("span")?.textContent || btn.textContent || "").replace(/\s+/g, " ").trim();
      const map = {
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
        "Help & docs": "help",
        Settings: "settings",
        Inbound: "inbound",
      };
      if (map[text] && routes[map[text]]) {
        setTimeout(() => go(map[text]), 30);
      }
    },
    true
  );

  const boot = () => injectNav();
  [80, 300, 800, 1600].forEach((t) => setTimeout(boot, t));
  new MutationObserver(boot).observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });
})();
