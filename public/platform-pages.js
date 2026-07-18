/**
 * Platform resource pages — real empty state + live CRUD via SendittoStore.
 */
(() => {
  const S = () => window.SendittoStore;
  function store() {
    const s = S();
    if (!s || typeof s.list !== "function") throw new Error("Platform store is still loading. Click Try again.");
    return s;
  }
  const I = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${
      {
        plus: '<path d="M12 5v14M5 12h14"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
        download: '<path d="M12 3v12m-4-4 4 4 4-4"/><path d="M5 20h14"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
        filter: '<path d="M4 5h16l-6 7v5l-4 2v-7Z"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        route: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h4a4 4 0 0 1 4 4v6"/>',
        globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
        key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-3 3 3 3m-6 0 3 3"/>',
        hook: '<path d="M18 16.5a4 4 0 1 1-3.5-6.5V6a3 3 0 1 0-3-3"/><path d="m14 7 2 3 3-2"/>',
        terminal: '<path d="m4 17 6-5-6-5M12 19h8"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6A7 7 0 0 0 8.8 7L6.4 6 4.5 9.5 6.6 11a7 7 0 0 0 0 2L4.5 14.5 6.4 18l2.4-1a7 7 0 0 0 1.6 1l.3 2.6h4L15 18a7 7 0 0 0 1.6-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        check: '<path d="m20 6-11 11-5-5"/>',
        copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
        play: '<path d="m8 5 11 7-11 7Z"/>',
        pause: '<path d="M9 5v14M15 5v14"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
        refresh: '<path d="M20 11a8 8 0 1 0-2 5.3M20 4v7h-7"/>',
        trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
        edit: '<path d="m4 20 4-1 11-11-3-3L5 16Z"/>',
        eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
        spark: '<path d="m12 3 1.4 4.1L18 9l-4.6 1.9L12 15l-1.4-4.1L6 9l4.6-1.9ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
      }[n] || ""
    }</svg>`;

  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const host = () => document.getElementById("senditto-platform-root");
  let query = "";
  let filter = "All";
  let settingsTab = "profile";
  let liveTail = false;
  let liveTimer = null;
  let activePage = "";

  const configs = {
    Contacts: {
      key: "contacts",
      kicker: "AUDIENCE",
      copy: "People your product and campaigns communicate with.",
      icon: "users",
      primary: "Add contact",
      stats: (m) => [
        ["Total contacts", String(m.contacts)],
        ["Subscribed", String(m.subscribed)],
        ["Unsubscribed", String(m.unsubscribed)],
        ["Pending", String(store().list("contacts").filter((c) => c.status === "Pending").length)],
      ],
    },
    Segments: {
      key: "segments",
      kicker: "AUDIENCE INTELLIGENCE",
      copy: "Build precise, reusable audiences from contact and event data.",
      icon: "filter",
      primary: "Create segment",
      stats: (m) => [
        ["Total segments", String(m.segments)],
        ["Live", String(store().list("segments").filter((s) => /live|active/i.test(s.status || "")).length)],
        ["Draft", String(store().list("segments").filter((s) => /draft/i.test(s.status || "")).length)],
        ["Contacts in workspace", String(m.contacts)],
      ],
    },
    Inbound: {
      key: "inbound",
      kicker: "RECEIVING",
      copy: "Receive, parse and route email into your product.",
      icon: "mail",
      primary: "Add inbound route",
      stats: (m) => [
        ["Routes", String(m.inbound)],
        ["Active", String(store().list("inbound").filter((x) => /active/i.test(x.status || "")).length)],
        ["Messages received", "0"],
        ["Failed", "0"],
      ],
    },
    Domains: {
      key: "domains",
      kicker: "DELIVERABILITY",
      copy: "Authenticate sending domains and protect your reputation.",
      icon: "globe",
      primary: "Add domain",
      stats: (m) => [
        ["Sending domains", String(m.domains)],
        ["Verified", String(m.verifiedDomains)],
        ["Pending", String(m.domains - m.verifiedDomains)],
        ["Health", m.domains ? (m.verifiedDomains === m.domains ? "Good" : "Action needed") : "—"],
      ],
    },
    "API keys": {
      key: "keys",
      kicker: "DEVELOPER ACCESS",
      copy: "Create scoped credentials for applications and environments.",
      icon: "key",
      primary: "Create API key",
      stats: (m) => [
        ["Active keys", String(m.activeKeys)],
        ["Total keys", String(m.keys)],
        ["Requests today", String(store().list("logs").filter((l) => l.createdAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length)],
        ["Last activity", store().list("logs")[0] ? store().formatRelative(store().list("logs")[0].createdAt) : "—"],
      ],
    },
    Webhooks: {
      key: "webhooks",
      kicker: "EVENT DELIVERY",
      copy: "Deliver signed email events to your applications in real time.",
      icon: "hook",
      primary: "Add endpoint",
      stats: (m) => [
        ["Endpoints", String(m.webhooks)],
        ["Healthy", String(store().list("webhooks").filter((w) => /healthy|active/i.test(w.status || "")).length)],
        ["Paused", String(store().list("webhooks").filter((w) => /paused/i.test(w.status || "")).length)],
        ["Events logged", String(m.logs)],
      ],
    },
  };

  function head(title, c, actions = "") {
    return `<div class="pp-head"><div><small class="pp-kicker">${c.kicker}</small><h1>${title}</h1><p>${c.copy}</p></div><div class="pp-head-actions">${actions}<button class="pp-btn primary" data-pp-create>${I("plus")} ${c.primary}</button></div></div>`;
  }

  function stats(items) {
    return `<div class="pp-stats">${items
      .map(
        (x, i) =>
          `<article class="pp-card pp-stat"><div class="pp-stat-top"><span>${x[0]}</span><i>${I(["mail", "check", "eye", "spark"][i])}</i></div><b>${esc(x[1])}</b><small>Live workspace data</small></article>`
      )
      .join("")}</div>`;
  }

  function emptyState(title, primary) {
    return `<div class="pp-empty"><h3>No ${title.toLowerCase()} yet</h3><p>This workspace is empty. Create your first item to start building real data — nothing here is demo content.</p><p style="margin-top:12px"><button class="pp-btn primary" data-pp-create>${I("plus")} ${primary}</button></p></div>`;
  }

  function maskSecret(secret) {
    if (!secret) return "—";
    const s = String(secret);
    if (s.length <= 12) return `${s.slice(0, 4)}••••`;
    return `${s.slice(0, 10)}••••${s.slice(-4)}`;
  }

  function rowSubtitle(title, x) {
    if (title === "Contacts") return x.email || "";
    if (title === "API keys") return x.tokenMasked || maskSecret(x.secret) || x.scope || x.detail || "";
    if (title === "Webhooks") return x.detail || x.url || "";
    if (title === "Domains") return x.detail || x.name || "";
    return x.email || x.detail || "";
  }

  function rowMeta(title, x) {
    if (title === "Contacts") return x.source || "—";
    if (title === "API keys") return x.env || x.count || "—";
    if (title === "Webhooks") return x.env || x.count || "—";
    if (title === "Domains") return x.env || x.count || "—";
    return x.source || x.count || "—";
  }

  function copyText(text, success = "Copied") {
    const value = String(text || "");
    if (!value) {
      toast("Nothing to copy");
      return;
    }
    const done = () => toast(success);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(() => {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        done();
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      done();
    }
  }

  function secretRevealModal({ title, kicker, secret, note, extraHtml = "" }) {
    const m = modal(
      `<div class="pp-modal-icon">${I("key")}</div><h2>${esc(title)}</h2><p>${esc(kicker || "Copy this value now. You may not see the full secret again.")}</p><div class="pp-secret-box"><code data-secret-value>${esc(secret)}</code><button type="button" class="pp-btn primary" data-copy-secret>${I("copy")} Copy</button></div>${extraHtml ? `<div class="pp-detail" style="margin-top:14px">${extraHtml}</div>` : ""}<p class="pp-secret-note">${esc(note || "Store this securely. It is saved in this browser until the database is connected.")}</p><div class="pp-modal-actions"><button class="pp-btn primary" data-pp-close>Done</button></div>`,
      true
    );
    m.querySelector("[data-copy-secret]")?.addEventListener("click", () =>
      copyText(secret, "Copied to clipboard")
    );
    return m;
  }

  function domainDnsHtml(domain) {
    const d = domain || "yourdomain.com";
    const records = [
      ["TXT", `@ / ${d}`, `v=spf1 include:_spf.senditto.com ~all`],
      ["CNAME", `s1._domainkey.${d}`, `s1.dkim.senditto.com`],
      ["CNAME", `s2._domainkey.${d}`, `s2.dkim.senditto.com`],
      ["TXT", `_dmarc.${d}`, `v=DMARC1; p=none; rua=mailto:dmarc@${d}`],
    ];
    return records
      .map(
        ([type, host, value], i) =>
          `<div class="pp-detail-row pp-dns-row"><span><b>${esc(type)}</b><small>${esc(host)}</small></span><code data-dns-value="${esc(value)}">${esc(value)}</code><button type="button" class="pp-btn small" data-copy-dns="${i}">${I("copy")}</button></div>`
      )
      .join("");
  }

  function rows(title, c) {
    const items = store().list(c.key);
    const data = items.filter(
      (x) =>
        (filter === "All" || x.status === filter) &&
        `${x.name || ""} ${x.detail || ""} ${x.email || ""} ${x.tokenMasked || ""} ${x.scope || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
    );
    if (!items.length) return emptyState(title, c.primary);
    if (!data.length)
      return `<div class="pp-empty"><h3>No matching results</h3><p>Try another search or filter.</p></div>`;
    const col3 = title === "Contacts" ? "Source" : title === "API keys" ? "Environment" : title === "Webhooks" || title === "Domains" ? "Environment" : "Volume / scope";
    return `<section class="pp-card pp-table"><div class="pp-table-head"><span>${title === "Contacts" ? "Contact" : "Name"}</span><span>Status</span><span>${col3}</span><span>Last activity</span><span></span></div>${data
      .map((x) => {
        const id = x.id;
        return `<div class="pp-row"><div class="pp-row-main"><span class="pp-icon">${I(c.icon)}</span><div><b>${esc(x.name)}</b><small>${esc(rowSubtitle(title, x))}</small></div></div><span class="pp-badge ${/Active|Verified|Healthy|Subscribed|Live/i.test(x.status || "") ? "good" : /needed|Pending|Revoked/i.test(x.status || "") ? "warn" : "blue"}">${esc(x.status || "—")}</span><span>${esc(rowMeta(title, x))}</span><small>${esc(store().formatRelative(x.updatedAt || x.createdAt))}</small><button class="pp-more" data-pp-more="${esc(id)}" aria-label="Open actions">•••</button></div>`;
      })
      .join("")}<div class="pp-pagination"><span>Showing ${data.length} of ${items.length}</span><span>Live</span></div></section>`;
  }

  function listPage(title) {
    const c = configs[title];
    if (!c || !host()) return;
    activePage = title;
    const statuses = ["All", ...new Set(store().list(c.key).map((x) => x.status).filter(Boolean))];
    host().dataset.platformPage = title;
    host().innerHTML = `<div class="pp-page">${head(title, c, `<button class="pp-btn" data-pp-export>${I("download")} Export</button>`)}${stats(c.stats(store().metrics()))}<div class="pp-card pp-toolbar"><label class="pp-search">${I("search")}<input data-pp-search value="${esc(query)}" placeholder="Search ${title.toLowerCase()}"></label><select class="pp-select" data-pp-filter>${statuses
      .map((x) => `<option ${filter === x ? "selected" : ""}>${esc(x)}</option>`)
      .join("")}</select><button class="pp-btn" data-pp-refresh>${I("refresh")} Refresh</button></div>${rows(title, c)}</div>`;
    bindList(title, c);
  }

  function bindList(title, c) {
    const h = host();
    h.querySelector("[data-pp-search]")?.addEventListener("input", (e) => {
      query = e.target.value;
      listPage(title);
    });
    h.querySelector("[data-pp-filter]")?.addEventListener("change", (e) => {
      filter = e.target.value;
      listPage(title);
    });
    h.querySelectorAll("[data-pp-create]").forEach((b) => (b.onclick = () => editItem(title, c)));
    h.querySelector("[data-pp-export]")?.addEventListener("click", () => exportCsv(title, c));
    h.querySelector("[data-pp-refresh]")?.addEventListener("click", () => {
      toast(`${title} refreshed`);
      listPage(title);
    });
    h.querySelectorAll("[data-pp-more]").forEach(
      (b) => (b.onclick = () => itemDetail(title, c, b.dataset.ppMore))
    );
  }

  function fields(title, item = {}) {
    if (title === "Contacts") {
      return `<label><span class="pp-label-text">Full name</span><input class="pp-input" name="name" value="${esc(item.name)}" required></label><label><span class="pp-label-text">Email address</span><input class="pp-input" type="email" name="email" value="${esc(item.email)}" required></label><label><span class="pp-label-text">Status</span><select class="pp-input" name="status"><option ${item.status === "Subscribed" ? "selected" : ""}>Subscribed</option><option ${item.status === "Pending" ? "selected" : ""}>Pending</option><option ${item.status === "Unsubscribed" ? "selected" : ""}>Unsubscribed</option></select></label><label><span class="pp-label-text">Source</span><select class="pp-input" name="source"><option>Manual</option><option>API</option><option>Import</option><option>Form</option></select></label>`;
    }
    if (title === "API keys") {
      return `<label><span class="pp-label-text">Key name</span><input class="pp-input" name="name" value="${esc(item.name)}" placeholder="e.g. Production API" required></label><label><span class="pp-label-text">Scope</span><input class="pp-input" name="scope" value="${esc(item.scope || item.detail || "")}" placeholder="e.g. Full sending" required></label><label><span class="pp-label-text">Environment</span><select class="pp-input" name="env"><option ${item.env === "Production" || item.count === "Production" ? "selected" : ""}>Production</option><option ${item.env === "Staging" || item.count === "Staging" ? "selected" : ""}>Staging</option><option ${item.env === "Development" || item.count === "Development" ? "selected" : ""}>Development</option></select></label><label><span class="pp-label-text">Status</span><select class="pp-input" name="status"><option>Active</option><option>Revoked</option></select></label>`;
    }
    if (title === "Webhooks") {
      return `<label><span class="pp-label-text">Endpoint name</span><input class="pp-input" name="name" value="${esc(item.name)}" required></label><label class="full"><span class="pp-label-text">HTTPS endpoint URL</span><input class="pp-input" type="url" name="detail" value="${esc(item.detail)}" placeholder="https://your-app.com/webhooks/senditto" required></label><label><span class="pp-label-text">Status</span><select class="pp-input" name="status"><option>Healthy</option><option>Active</option><option>Paused</option></select></label><label><span class="pp-label-text">Environment</span><select class="pp-input" name="env"><option>Production</option><option>Staging</option><option>Development</option></select></label>`;
    }
    if (title === "Domains") {
      return `<label class="full"><span class="pp-label-text">Sending domain</span><input class="pp-input" name="name" value="${esc(item.name)}" placeholder="mail.yourdomain.com" required></label><label class="full"><span class="pp-label-text">Purpose</span><input class="pp-input" name="detail" value="${esc(item.detail)}" placeholder="Transactional sending" required></label><label><span class="pp-label-text">Status</span><select class="pp-input" name="status"><option>Pending</option><option>Verified</option><option>Action needed</option></select></label><label><span class="pp-label-text">Environment</span><select class="pp-input" name="env"><option>Production</option><option>Staging</option></select></label>`;
    }
    const names = {
      Segments: ["Segment name", "Rule description"],
      Inbound: ["Inbound address", "Destination / behaviour"],
    }[title] || ["Name", "Details"];
    return `<label><span class="pp-label-text">${names[0]}</span><input class="pp-input" name="name" value="${esc(item.name)}" required></label><label><span class="pp-label-text">${names[1]}</span><input class="pp-input" name="detail" value="${esc(item.detail)}" required></label><label><span class="pp-label-text">Status</span><select class="pp-input" name="status"><option>Active</option><option>Live</option><option>Draft</option><option>Paused</option></select></label><label><span class="pp-label-text">Notes</span><input class="pp-input" name="count" value="${esc(item.count || "")}" placeholder="Optional"></label>`;
  }

  function randomToken(prefix) {
    const raw = `${store().uid("tok")}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    return `${prefix}_${raw.replace(/[^a-z0-9]/gi, "").slice(0, 28)}`;
  }

  function editItem(title, c, item = null) {
    const m = modal(
      `<div class="pp-modal-icon">${I(c.icon)}</div><h2>${item ? "Edit" : "Create"} ${title === "Contacts" ? "contact" : title === "API keys" ? "API key" : title.replace(/s$/, "").toLowerCase()}</h2><p>Saved to this workspace. Data stays on this device until the database is connected.</p><form class="pp-form">${fields(title, item || {})}</form><div class="pp-modal-actions"><button class="pp-btn" data-pp-close>Cancel</button><button class="pp-btn primary" data-pp-save>${item ? "Save changes" : "Create"}</button></div>`
    );
    m.querySelector("[data-pp-save]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      let created = null;
      let reveal = null;

      if (title === "Contacts") {
        d.detail = d.email;
      }

      if (title === "API keys") {
        d.env = d.env || d.count || "Production";
        d.count = d.env;
        d.scope = d.scope || d.detail || "Sending";
        d.detail = d.scope;
        if (!item) {
          const prefix = d.env === "Production" ? "sk_live" : d.env === "Staging" ? "sk_test" : "sk_dev";
          d.secret = randomToken(prefix);
          d.tokenMasked = maskSecret(d.secret);
          d.status = d.status || "Active";
          reveal = { type: "api", secret: d.secret, name: d.name };
        } else {
          d.secret = item.secret;
          d.tokenMasked = item.tokenMasked || maskSecret(item.secret);
        }
      }

      if (title === "Webhooks") {
        d.env = d.env || d.count || "Production";
        d.count = d.env;
        if (!item) {
          d.signingSecret = randomToken("whsec");
          d.status = d.status || "Healthy";
          reveal = { type: "webhook", secret: d.signingSecret, name: d.name, url: d.detail };
        } else {
          d.signingSecret = item.signingSecret;
        }
      }

      if (title === "Domains") {
        d.env = d.env || d.count || "Production";
        d.count = d.env;
        if (!item) {
          d.status = d.status || "Pending";
          d.dns = {
            spf: `v=spf1 include:_spf.senditto.com ~all`,
            dkim1: `s1.dkim.senditto.com`,
            dkim2: `s2.dkim.senditto.com`,
            dmarc: `v=DMARC1; p=none; rua=mailto:dmarc@${d.name}`,
          };
          reveal = { type: "domain", domain: d.name, name: d.name };
        } else {
          d.dns = item.dns;
        }
      }

      if (item) {
        created = store().update(c.key, item.id, d);
      } else {
        created = store().add(c.key, d);
      }
      m.remove();
      listPage(title);

      if (reveal?.type === "api") {
        secretRevealModal({
          title: "API key created",
          kicker: `Copy your secret key for “${reveal.name}”. This is the only time the full key is shown in full.`,
          secret: reveal.secret,
          note: "Use Authorization: Bearer <key> on API requests. You can still open this key later from the list while local storage is available.",
        });
      } else if (reveal?.type === "webhook") {
        secretRevealModal({
          title: "Webhook created",
          kicker: `Signing secret for “${reveal.name}”. Verify webhook signatures with this value.`,
          secret: reveal.secret,
          note: `Endpoint: ${reveal.url}`,
        });
      } else if (reveal?.type === "domain") {
        const dnsModal = modal(
          `<div class="pp-modal-icon">${I("globe")}</div><h2>Domain added</h2><p>Add these DNS records for <b>${esc(reveal.domain)}</b>, then mark the domain verified when ready.</p><div class="pp-detail pp-dns-list">${domainDnsHtml(reveal.domain)}</div><div class="pp-modal-actions"><button class="pp-btn primary" data-pp-close>Done</button></div>`,
          true
        );
        dnsModal.querySelectorAll("[data-copy-dns]").forEach((btn) => {
          btn.onclick = () => {
            const code = btn.parentElement?.querySelector("[data-dns-value], code");
            copyText(code?.textContent || code?.dataset?.dnsValue || "", "DNS value copied");
          };
        });
      } else {
        toast(item ? "Updated" : "Created");
      }
    };
  }

  function itemDetail(title, c, id) {
    const x = store().list(c.key).find((i) => i.id === id);
    if (!x) return;
    const secretValue = x.secret || x.signingSecret || "";
    const secretLabel = title === "API keys" ? "API key" : title === "Webhooks" ? "Signing secret" : "Secret";
    const m = modal(
      `<div class="pp-modal-icon">${I(c.icon)}</div><h2>${esc(x.name)}</h2><p>${esc(rowSubtitle(title, x))}</p><div class="pp-detail">
        <div class="pp-detail-row"><span>Status</span><b>${esc(x.status || "—")}</b></div>
        <div class="pp-detail-row"><span>${title === "Contacts" ? "Source" : "Environment / scope"}</span><b>${esc(rowMeta(title, x))}</b></div>
        <div class="pp-detail-row"><span>Last activity</span><b>${esc(store().formatRelative(x.updatedAt || x.createdAt))}</b></div>
        ${secretValue ? `<div class="pp-detail-row"><span>${secretLabel}</span><b style="font-family:ui-monospace,monospace;word-break:break-all">${esc(secretValue)}</b></div>` : ""}
        ${title === "API keys" && secretValue ? `<div class="pp-detail-row"><span>Masked</span><b style="font-family:ui-monospace,monospace">${esc(x.tokenMasked || maskSecret(secretValue))}</b></div>` : ""}
        ${title === "Domains" ? `<div class="pp-detail-row"><span>DNS setup</span><b>${x.status === "Verified" ? "Verified" : "Pending records"}</b></div>` : ""}
      </div>
      ${title === "Domains" ? `<div class="pp-detail" style="margin-top:12px"><b style="display:block;margin-bottom:8px">DNS records</b>${domainDnsHtml(x.name)}</div>` : ""}
      <div class="pp-modal-actions">
        <button class="pp-btn danger" data-pp-delete>${I("trash")} Delete</button>
        ${secretValue ? `<button class="pp-btn" data-pp-copy-secret>${I("copy")} Copy ${title === "Webhooks" ? "secret" : "key"}</button>` : ""}
        ${title === "Domains" ? `<button class="pp-btn" data-pp-mark-verified>${I("check")} Mark verified</button>` : ""}
        <button class="pp-btn" data-pp-test>${I("play")} ${title === "Webhooks" ? "Send test" : title === "API keys" ? "Show usage" : "Inspect"}</button>
        <button class="pp-btn primary" data-pp-edit>${I("edit")} Edit</button>
      </div>`,
      true
    );
    m.querySelector("[data-pp-edit]").onclick = () => {
      m.remove();
      editItem(title, c, x);
    };
    m.querySelector("[data-pp-delete]").onclick = () => {
      store().remove(c.key, x.id);
      m.remove();
      listPage(title);
      toast("Deleted");
    };
    m.querySelector("[data-pp-copy-secret]")?.addEventListener("click", () =>
      copyText(secretValue, `${secretLabel} copied`)
    );
    m.querySelector("[data-pp-mark-verified]")?.addEventListener("click", () => {
      store().update(c.key, x.id, { status: "Verified" });
      m.remove();
      listPage(title);
      toast("Domain marked verified");
    });
    m.querySelectorAll("[data-copy-dns]").forEach((btn) => {
      btn.onclick = () => {
        const code = btn.parentElement?.querySelector("code");
        copyText(code?.textContent || "", "DNS value copied");
      };
    });
    m.querySelector("[data-pp-test]").onclick = () => {
      if (title === "Webhooks") {
        store().logEvent("success", "webhook.test", `Test event to ${x.name}`, { webhookId: x.id });
        toast("Test event logged");
      } else if (title === "API keys") {
        secretRevealModal({
          title: "Use this API key",
          kicker: "Example request header",
          secret: secretValue || x.tokenMasked || "",
          note: 'curl https://api.senditto.com/v1/emails -H "Authorization: Bearer <your-key>"',
          extraHtml: `<div class="pp-detail-row"><span>Environment</span><b>${esc(x.env || x.count || "—")}</b></div><div class="pp-detail-row"><span>Scope</span><b>${esc(x.scope || x.detail || "—")}</b></div>`,
        });
      } else toast("Record inspected");
    };
  }

  function automationPage() {
    const c = {
      kicker: "LIFECYCLE MESSAGING",
      copy: "Build event-driven journeys that react to customer behaviour.",
      primary: "Create automation",
    };
    const items = store().list("automations");
    const m = store().metrics();
    activePage = "Automations";
    host().dataset.platformPage = "Automations";
    host().innerHTML = `<div class="pp-page">${head("Automations", c)}${stats([
      ["Automations", String(m.automations)],
      ["Live", String(m.liveAutomations)],
      ["Draft", String(items.filter((a) => /draft/i.test(a.status || "")).length)],
      ["Entered", "0"],
    ])}<div class="pp-card pp-toolbar"><label class="pp-search">${I("search")}<input data-pp-auto-search placeholder="Search automations"></label></div><div class="pp-grid">${
      items.length
        ? items
            .map(
              (x) =>
                `<article class="pp-card pp-feature"><div class="pp-card-head"><span class="pp-icon">${I("route")}</span><span class="pp-badge ${/live|active/i.test(x.status || "") ? "good" : "blue"}">${esc(x.status || "Draft")}</span></div><h3>${esc(x.name)}</h3><p>${esc(x.detail || "")}</p><footer><span><b>${esc(x.count || "—")}</b><small>${esc(store().formatRelative(x.updatedAt))}</small></span><button class="pp-btn small" data-auto-open="${esc(x.id)}">Open builder</button></footer></article>`
            )
            .join("")
        : emptyState("automations", c.primary)
    }</div></div>`;
    const h = host();
    h.querySelectorAll("[data-pp-create]").forEach((b) => (b.onclick = () => automationEditor()));
    h.querySelectorAll("[data-auto-open]").forEach(
      (b) =>
        (b.onclick = () => {
          const item = items.find((x) => x.id === b.dataset.autoOpen);
          automationEditor(item);
        })
    );
    h.querySelector("[data-pp-auto-search]")?.addEventListener("input", (e) => {
      h.querySelectorAll(".pp-feature").forEach((x) => {
        x.hidden = !x.textContent.toLowerCase().includes(e.target.value.toLowerCase());
      });
    });
  }

  function automationEditor(item = null) {
    const m = modal(
      `<div class="pp-modal-icon">${I("route")}</div><h2>${item ? "Edit automation" : "Create automation"}</h2><p>Define the trigger, audience and actions for this journey.</p><form class="pp-form pp-form-stack"><label class="full"><span class="pp-label-text">Automation name</span><input class="pp-input" name="name" value="${esc(item?.name || "")}" placeholder="e.g. Welcome series" required></label><label class="full"><span class="pp-label-text">Trigger</span><select class="pp-input" name="detail"><option>Contact joins a segment</option><option>Custom event received</option><option>Email opened</option><option>Date or anniversary</option></select></label><label class="full"><span class="pp-label-text">Status</span><select class="pp-input" name="status"><option ${item?.status === "Draft" ? "selected" : ""}>Draft</option><option ${item?.status === "Live" ? "selected" : ""}>Live</option></select></label></form><div class="pp-modal-actions"><button class="pp-btn" data-pp-close>Cancel</button><button class="pp-btn primary" data-auto-save>Save automation</button></div>`,
      true
    );
    m.querySelector("[data-auto-save]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      d.count = item?.count || "0 steps";
      if (item) store().update("automations", item.id, d);
      else store().add("automations", d);
      m.remove();
      automationPage();
      toast("Automation saved");
    };
  }

  function logsPage() {
    const logs = store().list("logs");
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter((l) => (l.createdAt || "").startsWith(today));
    const success = logs.filter((l) => l.level === "success").length;
    const warnings = logs.filter((l) => l.level === "warning").length;
    const errors = logs.filter((l) => l.level === "error").length;
    activePage = "Logs";
    host().dataset.platformPage = "Logs";
    host().innerHTML = `<div class="pp-page">${head(
      "Logs",
      { kicker: "DEVELOPER OBSERVABILITY", copy: "Inspect API requests, webhook deliveries and system events.", primary: liveTail ? "Stop live tail" : "Live tail" },
      `<button class="pp-btn" data-log-export>${I("download")} Export logs</button>`
    )}${stats([
      ["Events today", String(todayLogs.length)],
      ["Successful", String(success)],
      ["Warnings", String(warnings)],
      ["Errors", String(errors)],
    ])}<div class="pp-card pp-toolbar"><label class="pp-search">${I("search")}<input data-log-search placeholder="Search event, message or ID"></label><select class="pp-select" data-log-level><option>All levels</option><option>success</option><option>warning</option><option>error</option><option>info</option></select><button class="pp-btn" data-log-refresh>${I("refresh")} Refresh</button></div><section class="pp-card" data-log-list>${
      logs.length
        ? logs
            .map((x) => {
              const level =
                x.level === "success"
                  ? "Success"
                  : x.level === "warning"
                    ? "Warning"
                    : x.level === "error"
                      ? "Error"
                      : "Info";
              return `<button class="pp-log-line" data-log-row="${esc(x.id)}" style="width:100%;border-left:0;border-right:0;background:#fff;text-align:left;cursor:pointer"><code>${esc(store().formatRelative(x.createdAt))}</code><b>${esc(x.event)}</b><span class="pp-badge ${level === "Success" ? "good" : level === "Warning" ? "warn" : level === "Error" ? "" : "blue"}">${level}</span><span>${esc(x.message || "")}</span><small>${esc(x.id)}</small></button>`;
            })
            .join("")
        : `<div class="pp-empty"><h3>No logs yet</h3><p>API activity, sends and webhook tests will appear here in real time.</p></div>`
    }</section></div>`;
    const h = host();
    const createBtn = h.querySelector("[data-pp-create]");
    if (createBtn) {
      createBtn.classList.toggle("primary", liveTail);
      createBtn.onclick = () => {
        liveTail = !liveTail;
        if (liveTail) {
          liveTimer = setInterval(() => {
            if (activePage === "Logs") logsPage();
          }, 4000);
          toast("Live tail on");
        } else {
          clearInterval(liveTimer);
          liveTimer = null;
          toast("Live tail off");
        }
        logsPage();
      };
    }
    h.querySelector("[data-log-export]")?.addEventListener("click", () => {
      const csv = [
        "time,level,event,message",
        ...logs.map(
          (x) =>
            `"${x.createdAt}","${x.level}","${x.event}","${String(x.message || "").replaceAll('"', '""')}"`
        ),
      ].join("\n");
      download("senditto-logs.csv", csv);
      toast("Logs exported");
    });
    h.querySelector("[data-log-refresh]")?.addEventListener("click", () => {
      toast("Logs refreshed");
      logsPage();
    });
    const apply = () => {
      const q = h.querySelector("[data-log-search]").value.toLowerCase();
      const level = h.querySelector("[data-log-level]").value;
      h.querySelectorAll("[data-log-row]").forEach((x) => {
        const matchQ = x.textContent.toLowerCase().includes(q);
        const matchL = level === "All levels" || x.textContent.toLowerCase().includes(level);
        x.hidden = !(matchQ && matchL);
      });
    };
    h.querySelector("[data-log-search]")?.addEventListener("input", apply);
    h.querySelector("[data-log-level]")?.addEventListener("change", apply);
    h.querySelectorAll("[data-log-row]").forEach((x) => {
      x.onclick = () => {
        const entry = logs.find((l) => l.id === x.dataset.logRow);
        if (!entry) return;
        modal(
          `<div class="pp-modal-icon">${I("terminal")}</div><h2>${esc(entry.event)}</h2><p>${esc(entry.message || "")}</p><div class="pp-detail"><div class="pp-detail-row"><span>ID</span><b>${esc(entry.id)}</b></div><div class="pp-detail-row"><span>Level</span><b>${esc(entry.level)}</b></div><div class="pp-detail-row"><span>Time</span><b>${esc(entry.createdAt)}</b></div></div><pre class="pp-code">${esc(JSON.stringify(entry.meta || {}, null, 2))}</pre><div class="pp-modal-actions"><button class="pp-btn" data-pp-copy>${I("copy")} Copy ID</button><button class="pp-btn primary" data-pp-close>Done</button></div>`
        ).querySelector("[data-pp-copy]").onclick = () => {
          navigator.clipboard?.writeText(entry.id);
          toast("Copied");
        };
      };
    });
  }

  function settingsPage() {
    const tabs = [
      ["profile", "Profile"],
      ["notifications", "Notifications"],
      ["security", "Security"],
      ["billing", "Plan & billing"],
      ["data", "Data & privacy"],
    ];
    const settings = store().get().settings;
    activePage = "Settings";
    host().dataset.platformPage = "Settings";
    host().innerHTML = `<div class="pp-page">${head("Settings", {
      kicker: "ACCOUNT CONTROL",
      copy: "Manage your Senditto account, security and preferences.",
      primary: "Save changes",
    })}<div class="pp-settings-layout"><aside class="pp-card pp-settings-nav">${tabs
      .map(
        (x) =>
          `<button class="${settingsTab === x[0] ? "active" : ""}" data-settings-tab="${x[0]}">${x[1]}</button>`
      )
      .join("")}</aside><main class="pp-card pp-panel">${settingsPanel(settings)}</main></div></div>`;
    const h = host();
    h.querySelectorAll("[data-settings-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          settingsTab = b.dataset.settingsTab;
          settingsPage();
        })
    );
    h.querySelector("[data-pp-create]")?.addEventListener("click", () => {
      if (settingsTab === "profile") {
        store().setSettings({
          displayName: h.querySelector('[name="displayName"]')?.value || "",
          email: h.querySelector('[name="email"]')?.value || "",
          language: h.querySelector('[name="language"]')?.value || "English",
          timezone: h.querySelector('[name="timezone"]')?.value || "",
        });
      }
      toast("Settings saved");
      settingsPage();
    });
    h.querySelectorAll(".pp-toggle").forEach((b) => {
      b.onclick = () => {
        const key = b.dataset.toggleKey;
        const group = b.dataset.toggleGroup;
        if (!key || !group) return;
        const current = store().get().settings[group] || {};
        store().setSettings({ [group]: { ...current, [key]: !current[key] } });
        settingsPage();
      };
    });
    h.querySelectorAll("[data-settings-action]").forEach(
      (b) => (b.onclick = () => settingsAction(b.dataset.settingsAction))
    );
  }

  function settingsPanel(settings) {
    if (settingsTab === "notifications") {
      const n = settings.notifications || {};
      return `<h2>Notification preferences</h2><p>Choose the operational and account updates you receive.</p>${switches(
        [
          ["deliveryIncidents", "Delivery incidents", "Important delivery degradation and outage alerts"],
          ["weeklyReport", "Weekly performance report", "A weekly summary of sending and engagement"],
          ["securityActivity", "Security activity", "New sign-ins, API key changes and sensitive actions"],
          ["productUpdates", "Product updates", "Relevant Senditto features and platform news"],
        ],
        "notifications",
        n
      )}`;
    }
    if (settingsTab === "security") {
      return `<h2>Security</h2><p>Protect this account. MFA and advanced controls will bind to the real auth service when connected.</p>${switches(
        [
          ["mfa", "Multi-factor authentication", "Require a second factor during sign in"],
          ["newDevice", "New device approval", "Confirm access from unrecognized devices"],
          ["sensitive", "Sensitive-action confirmation", "Re-authenticate before key and domain changes"],
        ],
        "securityPrefs",
        settings.securityPrefs || { mfa: false, newDevice: true, sensitive: true }
      )}<div class="pp-actions"><button class="pp-btn" data-settings-action="sessions">Manage sessions</button><button class="pp-btn" data-settings-action="password">Change password</button></div>`;
    }
    if (settingsTab === "billing") {
      const used = store().metrics().sent;
      const allowance = settings.monthlyAllowance || 50000;
      return `<h2>Plan and billing</h2><p>${esc(settings.plan || "Free")} plan · ${used} of ${allowance.toLocaleString()} emails used this month.</p><div class="pp-detail"><div class="pp-detail-row"><span>Current plan</span><b>${esc(settings.plan || "Free")}</b></div><div class="pp-detail-row"><span>Monthly allowance</span><b>${allowance.toLocaleString()} emails</b></div><div class="pp-detail-row"><span>Usage this month</span><b>${used}</b></div><div class="pp-detail-row"><span>Payment method</span><b>Not configured</b></div></div><div class="pp-actions" style="margin-top:16px"><button class="pp-btn primary" data-settings-action="plans">Compare plans</button><button class="pp-btn" data-settings-action="invoices">View invoices</button></div>`;
    }
    if (settingsTab === "data") {
      const p = settings.privacy || {};
      return `<h2>Data and privacy</h2><p>Control exports, retention and account-level privacy choices.</p>${switches(
        [
          ["analytics", "Privacy-aware analytics", "Use aggregated product analytics"],
          ["regional", "Regional data processing", "Keep processing in the selected workspace region"],
          ["diagnostics", "Diagnostic reporting", "Share anonymized error diagnostics"],
        ],
        "privacy",
        p
      )}<div class="pp-actions"><button class="pp-btn" data-settings-action="export">Export account data</button><button class="pp-btn danger" data-settings-action="delete">Delete account</button></div>`;
    }
    return `<h2>Profile</h2><p>Your personal account details. Leave blank until you connect identity.</p><div class="pp-form"><label>Display name<input class="pp-input" name="displayName" value="${esc(settings.displayName || "")}" placeholder="Your name"></label><label>Work email<input class="pp-input" name="email" type="email" value="${esc(settings.email || "")}" placeholder="you@yourcompany.com"></label><label>Language<select class="pp-input" name="language"><option>English</option><option>English (US)</option></select></label><label>Timezone<input class="pp-input" name="timezone" value="${esc(settings.timezone || "")}"></label></div>`;
  }

  function switches(items, group, values) {
    return `<div style="margin:18px 0">${items
      .map(
        ([key, title, copy]) =>
          `<div class="pp-switch-row"><div><b>${title}</b><small>${copy}</small></div><button class="pp-toggle ${values[key] ? "on" : ""}" data-toggle-group="${group}" data-toggle-key="${key}" aria-label="Toggle ${title}"><i></i></button></div>`
      )
      .join("")}</div>`;
  }

  function settingsAction(a) {
    if (a === "password") {
      const m = modal(
        `<div class="pp-modal-icon">${I("key")}</div><h2>Change password</h2><p>Password changes will activate when authentication is connected.</p><form class="pp-form"><label class="full">Current password<input class="pp-input" type="password" required></label><label>New password<input class="pp-input" type="password" required></label><label>Confirm password<input class="pp-input" type="password" required></label></form><div class="pp-modal-actions"><button class="pp-btn" data-pp-close>Cancel</button><button class="pp-btn primary" data-password-save>Update password</button></div>`
      );
      m.querySelector("[data-password-save]").onclick = () => {
        if (!m.querySelector("form").reportValidity()) return;
        m.remove();
        toast("Password update queued (auth pending)");
      };
    } else if (a === "sessions") {
      modal(
        `<div class="pp-modal-icon">${I("shield")}</div><h2>Active sessions</h2><p>No remote sessions yet. This device is the only local session.</p><div class="pp-row"><div class="pp-row-main"><span class="pp-icon">${I("shield")}</span><div><b>This browser</b><small>Local session · active now</small></div></div><span class="pp-badge good">Current</span></div><div class="pp-modal-actions"><button class="pp-btn primary" data-pp-close>Done</button></div>`,
        true
      );
    } else if (a === "export") {
      download("senditto-account-data.json", store().exportJson());
      toast("Account export created");
    } else if (a === "delete") {
      modal(
        `<div class="pp-modal-icon">${I("trash")}</div><h2>Delete account?</h2><p>Account deletion will be available when the backend is connected. Local data can be cleared now.</p><div class="pp-modal-actions"><button class="pp-btn danger" data-clear-local>Clear local data</button><button class="pp-btn primary" data-pp-close>Keep data</button></div>`
      ).querySelector("[data-clear-local]").onclick = (e) => {
        store().resetAll();
        e.target.closest(".pp-modal").remove();
        toast("Local platform data cleared");
        settingsPage();
      };
    } else if (a === "plans") {
      modal(
        `<div class="pp-modal-icon">${I("spark")}</div><h2>Compare plans</h2><p>Billing activates when the platform backend is connected.</p><div class="pp-grid">${[
          ["Free", "Starter volume", "Current"],
          ["Growth", "Higher volume", "Soon"],
          ["Platform", "Custom infrastructure", "Soon"],
        ]
          .map(
            (x) =>
              `<article class="pp-card pp-feature"><span class="pp-badge ${x[2] === "Current" ? "good" : "blue"}">${x[2]}</span><h3>${x[0]}</h3><p>${x[1]} · API, SMTP, campaigns, inbound and analytics.</p></article>`
          )
          .join("")}</div><div class="pp-modal-actions"><button class="pp-btn primary" data-pp-close>Done</button></div>`,
        true
      );
    } else if (a === "invoices") {
      modal(
        `<div class="pp-modal-icon">${I("download")}</div><h2>Invoices</h2><p>Billing documents for this account.</p><div class="pp-empty"><h3>No invoices yet</h3><p>No payment method is configured.</p></div><div class="pp-modal-actions"><button class="pp-btn primary" data-pp-close>Done</button></div>`
      );
    }
  }

  function helpPage() {
    activePage = "Help & docs";
    host().dataset.platformPage = "Help & docs";
    const guides = [
      ["Quickstart", "Send your first API email and verify delivery.", "terminal"],
      ["Domain authentication", "Configure SPF, DKIM and DMARC correctly.", "globe"],
      ["Campaigns and templates", "Create reusable designs and targeted campaigns.", "mail"],
      ["Inbound processing", "Receive, parse and route incoming messages.", "route"],
      ["Webhooks", "Verify signatures, retry events and inspect delivery.", "hook"],
      ["Security", "Protect workspaces, credentials and team access.", "shield"],
    ];
    host().innerHTML = `<div class="pp-page">${head(
      "Help & docs",
      {
        kicker: "SENDITTO KNOWLEDGE",
        copy: "Guides, API references and support for every part of the platform.",
        primary: "Contact support",
      },
      `<button class="pp-btn" data-doc-api>${I("terminal")} API reference</button>`
    )}<div class="pp-card pp-toolbar"><label class="pp-search">${I("search")}<input data-doc-search placeholder="Search documentation and guides"></label></div><div class="pp-grid" data-doc-grid>${guides
      .map(
        (x) =>
          `<article class="pp-card pp-feature"><span class="pp-icon">${I(x[2])}</span><h3>${x[0]}</h3><p>${x[1]}</p><button class="pp-btn small" data-doc-open="${x[0]}">Read guide</button></article>`
      )
      .join("")}</div></div>`;
    const h = host();
    const createBtn = h.querySelector("[data-pp-create]");
    if (createBtn) createBtn.onclick = () =>
      modal(
        `<div class="pp-modal-icon">${I("mail")}</div><h2>Contact Senditto support</h2><p>Describe the issue and include the affected workspace.</p><form class="pp-form"><label>Topic<select class="pp-input"><option>Technical support</option><option>Deliverability</option><option>Billing</option></select></label><label>Priority<select class="pp-input"><option>Normal</option><option>Urgent</option></select></label><label class="full">Message<textarea class="pp-input pp-textarea" required></textarea></label></form><div class="pp-modal-actions"><button class="pp-btn" data-pp-close>Cancel</button><button class="pp-btn primary" data-support-send>Submit request</button></div>`
      ).querySelector("[data-support-send]").onclick = (e) => {
        const form = e.target.closest(".pp-dialog").querySelector("form");
        if (!form.reportValidity()) return;
        store().logEvent("info", "support.request", "Support request prepared locally");
        e.target.closest(".pp-modal").remove();
        toast("Support request saved locally");
      };
    h.querySelector("[data-doc-api]")?.addEventListener("click", () => docGuide("API reference"));
    h.querySelectorAll("[data-doc-open]").forEach((b) => (b.onclick = () => docGuide(b.dataset.docOpen)));
    const docSearch = h.querySelector("[data-doc-search]");
    if (docSearch) docSearch.oninput = (e) =>
      h.querySelectorAll(".pp-feature").forEach((x) => {
        x.hidden = !x.textContent.toLowerCase().includes(e.target.value.toLowerCase());
      });
  }

  function docGuide(name) {
    modal(
      `<div class="pp-modal-icon">${I("terminal")}</div><h2>${esc(name)}</h2><p>A concise Senditto guide for the current workspace.</p><div class="pp-detail"><div class="pp-detail-row"><span>1</span><b>Choose the correct workspace and environment</b></div><div class="pp-detail-row"><span>2</span><b>Configure scoped credentials and domain identity</b></div><div class="pp-detail-row"><span>3</span><b>Test the workflow before production traffic</b></div><div class="pp-detail-row"><span>4</span><b>Monitor activity, events and delivery health</b></div></div><pre class="pp-code">curl https://api.senditto.com/v1/emails \\\n  -H "Authorization: Bearer $SENDITTO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"from":"you@yourdomain.com","to":["user@example.com"],"subject":"Hello","text":"Hi"}'</pre><div class="pp-modal-actions"><button class="pp-btn primary" data-pp-close>Done</button></div>`,
      true
    );
  }

  function modal(content, wide = false) {
    document.querySelector(".pp-modal")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="pp-modal"><button class="pp-backdrop" data-pp-close aria-label="Close"></button><section class="pp-dialog ${wide ? "wide" : ""}"><button class="pp-close" data-pp-close>${I("close")}</button>${content}</section></div>`
    );
    const m = document.querySelector(".pp-modal");
    m.querySelectorAll("[data-pp-close]").forEach((b) => (b.onclick = () => m.remove()));
    return m;
  }

  function exportCsv(title, c) {
    const items = store().list(c.key);
    if (!items.length) {
      toast("Nothing to export");
      return;
    }
    const keys = Object.keys(items[0]).filter((k) => k !== "secret" || title === "API keys");
    download(
      `senditto-${c.key}.csv`,
      [
        keys.join(","),
        ...items.map((x) => keys.map((k) => `"${String(x[k] ?? "").replaceAll('"', '""')}"`).join(",")),
      ].join("\n")
    );
    toast(`${title} export created`);
  }

  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function toast(t) {
    document.querySelector(".pp-toast")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="pp-toast">${I("check")} ${esc(t)}</div>`
    );
    setTimeout(() => document.querySelector(".pp-toast")?.remove(), 2200);
  }

  const pages = {
    Automations: automationPage,
    Contacts: () => listPage("Contacts"),
    Segments: () => listPage("Segments"),
    Inbound: () => listPage("Inbound"),
    "Inbound email": () => listPage("Inbound"),
    Domains: () => listPage("Domains"),
    "API keys": () => listPage("API keys"),
    Webhooks: () => listPage("Webhooks"),
    Logs: logsPage,
    "Developer logs": logsPage,
    Settings: settingsPage,
    "Workspace settings": settingsPage,
    "Help & docs": helpPage,
  };

  function render(name) {
    query = "";
    filter = "All";
    pages[name]?.();
  }

  // Register routes with stable platform router
  window.SendittoUI = window.SendittoUI || {};
  const map = {
    contacts: () => listPage("Contacts"),
    segments: () => listPage("Segments"),
    inbound: () => listPage("Inbound"),
    domains: () => listPage("Domains"),
    api: () => listPage("API keys"),
    webhooks: () => listPage("Webhooks"),
    automations: automationPage,
    logs: logsPage,
    settings: settingsPage,
    help: helpPage,
  };
  Object.assign(window.SendittoUI, map);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelector(".pp-modal")?.remove();
  });
  document.addEventListener("click", (e) => {
    if (e.target.classList?.contains("pp-backdrop")) e.target.closest(".pp-modal")?.remove();
  });
})();
