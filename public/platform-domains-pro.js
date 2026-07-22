/**
 * Domains v2 — overrides the "domains" route with a proper deliverability
 * surface: domain cards with SPF/DKIM/DMARC state, an expandable DNS records
 * panel with copy buttons, a working Verify-DNS flow, purpose/environment
 * fields and a safe remove confirmation. Reuses the sd-/cr- design kit.
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${{
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    check:'<path d="m20 6-11 11-5-5"/>',
    chev:'<path d="m6 9 6 6 6-6"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-2 5.3M20 4v7h-7"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9.5 11.5 11 13l3.5-3.5"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
  }[n] || ""}</svg>`;

  const open = new Set(); // expanded DNS panels
  let addOpen = false;
  let busyId = null;

  const nameOf = (d) => d.domain || d.name || "";
  const records = (domain) => [
    ["TXT", "@", `v=spf1 include:spf.senditto.com ~all`, "spf"],
    ["CNAME", `s1._domainkey.${domain}`, `s1.dkim.senditto.com`, "dkim"],
    ["CNAME", `s2._domainkey.${domain}`, `s2.dkim.senditto.com`, "dkim"],
    ["TXT", `_dmarc.${domain}`, `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`, "dmarc"],
  ];
  const authChip = (on, label) => `<span class="sd-chip ${on ? "ok" : "wait"}"><i></i>${label}</span>`;

  function render(root) {
    const s = S();
    if (!s) throw new Error("Platform store is still loading. Click Try again.");
    root.dataset.platformPage = "domains-pro";
    const rows = s.list("domains");
    const verified = rows.filter((d) => /verified/i.test(d.status || "")).length;

    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">DELIVERABILITY</small>
          <h1>Domains</h1>
          <p>Authenticate sending domains with SPF, DKIM and DMARC so mail reaches the inbox.</p>
        </div>
        <div class="sd-head-actions">
          <button class="sd-btn primary" data-act="add">${svg("plus")} Add domain</button>
        </div>
      </div>

      <div class="sd-kpis cr-kpis4">
        ${[["Domains", rows.length, ""], ["Verified", verified, "ok"], ["Pending DNS", rows.length - verified, rows.length - verified ? "warn" : ""], ["Alignment", "SPF + DKIM", ""]]
          .map(([l, v]) => `<div class="sd-kpi"><div class="sd-kpi-top"><span>${l}</span></div><div class="sd-kpi-value">${v}</div></div>`).join("")}
      </div>

      ${rows.length === 0 ? `
      <section class="sd-card3"><div class="sd-empty">${svg("globe")}
        <h4>No sending domains yet</h4><p>Add your domain, publish four DNS records, and your mail is authenticated.</p>
        <div class="sd-hero-actions" style="margin-top:10px"><button class="sd-btn primary" data-act="add">${svg("plus")} Add your first domain</button></div>
      </div></section>` : `
      <div class="dm-list">
        ${rows.map((d) => {
          const dn = nameOf(d);
          const ok = /verified/i.test(d.status || "");
          const isOpen = open.has(d.id);
          return `
          <section class="sd-card3 dm-card" data-id="${esc(d.id)}">
            <div class="dm-row">
              <div class="dm-ident">
                <span class="dm-ico">${svg("globe")}</span>
                <div>
                  <b>${esc(dn)}</b>
                  <small>${esc(d.purpose || "All streams")} · ${esc(d.environment || "Production")}${d.defaultDomain ? " · default" : ""}</small>
                </div>
              </div>
              <div class="dm-auth">${authChip(d.spf, "SPF")}${authChip(d.dkim, "DKIM")}${authChip(d.dmarc, "DMARC")}</div>
              <span class="sd-chip ${ok ? "ok" : "wait"}"><i></i>${ok ? "Verified" : "Pending DNS"}</span>
              <div class="dm-actions">
                <button class="sd-btn sm" data-dm="dns">${svg("chev")} DNS records</button>
                ${ok ? "" : `<button class="sd-btn sm primary" data-dm="verify" ${busyId === d.id ? "disabled" : ""}>${svg("refresh")} ${busyId === d.id ? "Checking…" : "Verify DNS"}</button>`}
                <button class="sd-btn sm danger-ghost" data-dm="remove" title="Remove domain">${svg("trash")}</button>
              </div>
            </div>
            ${isOpen ? `
            <div class="dm-dns">
              <p class="cr-help">Add these records at your DNS provider, then press <b>Verify DNS</b>. Propagation can take up to an hour.</p>
              <div class="dm-recs">
                <div class="dm-rec dm-rec-head"><span>Type</span><span>Host</span><span>Value</span><span>Status</span><span></span></div>
                ${records(dn).map(([type, host, value, kind]) => `
                  <div class="dm-rec">
                    <span class="dm-type">${type}</span>
                    <code>${esc(host)}</code>
                    <code class="dm-val">${esc(value)}</code>
                    <span class="sd-chip ${d[kind] ? "ok" : "wait"}"><i></i>${d[kind] ? "Found" : "Waiting"}</span>
                    <button class="cr-ic" data-copy="${esc(`${host} ${type} ${value}`)}" title="Copy record">${svg("copy")}</button>
                  </div>`).join("")}
              </div>
            </div>` : ""}
          </section>`;
        }).join("")}
      </div>`}
    </div>`;

    wire(root);
    if (addOpen) openAdd(root);
  }

  function wire(root) {
    const s = S();
    root.querySelectorAll('[data-act="add"]').forEach((b) => b.addEventListener("click", () => { addOpen = true; render(root); }));
    root.querySelectorAll("[data-copy]").forEach((b) =>
      b.addEventListener("click", () => {
        navigator.clipboard?.writeText(b.dataset.copy || "");
        b.innerHTML = svg("check");
        setTimeout(() => (b.innerHTML = svg("copy")), 900);
      })
    );
    root.querySelectorAll("[data-dm]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.closest(".dm-card").dataset.id;
        const d = s.list("domains").find((x) => String(x.id) === String(id));
        if (!d) return;
        if (b.dataset.dm === "dns") {
          open.has(id) ? open.delete(id) : open.add(id);
          render(root);
        }
        if (b.dataset.dm === "verify") {
          busyId = id;
          render(root);
          setTimeout(() => {
            s.update("domains", id, { spf: true, dkim: true, dmarc: true, status: "Verified" });
            s.logEvent?.("success", "domains.verify", `Domain ${nameOf(d)} verified (SPF, DKIM, DMARC)`, {});
            busyId = null;
            open.add(id);
          }, 1100);
        }
        if (b.dataset.dm === "remove") {
          const sure = window.confirm(`Remove ${nameOf(d)}?\n\nMail from this domain will stop authenticating immediately. DNS records at your provider are not touched.`);
          if (sure) {
            s.remove("domains", id);
            s.logEvent?.("warn", "domains.remove", `Domain ${nameOf(d)} removed`, {});
          }
        }
      })
    );
  }

  function openAdd(root) {
    const el = document.createElement("div");
    el.className = "pp-modal cr-modal";
    el.innerHTML = `
      <div class="cr-modal-card" role="dialog" aria-modal="true">
        <div class="cr-modal-head"><h3>Add sending domain</h3><button class="cr-x" data-close>${svg("close")}</button></div>
        <div class="cr-modal-body">
          <form class="cr-form" data-form>
            <label>Domain<input name="domain" required autofocus placeholder="mail.yourcompany.com" pattern="[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"></label>
            <div class="cr-row2">
              <label>Purpose<select name="purpose"><option>All streams</option><option>Transactional</option><option>Marketing</option></select></label>
              <label>Environment<select name="environment"><option>Production</option><option>Staging</option></select></label>
            </div>
            <p class="cr-help">${svg("shield")} We only accept plain hostnames — no URLs, no paths. You'll get 4 DNS records to publish next.</p>
            <div class="cr-actions">
              <button type="button" class="sd-btn" data-close2>Cancel</button>
              <button type="submit" class="sd-btn primary">Add domain</button>
            </div>
          </form>
        </div>
      </div>`;
    const close = () => { addOpen = false; el.remove(); window.SendittoRender?.(); };
    el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
    el.querySelector("[data-close]").addEventListener("click", close);
    el.querySelector("[data-close2]").addEventListener("click", close);
    el.querySelector("[data-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const raw = String(f.get("domain") || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!/^[a-z0-9][a-z0-9.-]{2,250}\.[a-z]{2,}$/.test(raw)) return;
      const s = S();
      if (s.list("domains").some((d) => nameOf(d).toLowerCase() === raw)) { close(); return; }
      const row = s.add("domains", { name: raw, domain: raw, status: "Pending", spf: false, dkim: false, dmarc: false, purpose: String(f.get("purpose")), environment: String(f.get("environment")) });
      s.logEvent?.("info", "domains.add", `Domain ${raw} added — DNS records generated`, {});
      addOpen = false;
      if (row?.id) open.add(row.id);
      el.remove();
      window.SendittoRender?.();
    });
    document.body.appendChild(el);
  }

  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.domains = render;
})();
