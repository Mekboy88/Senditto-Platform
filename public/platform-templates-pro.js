/**
 * Template Studio v2 — overrides the "templates" route.
 * The built-in designs come from the database, so this page and the operator
 * console show the same library rather than each carrying a copy that drifts.
 * A workspace brand kit (logo, colours, background, footer) is applied by the
 * server when it renders them, and there is a desktop/mobile preview.
 *
 * A strict allowlist sanitizer runs over anything a person wrote, so a saved
 * template can never contain scripts, forms, iframes, event handlers or unsafe
 * URLs. Library HTML is not put through it: it comes from our own server,
 * which sanitizes on the way in, and the browser copy strips the <style> block
 * that carries the media queries — which would show a "mobile" preview that
 * could not reflow.
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  /* ================= safety: allowlist sanitizer ================= */

  const ALLOWED_TAGS = new Set(["TABLE","TBODY","THEAD","TR","TD","TH","DIV","P","H1","H2","H3","H4","A","IMG","SPAN","STRONG","B","EM","I","U","BR","HR","UL","OL","LI","BLOCKQUOTE","CENTER","SMALL","BODY"]);
  const ALLOWED_ATTRS = new Set(["style","href","src","alt","width","height","align","valign","cellpadding","cellspacing","border","bgcolor","color","target","rel"]);

  function safeUrl(url, kind) {
    const u = String(url || "").trim();
    if (!u) return "";
    if (/^javascript:|^vbscript:|^file:/i.test(u)) return "";
    if (kind === "img") return /^https:\/\//i.test(u) || /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(u) ? u : "";
    return /^https:\/\//i.test(u) || /^mailto:/i.test(u) || /^\{\{/.test(u) ? u : "";
  }

  function safeStyle(css) {
    const s = String(css || "");
    if (/expression|javascript:|@import|behavior/i.test(s)) return "";
    // allow url() only for https images
    return s.replace(/url\(([^)]*)\)/gi, (m, inner) => {
      const clean = inner.replace(/["']/g, "").trim();
      return /^https:\/\//i.test(clean) ? `url(${clean})` : "none";
    });
  }

  function sanitizeEmailHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    const walk = (node) => {
      for (const el of [...node.children]) {
        if (!ALLOWED_TAGS.has(el.tagName)) {
          el.remove();
          continue;
        }
        for (const attr of [...el.attributes]) {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on") || !ALLOWED_ATTRS.has(name)) {
            el.removeAttribute(attr.name);
            continue;
          }
          if (name === "style") el.setAttribute("style", safeStyle(attr.value));
          if (name === "href") {
            const u = safeUrl(attr.value, "a");
            if (u) { el.setAttribute("href", u); el.setAttribute("rel", "noopener noreferrer"); }
            else el.removeAttribute("href");
          }
          if (name === "src") {
            const u = safeUrl(attr.value, "img");
            if (u) el.setAttribute("src", u);
            else el.remove();
          }
        }
        walk(el);
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }

  /* ================= brand kit ================= */

  const BG_PRESETS = [["Mist","#f4f6fb"],["Paper","#ffffff"],["Sand","#faf6ef"],["Mint","#f1faf5"],["Lavender","#f6f4fc"],["Sky","#eff6ff"]];

  function toast(text) {
    document.querySelector(".tp2-toast")?.remove();
    const el = document.createElement("div");
    el.className = "tp2-toast";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function brand() {
    const st = S()?.snapshot?.()?.settings || {};
    const ws = S()?.currentWorkspace?.() || {};
    return {
      logoMode: "text", logoText: ws.name || "Senditto", logoUrl: "",
      color: "#367ef5", bg: "#f4f6fb", radius: 14,
      footerAddress: "Senditto Inc · 100 Mail Street · Internet",
      footerNote: "You receive this email because you signed up.",
      ...(st.brand || {}),
    };
  }
  function saveBrand(patch) {
    const s = S();
    const cur = brand();
    s.setSettings?.({ ...(s.snapshot?.()?.settings || {}), brand: { ...cur, ...patch } });
    // The server renders the library with the brand, so it has to be asked again.
    libraryState = "idle";
  }

  /* ================= email building blocks (table-based, inline) ================= */

  const FONT = "font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;";

  function logoHtml(b) {
    if (b.logoMode === "image" && safeUrl(b.logoUrl, "img"))
      return `<img src="${esc(b.logoUrl)}" alt="${esc(b.logoText)}" height="34" style="display:block;max-height:34px;width:auto">`;
    return `<div style="${FONT}font-size:19px;font-weight:800;color:#111827;letter-spacing:-0.02em">${esc(b.logoText)}</div>`;
  }
  const btn = (b, label, url = "{{action_url}}") =>
    `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto 6px"><tr><td bgcolor="${b.color}" style="border-radius:${b.radius > 6 ? 10 : 4}px"><a href="${url}" target="_blank" style="${FONT}display:inline-block;padding:13px 30px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none">${esc(label)}</a></td></tr></table>`;
  const h1 = (t) => `<h1 style="${FONT}margin:0 0 12px;font-size:24px;line-height:1.25;color:#111827;letter-spacing:-0.02em;text-align:center">${t}</h1>`;
  const p = (t, center = true) => `<p style="${FONT}margin:0 0 14px;font-size:14.5px;line-height:1.65;color:#4b5563;text-align:${center ? "center" : "left"}">${t}</p>`;
  const codeBox = (b) => `<div style="${FONT}margin:22px auto;max-width:230px;background:#f3f6fc;border:1px dashed ${b.color};border-radius:${b.radius}px;padding:16px 10px;text-align:center;font-size:30px;font-weight:800;letter-spacing:10px;color:#111827">{{code}}</div>`;
  const badge = (b, t) => `<div style="text-align:center;margin-bottom:14px"><span style="${FONT}display:inline-block;background:${b.color}1a;color:${b.color};font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:6px 14px">${esc(t)}</span></div>`;
  const divider = () => `<hr style="border:0;border-top:1px solid #eceff5;margin:24px 0">`;
  const kv = (rows) => `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 6px">${rows.map(([k, v, strong]) => `<tr><td style="${FONT}padding:9px 0;font-size:13.5px;color:#6b7280;border-bottom:1px solid #f1f4f9">${esc(k)}</td><td align="right" style="${FONT}padding:9px 0;font-size:13.5px;font-weight:${strong ? 800 : 600};color:#111827;border-bottom:1px solid #f1f4f9">${esc(v)}</td></tr>`).join("")}</table>`;
  const featureRow = (emojiChar, title, text) => `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px"><tr><td width="42" valign="top" style="font-size:22px;padding-top:2px">${emojiChar}</td><td style="${FONT}"><div style="font-size:14px;font-weight:700;color:#111827">${esc(title)}</div><div style="font-size:13px;color:#6b7280;line-height:1.55">${esc(text)}</div></td></tr></table>`;
  const heroIcon = (b, ch) => `<div style="text-align:center;margin:4px 0 16px"><div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;background:${b.color}14;font-size:30px;text-align:center">${ch}</div></div>`;

  function shell(b, inner, preheader) {
    return `<body style="margin:0;padding:0;background:${b.bg}">
<div style="display:none;max-height:0;overflow:hidden">${esc(preheader || "")}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${b.bg}"><tr><td align="center" style="padding:32px 14px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%"><tr><td style="padding:0 6px 18px">${logoHtml(b)}</td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:${b.radius}px;padding:36px 34px;border:1px solid #e8edf5">${inner}</td></tr>
<tr><td style="${FONT}padding:20px 8px;text-align:center;font-size:11.5px;line-height:1.7;color:#9aa5b4">${esc(b.footerNote)}<br>${esc(b.footerAddress)}<br><a href="{{unsubscribe_url}}" style="color:#9aa5b4;text-decoration:underline">Unsubscribe</a> · <a href="{{preferences_url}}" style="color:#9aa5b4;text-decoration:underline">Email preferences</a></td></tr>
</table></td></tr></table></body>`;
  }

  /* ================= the shared design library =================
     These used to be defined here, in this file, so the operator studio and
     the product each had their own set that drifted apart. They now come from
     the database, which renders them with the workspace's brand — one library,
     improved in one place. */

  let DEFS = [];
  let CATEGORIES = ["All"];
  let SAMPLE = {};
  let libraryState = "idle"; // idle | loading | ready | failed

  function loadLibrary(root) {
    if (libraryState === "loading") return;
    libraryState = "loading";
    const b = brand();
    const payload = encodeURIComponent(
      JSON.stringify({
        name: b.logoText,
        logoText: b.logoText,
        accent: b.color,
        page: b.bg,
        radius: b.radius,
        footer: b.footerNote,
        address: b.footerAddress,
      })
    );
    fetch(`/api/platform/templates/library?brand=${payload}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("unavailable"))))
      .then((d) => {
        DEFS = d.templates || [];
        CATEGORIES = ["All", ...(d.categories || [])];
        SAMPLE = d.sampleValues || {};
        libraryState = "ready";
        if (root && root.dataset.platformPage === "templates-pro") render(root);
      })
      .catch(() => {
        libraryState = "failed";
        if (root && root.dataset.platformPage === "templates-pro") render(root);
      });
  }

  /** Fill the merge fields with samples, so a preview shows a real email. */
  function withSamples(html) {
    return String(html || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key) =>
      SAMPLE[key] === undefined ? whole : SAMPLE[key]
    );
  }

  function renderDef(def) {
    // Not re-sanitised: this came from our own server, which sanitises on the
    // way in, and it is shown in a sandbox="" frame where nothing can run.
    // Passing it through the browser sanitizer strips <style>, and with it the
    // media queries — so the mobile preview would show a design that cannot
    // reflow, which is worse than no preview at all.
    return withSamples(def.html);
  }

  /* ================= page ================= */

  let cat = "All";
  let q = "";
  let preview = null; // def id
  let mobile = false;
  let brandOpen = false;

  const icon = (n) => ({
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    brush:'<path d="M14 3l7 7-9 9H5v-7l9-9Z"/><path d="M5 21h14"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9.5 11.5 11 13l3.5-3.5"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
  }[n] || "");
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${icon(n)}</svg>`;

  function render(root) {
    const s = S();
    if (!s) throw new Error("Platform store is still loading. Click Try again.");
    root.dataset.platformPage = "templates-pro";
    const b = brand();
    if (libraryState === "idle") loadLibrary(root);
    const saved = s.list("templates");
    const defs = DEFS.filter((d) => (cat === "All" || d.category === cat) && (!q || `${d.name} ${d.subject} ${d.category}`.toLowerCase().includes(q.toLowerCase())));

    root.innerHTML = `
    <div class="tp2-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">CONTENT SYSTEM</small>
          <h1>Templates</h1>
          <p>${
            libraryState === "failed"
              ? "The design library could not be loaded. Check your connection and try again."
              : libraryState === "ready"
                ? `${DEFS.length} responsive designs — one column, 600px on a desktop, full width on a phone, each with a plain-text alternative.`
                : "Loading the design library…"
          }</p>
        </div>
        <div class="sd-head-actions">
          <button class="sd-btn" data-act="brand">${svg("brush")} Brand kit</button>
          <span class="tp2-safe">${svg("shield")} Safe HTML only</span>
        </div>
      </div>

      ${saved.length ? `
      <section class="sd-card3">
        <div class="sd-card3-head"><div><h3>Your library</h3><p>${saved.length} saved template${saved.length === 1 ? "" : "s"} — used by campaigns and the API</p></div></div>
        <div class="tp2-lib">
          ${saved.slice(0, 12).map((t) => `
            <div class="tp2-lib-item" data-lib="${esc(t.id)}">
              <b>${esc(t.name)}</b><small>${esc(t.subject || "—")}</small>
              <div class="tp2-lib-actions">
                <button class="sd-btn sm" data-libact="preview">${svg("eye")} Preview</button>
                <button class="sd-btn sm danger" data-libact="delete">${svg("trash")}</button>
              </div>
            </div>`).join("")}
        </div>
      </section>` : ""}

      <div class="cr-toolbar">
        <div class="cr-search">${svg("search")}<input placeholder="Search ${DEFS.length} designs…" value="${esc(q)}" data-q></div>
        <div class="cr-chips">${CATEGORIES.map((c) => `<button class="cr-chip ${cat === c ? "active" : ""}" data-cat="${c}">${c}</button>`).join("")}</div>
      </div>

      <div class="tp2-grid">
        ${defs.map((d) => `
          <div class="tp2-card" data-id="${d.id}">
            <div class="tp2-thumb"><iframe sandbox="" scrolling="no" srcdoc="${esc(renderDef(d))}" tabindex="-1"></iframe></div>
            <div class="tp2-meta">
              <div><b>${esc(d.name)}</b><small>${esc(d.subject)}</small></div>
              <span class="sd-chip mut">${esc(d.category)}</span>
            </div>
            <div class="tp2-actions">
              <button class="sd-btn sm" data-tpl="preview">${svg("eye")} Preview</button>
              <button class="sd-btn sm primary" data-tpl="use">${svg("plus")} Use template</button>
            </div>
          </div>`).join("")}
      </div>
    </div>`;

    wire(root, b);
    if (preview) openPreview(root, b);
    if (brandOpen) openBrand(root, b);
  }

  function wire(root, b) {
    const s = S();
    root.querySelector("[data-q]")?.addEventListener("input", (e) => {
      q = e.target.value;
      render(root);
      const inp = root.querySelector("[data-q]");
      inp?.focus(); inp?.setSelectionRange(inp.value.length, inp.value.length);
    });
    root.querySelectorAll("[data-cat]").forEach((el) => el.addEventListener("click", () => { cat = el.dataset.cat; render(root); }));
    root.querySelector('[data-act="brand"]')?.addEventListener("click", () => { brandOpen = true; render(root); });
    root.querySelectorAll("[data-tpl]").forEach((el) =>
      el.addEventListener("click", () => {
        const id = el.closest(".tp2-card").dataset.id;
        const def = DEFS.find((x) => x.id === id);
        if (!def) return;
        if (el.dataset.tpl === "preview") { preview = id; mobile = false; render(root); }
        if (el.dataset.tpl === "use") {
          // The database saves it, so the stored copy gets its plain-text
          // alternative, goes through the sanitiser and is encrypted at rest.
          // Writing it from here skipped all three.
          const wsId = (S()?.get && S().get().selectedWorkspaceId) || (s.list("workspaces")[0] || {}).id || null;
          el.disabled = true;
          fetch("/api/platform/templates/from-library", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: def.id, workspaceId: wsId }),
          })
            .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
            .then(({ ok, d }) => {
              el.disabled = false;
              if (!ok) return toast(d.error || "Could not save that design");
              toast(`“${d.row.name}” added to your templates`);
              window.SendittoSync?.refresh?.();
            })
            .catch(() => {
              el.disabled = false;
              toast("Could not reach the server");
            });
        }
      })
    );
    root.querySelectorAll("[data-lib]").forEach((card) =>
      card.querySelectorAll("[data-libact]").forEach((btn2) =>
        btn2.addEventListener("click", () => {
          const row = s.list("templates").find((t) => String(t.id) === card.dataset.lib);
          if (!row) return;
          if (btn2.dataset.libact === "delete") s.remove("templates", row.id);
          if (btn2.dataset.libact === "preview") { preview = `lib:${row.id}`; mobile = false; render(root); }
        })
      )
    );
  }

  function previewHtml(b) {
    if (String(preview).startsWith("lib:")) {
      const row = S().list("templates").find((t) => `lib:${t.id}` === preview);
      return { title: row?.name || "Template", html: sanitizeEmailHtml(row?.html || "") };
    }
    const def = DEFS.find((x) => x.id === preview);
    return { title: def?.name || "Template", html: def ? renderDef(def) : "" };
  }

  function openPreview(root, b) {
    const { title, html } = previewHtml(b);
    const el = document.createElement("div");
    el.className = "pp-modal tp2-modal";
    el.innerHTML = `
      <div class="tp2-preview-card">
        <div class="tp2-preview-bar">
          <b>${esc(title)}</b>
          <div class="sd-seg">
            <button class="sd-seg-btn ${!mobile ? "active" : ""}" data-dev="desktop">Desktop</button>
            <button class="sd-seg-btn ${mobile ? "active" : ""}" data-dev="mobile">Mobile</button>
          </div>
          <button class="cr-x" data-close>${svg("close")}</button>
        </div>
        <div class="tp2-preview-body"><iframe sandbox="" style="width:${mobile ? "375px" : "100%"};max-width:${mobile ? "375px" : "680px"}" srcdoc="${esc(html)}"></iframe></div>
      </div>`;
    el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
    const close = () => { preview = null; el.remove(); window.SendittoRender?.(); };
    el.querySelector("[data-close]").addEventListener("click", close);
    el.querySelectorAll("[data-dev]").forEach((d) => d.addEventListener("click", () => { mobile = d.dataset.dev === "mobile"; el.remove(); openPreview(root, b); }));
    document.body.appendChild(el);
  }

  function openBrand(root, b) {
    const el = document.createElement("div");
    el.className = "pp-modal tp2-modal";
    el.innerHTML = `
      <div class="cr-modal-card wide tp2-brand">
        <div class="cr-modal-head"><h3>Brand kit</h3><button class="cr-x" data-close>${svg("close")}</button></div>
        <div class="cr-modal-body">
          <p class="cr-help">Applied to every template. Logos accept <b>https images only</b>; all HTML is sanitized — scripts, forms and unsafe links are removed automatically.</p>
          <form class="cr-form" data-brand-form>
            <div class="cr-row2">
              <label>Logo type
                <select name="logoMode"><option value="text" ${b.logoMode !== "image" ? "selected" : ""}>Text logo</option><option value="image" ${b.logoMode === "image" ? "selected" : ""}>Image URL</option></select>
              </label>
              <label>Logo text<input name="logoText" value="${esc(b.logoText)}"></label>
            </div>
            <label>Logo image URL <small>https:// only</small><input name="logoUrl" value="${esc(b.logoUrl)}" placeholder="https://yourdomain.com/logo.png"></label>
            <div class="cr-row2">
              <label>Brand color<input type="color" name="color" value="${esc(b.color)}" style="height:42px;padding:4px"></label>
              <label>Corner radius
                <select name="radius"><option value="14" ${b.radius >= 8 ? "selected" : ""}>Rounded</option><option value="4" ${b.radius < 8 ? "selected" : ""}>Square</option></select>
              </label>
            </div>
            <label>Background</label>
            <div class="tp2-bgs">
              ${BG_PRESETS.map(([n, c]) => `<button type="button" class="tp2-bg ${b.bg === c ? "active" : ""}" data-bg="${c}" style="background:${c}" title="${n}"></button>`).join("")}
              <input name="bg" value="${esc(b.bg)}" style="width:110px">
            </div>
            <label>Footer address<input name="footerAddress" value="${esc(b.footerAddress)}"></label>
            <label>Footer note<input name="footerNote" value="${esc(b.footerNote)}"></label>
            <div class="cr-actions">
              <button type="button" class="sd-btn" data-close2>Cancel</button>
              <button type="submit" class="sd-btn primary">Save brand kit</button>
            </div>
          </form>
        </div>
      </div>`;
    const close = () => { brandOpen = false; el.remove(); window.SendittoRender?.(); };
    el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
    el.querySelector("[data-close]").addEventListener("click", close);
    el.querySelector("[data-close2]").addEventListener("click", close);
    el.querySelectorAll("[data-bg]").forEach((bg) => bg.addEventListener("click", () => { el.querySelector('input[name="bg"]').value = bg.dataset.bg; el.querySelectorAll(".tp2-bg").forEach((x) => x.classList.toggle("active", x === bg)); }));
    el.querySelector("[data-brand-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const url = String(f.get("logoUrl") || "").trim();
      saveBrand({
        logoMode: String(f.get("logoMode")),
        logoText: String(f.get("logoText") || "").slice(0, 40),
        logoUrl: safeUrl(url, "img") ? url : "",
        color: /^#[0-9a-f]{6}$/i.test(String(f.get("color"))) ? String(f.get("color")) : "#367ef5",
        radius: Number(f.get("radius")) || 14,
        bg: /^#[0-9a-f]{3,8}$/i.test(String(f.get("bg")).trim()) ? String(f.get("bg")).trim() : "#f4f6fb",
        footerAddress: String(f.get("footerAddress") || "").slice(0, 140),
        footerNote: String(f.get("footerNote") || "").slice(0, 140),
      });
      brandOpen = false;
      el.remove();
      window.SendittoRender?.();
    });
    document.body.appendChild(el);
  }

  window.SendittoUI = window.SendittoUI || {};
  // template-system.js registers this key too, and the last script loaded
  // wins. Defining the property keeps this page whichever order they load in.
  try {
    Object.defineProperty(window.SendittoUI, "templates", {
      configurable: false,
      enumerable: true,
      get: () => render,
      set: () => {},
    });
  } catch {
    window.SendittoUI.templates = render;
  }
  window.SendittoTemplates = { DEFS, renderDef, sanitizeEmailHtml, brand };
})();
