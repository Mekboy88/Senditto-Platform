/**
 * Audience & developer pages v2 — Contacts, Segments, Automations, Logs.
 * Loads after platform-pages.js and replaces its generic implementations with
 * purpose-built surfaces: CSV import/export and bulk actions for contacts, a
 * rule builder with live preview for segments, recipe-based automations and a
 * console-style developer log. Reuses the sd- design kit from the dashboard.
 */
(() => {
  const S = () => window.SendittoStore;
  function store() {
    const s = S();
    if (!s || typeof s.list !== "function") throw new Error("Platform store is still loading. Click Try again.");
    return s;
  }
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const icon = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
      {
        plus: '<path d="M12 5v14M5 12h14"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
        upload: '<path d="M12 15V3m-4 4 4-4 4 4"/><path d="M5 20h14"/>',
        download: '<path d="M12 3v12m-4-4 4 4 4-4"/><path d="M5 20h14"/>',
        trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
        edit: '<path d="m4 20 4-1 11-11-3-3L5 16Z"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        filter: '<path d="M4 5h16l-6 7v5l-4 2v-7Z"/>',
        play: '<path d="m8 5 11 7-11 7Z"/>',
        pause: '<path d="M9 5v14M15 5v14"/>',
        zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6Z"/>',
        copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
        chevron: '<path d="m9 6 6 6-6 6"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
        terminal: '<path d="m4 17 6-5-6-5M12 19h8"/>',
      }[n] || ""
    }</svg>`;

  const host = () => document.getElementById("senditto-platform-root");

  function chip(status) {
    const s = String(status || "").toLowerCase();
    const tone = /subscribed|live|active|verified|connected|completed/.test(s)
      ? "ok"
      : /pending|draft|scheduled|paused|processing/.test(s)
        ? "wait"
        : /unsubscribed|bounce|fail|error|revoked/.test(s)
          ? "bad"
          : "mut";
    return `<span class="sd-chip ${tone}">${esc(status || "—")}</span>`;
  }

  function download(filename, text, type = "text/plain") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- modal helper (pp-modal class pauses router re-renders) ---------- */
  function openModal(title, bodyHtml, { wide = false } = {}) {
    closeModal();
    const el = document.createElement("div");
    el.className = "pp-modal cr-modal";
    el.innerHTML = `
      <div class="cr-modal-card ${wide ? "wide" : ""}" role="dialog" aria-modal="true">
        <div class="cr-modal-head">
          <h3>${esc(title)}</h3>
          <button class="cr-x" type="button" data-close>${icon("close")}</button>
        </div>
        <div class="cr-modal-body">${bodyHtml}</div>
      </div>`;
    el.addEventListener("mousedown", (e) => {
      if (e.target === el) closeModal();
    });
    el.querySelector("[data-close]").addEventListener("click", closeModal);
    document.body.appendChild(el);
    return el;
  }
  function closeModal() {
    document.querySelectorAll(".cr-modal").forEach((m) => m.remove());
    window.SendittoRender?.();
  }

  /* ============================================================
     CONTACTS
     ============================================================ */
  const cState = { q: "", status: "All", selected: new Set() };

  function contactMatches(c) {
    if (cState.status !== "All" && c.status !== cState.status) return false;
    if (!cState.q) return true;
    const q = cState.q.toLowerCase();
    return [c.name, c.email, (c.tags || []).join(" "), c.location].join(" ").toLowerCase().includes(q);
  }

  function initials(name, email) {
    const src = name || email || "?";
    return src
      .split(/[\s.@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }

  function contactForm(c = {}) {
    return `
      <form class="cr-form" data-form="contact" data-id="${esc(c.id || "")}">
        <label>Full name<input name="name" value="${esc(c.name || "")}" placeholder="Ava Berg"></label>
        <label>Email<input name="email" type="email" required value="${esc(c.email || "")}" placeholder="ava@acme.dev"></label>
        <div class="cr-row2">
          <label>Status
            <select name="status">
              ${["Subscribed", "Pending", "Unsubscribed"].map((s) => `<option ${c.status === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </label>
          <label>Location<input name="location" value="${esc(c.location || "")}" placeholder="Berlin"></label>
        </div>
        <label>Tags <small>comma separated</small><input name="tags" value="${esc((c.tags || []).join(", "))}" placeholder="customer, vip"></label>
        <div class="cr-actions">
          <button type="button" class="sd-btn" data-close2>Cancel</button>
          <button type="submit" class="sd-btn primary">${c.id ? "Save contact" : "Add contact"}</button>
        </div>
      </form>`;
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const emailIdx = header.indexOf("email");
    const startRow = emailIdx >= 0 ? 1 : 0;
    const idx = {
      name: header.indexOf("name"),
      email: emailIdx,
      status: header.indexOf("status"),
      tags: header.indexOf("tags"),
      location: header.indexOf("location"),
    };
    const rows = [];
    for (let i = startRow; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const email = emailIdx >= 0 ? cols[idx.email] : cols.find((c) => c.includes("@"));
      if (!email || !email.includes("@")) continue;
      rows.push({
        name: idx.name >= 0 ? cols[idx.name] || "" : "",
        email,
        status: idx.status >= 0 && cols[idx.status] ? cols[idx.status] : "Subscribed",
        tags: idx.tags >= 0 && cols[idx.tags] ? cols[idx.tags].split(/[;|]/).map((t) => t.trim()).filter(Boolean) : [],
        location: idx.location >= 0 ? cols[idx.location] || "" : "",
      });
    }
    return rows;
  }

  function renderContacts(root) {
    const s = store();
    root.dataset.platformPage = "crm";
    const all = s.list("contacts");
    const rows = all.filter(contactMatches);
    const m = s.metrics();
    cState.selected = new Set([...cState.selected].filter((id) => all.some((c) => c.id === id)));

    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">AUDIENCE</small>
          <h1>Contacts</h1>
          <p>People your product and campaigns communicate with.</p>
        </div>
        <div class="sd-head-actions">
          <button class="sd-btn" data-act="import">${icon("upload")} Import CSV</button>
          <button class="sd-btn" data-act="export">${icon("download")} Export</button>
          <button class="sd-btn primary" data-act="add">${icon("plus")} Add contact</button>
        </div>
      </div>

      <div class="sd-kpis cr-kpis4">
        ${[["Total contacts", m.contacts], ["Subscribed", m.subscribed], ["Pending", all.filter((c) => c.status === "Pending").length], ["Unsubscribed", m.unsubscribed]]
          .map(([l, v]) => `<div class="sd-kpi"><div class="sd-kpi-top"><span>${l}</span></div><div class="sd-kpi-value">${v}</div></div>`)
          .join("")}
      </div>

      <section class="sd-card">
        <div class="cr-toolbar">
          <div class="cr-search">${icon("search")}<input placeholder="Search name, email, tag…" value="${esc(cState.q)}" data-search></div>
          <div class="cr-chips">
            ${["All", "Subscribed", "Pending", "Unsubscribed"].map((f) => `<button class="cr-chip ${cState.status === f ? "active" : ""}" data-filter="${f}">${f}</button>`).join("")}
          </div>
        </div>

        ${cState.selected.size ? `
          <div class="cr-bulkbar">
            <b>${cState.selected.size} selected</b>
            <button class="sd-btn sm" data-act="export-selected">${icon("download")} Export</button>
            <button class="sd-btn sm" data-act="unsubscribe-selected" data-bulk-status="Unsubscribed">Unsubscribe</button>
            <button class="sd-btn sm danger" data-act="delete-selected">${icon("trash")} Delete</button>
            <button class="sd-btn sm ghost" data-act="clear-sel">Clear</button>
          </div>` : ""}

        ${all.length === 0 ? `
          <div class="sd-empty">${icon("users")}
            <h4>No contacts yet</h4>
            <p>Add your first contact or import a CSV — campaigns and segments build on this list.</p>
            <div class="sd-hero-actions" style="margin-top:10px">
              <button class="sd-btn primary" data-act="add">${icon("plus")} Add contact</button>
              <button class="sd-btn" data-act="import">${icon("upload")} Import CSV</button>
            </div>
          </div>`
        : rows.length === 0 ? `<div class="sd-empty sm"><p>No contacts match “${esc(cState.q || cState.status)}”.</p></div>`
        : `
          <table class="sd-table cr-table">
            <thead><tr>
              <th class="cr-cb"><input type="checkbox" data-selall ${rows.length && rows.every((r) => cState.selected.has(r.id)) ? "checked" : ""}></th>
              <th>Contact</th><th>Status</th><th>Tags</th><th>Location</th><th>Last activity</th><th></th>
            </tr></thead>
            <tbody>
              ${rows.map((c) => `
                <tr data-id="${esc(c.id)}">
                  <td class="cr-cb"><input type="checkbox" data-sel ${cState.selected.has(c.id) ? "checked" : ""}></td>
                  <td>
                    <div class="cr-person">
                      <span class="cr-avatar">${esc(initials(c.name, c.email))}</span>
                      <span><b>${esc(c.name || "—")}</b><small>${esc(c.email)}</small></span>
                    </div>
                  </td>
                  <td>${chip(c.status)}</td>
                  <td>${(c.tags || []).map((t) => `<span class="cr-tag">${esc(t)}</span>`).join("") || '<span class="sd-mut">—</span>'}</td>
                  <td class="sd-mut">${esc(c.location || "—")}</td>
                  <td class="sd-mut">${esc(s.formatRelative?.(c.lastActivity || c.createdAt) || "—")}</td>
                  <td class="cr-rowact">
                    <button class="cr-ic" title="Edit" data-row="edit">${icon("edit")}</button>
                    <button class="cr-ic" title="Copy email" data-row="copy">${icon("copy")}</button>
                    <button class="cr-ic danger" title="Delete" data-row="del">${icon("trash")}</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>`}
      </section>
    </div>`;

    wireContacts(root, rows);
  }

  function wireContacts(root, rows) {
    const s = store();
    root.querySelector("[data-search]")?.addEventListener("input", (e) => {
      cState.q = e.target.value;
      renderContacts(root);
      const inp = root.querySelector("[data-search]");
      inp?.focus();
      inp?.setSelectionRange(inp.value.length, inp.value.length);
    });
    root.querySelectorAll("[data-filter]").forEach((b) =>
      b.addEventListener("click", () => {
        cState.status = b.dataset.filter;
        renderContacts(root);
      })
    );
    root.querySelector("[data-selall]")?.addEventListener("change", (e) => {
      rows.forEach((r) => (e.target.checked ? cState.selected.add(r.id) : cState.selected.delete(r.id)));
      renderContacts(root);
    });
    root.querySelectorAll("[data-sel]").forEach((cb) =>
      cb.addEventListener("change", (e) => {
        const id = e.target.closest("tr").dataset.id;
        e.target.checked ? cState.selected.add(id) : cState.selected.delete(id);
        renderContacts(root);
      })
    );
    root.querySelectorAll("[data-row]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.closest("tr").dataset.id;
        const c = s.list("contacts").find((x) => x.id === id);
        if (!c) return;
        if (btn.dataset.row === "copy") navigator.clipboard?.writeText(c.email || "");
        if (btn.dataset.row === "del") {
          s.remove("contacts", id);
          cState.selected.delete(id);
        }
        if (btn.dataset.row === "edit") {
          const modal = openModal("Edit contact", contactForm(c));
          wireContactForm(modal);
        }
      })
    );
    root.querySelector('[data-act="add"]')?.addEventListener("click", () => {
      const modal = openModal("Add contact", contactForm());
      wireContactForm(modal);
    });
    root.querySelector('[data-act="export"]')?.addEventListener("click", () => exportContacts(s.list("contacts")));
    root.querySelector('[data-act="export-selected"]')?.addEventListener("click", () =>
      exportContacts(s.list("contacts").filter((c) => cState.selected.has(c.id)))
    );
    root.querySelector('[data-act="delete-selected"]')?.addEventListener("click", () => {
      [...cState.selected].forEach((id) => s.remove("contacts", id));
      cState.selected.clear();
    });
    root.querySelector("[data-bulk-status]")?.addEventListener("click", (e) => {
      const status = e.currentTarget.dataset.bulkStatus;
      [...cState.selected].forEach((id) => s.update("contacts", id, { status }));
      cState.selected.clear();
    });
    root.querySelector('[data-act="clear-sel"]')?.addEventListener("click", () => {
      cState.selected.clear();
      renderContacts(root);
    });
    root.querySelector('[data-act="import"]')?.addEventListener("click", () => {
      const modal = openModal("Import contacts from CSV", `
        <p class="cr-help">Paste CSV below or choose a file. Recognised columns: <code>name, email, status, tags, location</code> (tags separated by <code>;</code>).</p>
        <input type="file" accept=".csv,text/csv" data-csvfile class="cr-file">
        <textarea class="cr-textarea" data-csvtext rows="8" placeholder="name,email,status,tags,location&#10;Ava Berg,ava@acme.dev,Subscribed,customer;vip,Berlin"></textarea>
        <div class="cr-actions">
          <button type="button" class="sd-btn" data-close2>Cancel</button>
          <button type="button" class="sd-btn primary" data-doimport>Import contacts</button>
        </div>`);
      modal.querySelector("[data-csvfile]").addEventListener("change", async (e) => {
        const f = e.target.files?.[0];
        if (f) modal.querySelector("[data-csvtext]").value = await f.text();
      });
      modal.querySelector("[data-doimport]").addEventListener("click", () => {
        const parsed = parseCsv(modal.querySelector("[data-csvtext]").value);
        const existing = new Set(store().list("contacts").map((c) => (c.email || "").toLowerCase()));
        let added = 0;
        for (const row of parsed) {
          if (existing.has(row.email.toLowerCase())) continue;
          store().add("contacts", row);
          added++;
        }
        closeModal();
        store().logEvent?.("info", "contacts.import", `Imported ${added} contact${added === 1 ? "" : "s"} from CSV`, { parsed: parsed.length, added });
      });
      modal.querySelector("[data-close2]")?.addEventListener("click", closeModal);
    });
  }

  function exportContacts(list) {
    const csv = ["name,email,status,tags,location"]
      .concat(list.map((c) => [c.name, c.email, c.status, (c.tags || []).join(";"), c.location].map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")))
      .join("\n");
    download("senditto-contacts.csv", csv, "text/csv");
  }

  function wireContactForm(modal) {
    modal.querySelector("[data-close2]")?.addEventListener("click", closeModal);
    modal.querySelector('[data-form="contact"]').addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const payload = {
        name: String(f.get("name") || "").trim(),
        email: String(f.get("email") || "").trim(),
        status: String(f.get("status") || "Subscribed"),
        location: String(f.get("location") || "").trim(),
        tags: String(f.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean),
      };
      const id = e.target.dataset.id;
      if (id) store().update("contacts", id, payload);
      else store().add("contacts", { ...payload, lastActivity: new Date().toISOString() });
      closeModal();
    });
  }

  /* ============================================================
     SEGMENTS
     ============================================================ */
  const FIELDS = [
    ["status", "Status"],
    ["tags", "Tag"],
    ["location", "Location"],
    ["email", "Email"],
    ["lastActivity", "Last activity"],
  ];
  const OPS = {
    status: [["is", "is"], ["is_not", "is not"]],
    tags: [["contains", "contains"], ["not_contains", "does not contain"]],
    location: [["is", "is"], ["contains", "contains"]],
    email: [["contains", "contains"], ["ends_with", "ends with"]],
    lastActivity: [["newer_than_days", "within days"], ["older_than_days", "older than days"]],
  };

  function evalRule(c, r) {
    const val = String(r.value ?? "").toLowerCase();
    const get = (k) => String(c[k] ?? "").toLowerCase();
    switch (r.field) {
      case "status": return r.op === "is" ? get("status") === val : get("status") !== val;
      case "tags": {
        const has = (c.tags || []).some((t) => t.toLowerCase().includes(val));
        return r.op === "contains" ? has : !has;
      }
      case "location": return r.op === "is" ? get("location") === val : get("location").includes(val);
      case "email": return r.op === "contains" ? get("email").includes(val) : get("email").endsWith(val);
      case "lastActivity": {
        const days = Number(r.value) || 0;
        const ts = new Date(c.lastActivity || c.createdAt || 0).getTime();
        const age = (Date.now() - ts) / 86400000;
        return r.op === "older_than_days" ? age > days : age <= days;
      }
      default: return true;
    }
  }
  function segmentCount(seg, contacts) {
    const rules = seg.rules || [];
    if (!rules.length) return contacts.length;
    return contacts.filter((c) => rules.every((r) => evalRule(c, r))).length;
  }

  function ruleRow(r = { field: "status", op: "is", value: "" }) {
    return `
      <div class="cr-rule">
        <select data-rf>${FIELDS.map(([v, l]) => `<option value="${v}" ${r.field === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <select data-ro>${(OPS[r.field] || OPS.status).map(([v, l]) => `<option value="${v}" ${r.op === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <input data-rv value="${esc(r.value ?? "")}" placeholder="value">
        <button type="button" class="cr-ic danger" data-rdel>${icon("trash")}</button>
      </div>`;
  }

  function segmentModal(seg = {}) {
    const modal = openModal(seg.id ? "Edit segment" : "Create segment", `
      <form class="cr-form" data-form="segment" data-id="${esc(seg.id || "")}">
        <label>Name<input name="name" required value="${esc(seg.name || "")}" placeholder="Active customers"></label>
        <label>Description<input name="description" value="${esc(seg.description || "")}" placeholder="Who belongs here and why"></label>
        <label>Status
          <select name="status">${["Live", "Draft"].map((s) => `<option ${seg.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
        </label>
        <div class="cr-rules-head"><b>Match all rules</b>
          <button type="button" class="sd-btn sm" data-addrule>${icon("plus")} Add rule</button>
        </div>
        <div class="cr-rules" data-rules>${(seg.rules && seg.rules.length ? seg.rules : [{ field: "status", op: "is", value: "Subscribed" }]).map(ruleRow).join("")}</div>
        <div class="cr-preview" data-preview></div>
        <div class="cr-actions">
          <button type="button" class="sd-btn" data-close2>Cancel</button>
          <button type="submit" class="sd-btn primary">${seg.id ? "Save segment" : "Create segment"}</button>
        </div>
      </form>`, { wide: true });

    const rulesEl = modal.querySelector("[data-rules]");
    const readRules = () =>
      [...rulesEl.querySelectorAll(".cr-rule")].map((row) => ({
        field: row.querySelector("[data-rf]").value,
        op: row.querySelector("[data-ro]").value,
        value: row.querySelector("[data-rv]").value,
      }));
    const preview = () => {
      const contacts = store().list("contacts");
      const n = segmentCount({ rules: readRules() }, contacts);
      modal.querySelector("[data-preview]").innerHTML =
        `${icon("users")} <b>${n}</b> of ${contacts.length} contacts match right now`;
    };
    const wireRow = (row) => {
      row.querySelector("[data-rf]").addEventListener("change", (e) => {
        const ops = OPS[e.target.value] || [];
        row.querySelector("[data-ro]").innerHTML = ops.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
        preview();
      });
      row.querySelector("[data-ro]").addEventListener("change", preview);
      row.querySelector("[data-rv]").addEventListener("input", preview);
      row.querySelector("[data-rdel]").addEventListener("click", () => {
        row.remove();
        preview();
      });
    };
    rulesEl.querySelectorAll(".cr-rule").forEach(wireRow);
    modal.querySelector("[data-addrule]").addEventListener("click", () => {
      rulesEl.insertAdjacentHTML("beforeend", ruleRow());
      wireRow(rulesEl.lastElementChild);
      preview();
    });
    preview();

    modal.querySelector("[data-close2]").addEventListener("click", closeModal);
    modal.querySelector('[data-form="segment"]').addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const payload = {
        name: String(f.get("name") || "").trim(),
        description: String(f.get("description") || "").trim(),
        status: String(f.get("status") || "Draft"),
        rules: readRules().filter((r) => r.value !== ""),
      };
      const id = e.target.dataset.id;
      if (id) store().update("segments", id, payload);
      else store().add("segments", payload);
      closeModal();
    });
  }

  function renderSegments(root) {
    const s = store();
    root.dataset.platformPage = "crm";
    const segments = s.list("segments");
    const contacts = s.list("contacts");

    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">AUDIENCE INTELLIGENCE</small>
          <h1>Segments</h1>
          <p>Precise, reusable audiences built from contact data — always up to date.</p>
        </div>
        <div class="sd-head-actions">
          <button class="sd-btn primary" data-act="add">${icon("plus")} Create segment</button>
        </div>
      </div>

      ${segments.length === 0 ? `
        <section class="sd-card"><div class="sd-empty">${icon("filter")}
          <h4>No segments yet</h4>
          <p>Segments are saved filters over your contacts — target campaigns without exporting lists.</p>
          <div class="sd-hero-actions" style="margin-top:10px">
            <button class="sd-btn primary" data-act="add">${icon("plus")} Create your first segment</button>
          </div>
        </div></section>`
      : `
        <div class="cr-cards">
          ${segments.map((seg) => {
            const n = segmentCount(seg, contacts);
            const pct = contacts.length ? Math.round((n / contacts.length) * 100) : 0;
            return `
            <section class="sd-card cr-seg" data-id="${esc(seg.id)}">
              <div class="cr-card-top">
                <h3>${esc(seg.name)}</h3>
                ${chip(seg.status)}
              </div>
              <p class="cr-desc">${esc(seg.description || "No description")}</p>
              <div class="cr-seg-count"><b>${n}</b><span>contacts · ${pct}% of audience</span></div>
              <div class="sd-progress"><i style="width:${pct}%"></i></div>
              <div class="cr-rules-sum">
                ${(seg.rules || []).map((r) => `<code>${esc(FIELDS.find(([v]) => v === r.field)?.[1] || r.field)} ${esc((OPS[r.field] || []).find(([v]) => v === r.op)?.[1] || r.op)} “${esc(r.value)}”</code>`).join("") || '<span class="sd-mut">Matches everyone</span>'}
              </div>
              <div class="cr-card-actions">
                <button class="sd-btn sm" data-seg="edit">${icon("edit")} Edit</button>
                <button class="sd-btn sm" data-seg="dup">${icon("copy")} Duplicate</button>
                <button class="sd-btn sm danger" data-seg="del">${icon("trash")}</button>
              </div>
            </section>`;
          }).join("")}
        </div>`}
    </div>`;

    root.querySelector('[data-act="add"]')?.addEventListener("click", () => segmentModal());
    root.querySelectorAll("[data-seg]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.closest(".cr-seg").dataset.id;
        const seg = s.list("segments").find((x) => x.id === id);
        if (!seg) return;
        if (btn.dataset.seg === "edit") segmentModal(seg);
        if (btn.dataset.seg === "dup") s.add("segments", { ...seg, id: undefined, name: `${seg.name} (copy)`, createdAt: undefined });
        if (btn.dataset.seg === "del") s.remove("segments", id);
      })
    );
  }

  /* ============================================================
     AUTOMATIONS
     ============================================================ */
  const TRIGGERS = [
    ["contact.created", "Contact created"],
    ["contact.subscribed", "Contact subscribed"],
    ["otp.not_verified_5m", "OTP not verified after 5 min"],
    ["segment.entered", "Contact enters a segment"],
    ["email.bounced", "Email bounced"],
    ["campaign.finished", "Campaign finished"],
  ];
  const RECIPES = [
    { name: "Welcome series", trigger: "contact.created", steps: 3, description: "3-step onboarding drip over the first week." },
    { name: "OTP fallback resend", trigger: "otp.not_verified_5m", steps: 1, description: "Resend a verification code once after 5 minutes." },
    { name: "Win-back", trigger: "segment.entered", steps: 2, description: "Two re-engagement touches, then stop." },
  ];

  function automationModal(a = {}) {
    const modal = openModal(a.id ? "Edit automation" : "New automation", `
      <form class="cr-form" data-form="automation" data-id="${esc(a.id || "")}">
        <label>Name<input name="name" required value="${esc(a.name || "")}" placeholder="Welcome series"></label>
        <label>Trigger
          <select name="trigger">${TRIGGERS.map(([v, l]) => `<option value="${v}" ${a.trigger === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        </label>
        <div class="cr-row2">
          <label>Steps<input name="steps" type="number" min="1" max="20" value="${esc(a.steps || 1)}"></label>
          <label>Status
            <select name="status">${["Live", "Paused", "Draft"].map((s) => `<option ${a.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
          </label>
        </div>
        <label>Description<textarea name="description" rows="3" class="cr-textarea" placeholder="What this automation does">${esc(a.description || "")}</textarea></label>
        <div class="cr-actions">
          <button type="button" class="sd-btn" data-close2>Cancel</button>
          <button type="submit" class="sd-btn primary">${a.id ? "Save automation" : "Create automation"}</button>
        </div>
      </form>`);
    modal.querySelector("[data-close2]").addEventListener("click", closeModal);
    modal.querySelector('[data-form="automation"]').addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const payload = {
        name: String(f.get("name") || "").trim(),
        trigger: String(f.get("trigger")),
        steps: Number(f.get("steps")) || 1,
        status: String(f.get("status")),
        description: String(f.get("description") || "").trim(),
      };
      const id = e.target.dataset.id;
      if (id) store().update("automations", id, payload);
      else store().add("automations", { entered: 0, completed: 0, ...payload });
      closeModal();
    });
  }

  function renderAutomations(root) {
    const s = store();
    root.dataset.platformPage = "crm";
    const autos = s.list("automations");

    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">LIFECYCLE</small>
          <h1>Automations</h1>
          <p>Event-driven email journeys that run on their own.</p>
        </div>
        <div class="sd-head-actions">
          <button class="sd-btn primary" data-act="add">${icon("plus")} New automation</button>
        </div>
      </div>

      ${autos.length === 0 ? `
        <section class="sd-card">
          <div class="sd-empty">${icon("zap")}
            <h4>No automations yet</h4>
            <p>Start from a proven recipe — you can adjust every step afterwards.</p>
          </div>
          <div class="cr-recipes">
            ${RECIPES.map((r, i) => `
              <button class="cr-recipe" data-recipe="${i}">
                <b>${icon("zap")} ${esc(r.name)}</b>
                <span>${esc(r.description)}</span>
                <small>${esc(TRIGGERS.find(([v]) => v === r.trigger)?.[1] || r.trigger)} · ${r.steps} step${r.steps > 1 ? "s" : ""}</small>
              </button>`).join("")}
          </div>
        </section>`
      : `
        <div class="cr-cards">
          ${autos.map((a) => {
            const rate = a.entered ? Math.round(((a.completed || 0) / a.entered) * 100) : 0;
            const live = /live|active/i.test(a.status || "");
            return `
            <section class="sd-card cr-seg" data-id="${esc(a.id)}">
              <div class="cr-card-top"><h3>${esc(a.name)}</h3>${chip(a.status)}</div>
              <p class="cr-desc">${esc(a.description || "")}</p>
              <div class="cr-auto-meta">
                <span>${icon("zap")} ${esc(TRIGGERS.find(([v]) => v === a.trigger)?.[1] || a.trigger || "—")}</span>
                <span>${a.steps || 1} step${(a.steps || 1) > 1 ? "s" : ""}</span>
              </div>
              <div class="cr-seg-count"><b>${a.entered || 0}</b><span>entered · ${a.completed || 0} completed (${rate}%)</span></div>
              <div class="sd-progress"><i style="width:${rate}%"></i></div>
              <div class="cr-card-actions">
                <button class="sd-btn sm" data-auto="toggle">${live ? `${icon("pause")} Pause` : `${icon("play")} Go live`}</button>
                <button class="sd-btn sm" data-auto="edit">${icon("edit")} Edit</button>
                <button class="sd-btn sm danger" data-auto="del">${icon("trash")}</button>
              </div>
            </section>`;
          }).join("")}
        </div>`}
    </div>`;

    root.querySelector('[data-act="add"]')?.addEventListener("click", () => automationModal());
    root.querySelectorAll("[data-recipe]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const r = RECIPES[Number(btn.dataset.recipe)];
        if (r) automationModal({ ...r, status: "Draft" });
      })
    );
    root.querySelectorAll("[data-auto]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.closest(".cr-seg").dataset.id;
        const a = s.list("automations").find((x) => x.id === id);
        if (!a) return;
        if (btn.dataset.auto === "edit") automationModal(a);
        if (btn.dataset.auto === "del") s.remove("automations", id);
        if (btn.dataset.auto === "toggle")
          s.update("automations", id, { status: /live|active/i.test(a.status || "") ? "Paused" : "Live" });
      })
    );
  }

  /* ============================================================
     DEVELOPER LOGS
     ============================================================ */
  const lState = { q: "", level: "All", open: new Set() };

  function renderLogs(root) {
    const s = store();
    root.dataset.platformPage = "crm";
    const all = s.list("logs");
    const rows = all.filter((l) => {
      if (lState.level !== "All" && String(l.level || "info").toLowerCase() !== lState.level.toLowerCase()) return false;
      if (!lState.q) return true;
      return JSON.stringify(l).toLowerCase().includes(lState.q.toLowerCase());
    });

    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">DEVELOPER</small>
          <h1>Logs</h1>
          <p>Every API request and platform event in your workspace.</p>
        </div>
        <div class="sd-head-actions">
          <button class="sd-btn" data-act="export">${icon("download")} Export JSON</button>
          <button class="sd-btn danger-ghost" data-act="clear">${icon("trash")} Clear logs</button>
        </div>
      </div>

      <section class="sd-card cr-console">
        <div class="cr-toolbar">
          <div class="cr-search">${icon("search")}<input placeholder="Search event, message, request id…" value="${esc(lState.q)}" data-search></div>
          <div class="cr-chips">
            ${["All", "Info", "Success", "Error", "Warn"].map((f) => `<button class="cr-chip ${lState.level === f ? "active" : ""}" data-level="${f}">${f}</button>`).join("")}
          </div>
        </div>

        ${all.length === 0 ? `<div class="sd-empty">${icon("terminal")}<h4>No logs yet</h4><p>API requests and workspace events stream in here.</p></div>`
        : rows.length === 0 ? `<div class="sd-empty sm"><p>No log lines match.</p></div>`
        : `
          <div class="cr-loglist">
            ${rows.slice(0, 200).map((l) => {
              const lvl = String(l.level || "info").toLowerCase();
              const open = lState.open.has(l.id);
              return `
              <div class="cr-log ${open ? "open" : ""}" data-id="${esc(l.id)}">
                <button class="cr-log-line" data-toggle>
                  <span class="cr-log-chev">${icon("chevron")}</span>
                  <span class="cr-lvl ${lvl}">${esc(lvl.toUpperCase())}</span>
                  <code class="cr-log-event">${esc(l.event || "event")}</code>
                  <span class="cr-log-msg">${esc(l.message || "")}</span>
                  <time>${esc(s.formatRelative?.(l.createdAt) || "")}</time>
                </button>
                ${open ? `<pre class="cr-log-json">${esc(JSON.stringify({ id: l.id, at: l.createdAt, level: l.level, event: l.event, message: l.message, detail: l.detail || l.meta || null }, null, 2))}</pre>` : ""}
              </div>`;
            }).join("")}
          </div>
          ${rows.length > 200 ? `<p class="sd-mut" style="margin:10px 4px 0">Showing the latest 200 of ${rows.length} lines. Export for the full history.</p>` : ""}`}
      </section>
    </div>`;

    root.querySelector("[data-search]")?.addEventListener("input", (e) => {
      lState.q = e.target.value;
      renderLogs(root);
      const inp = root.querySelector("[data-search]");
      inp?.focus();
      inp?.setSelectionRange(inp.value.length, inp.value.length);
    });
    root.querySelectorAll("[data-level]").forEach((b) =>
      b.addEventListener("click", () => {
        lState.level = b.dataset.level;
        renderLogs(root);
      })
    );
    root.querySelectorAll("[data-toggle]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.closest(".cr-log").dataset.id;
        lState.open.has(id) ? lState.open.delete(id) : lState.open.add(id);
        renderLogs(root);
      })
    );
    root.querySelector('[data-act="export"]')?.addEventListener("click", () =>
      download("senditto-logs.json", JSON.stringify(s.list("logs"), null, 2), "application/json")
    );
    root.querySelector('[data-act="clear"]')?.addEventListener("click", () => s.replaceAll("logs", []));
  }

  /* ---------- register ---------- */
  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.contacts = renderContacts;
  window.SendittoUI.segments = renderSegments;
  window.SendittoUI.automations = renderAutomations;
  window.SendittoUI.logs = renderLogs;
})();
