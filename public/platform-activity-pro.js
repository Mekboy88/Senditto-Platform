/**
 * Email activity v2 — overrides the "activity" route: searchable, filterable
 * message feed with rich rows and a proper message-detail window (delivery
 * timeline, copyable ID) instead of a raw text popup.
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${{
    send:'<path d="m4 4 16 8-16 8 4-8Z"/><path d="M8 12h6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    check:'<path d="m20 6-11 11-5-5"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  }[n] || ""}</svg>`;

  let q = "";
  let flt = "All";
  const FILTERS = ["All", "Delivered", "Opened", "Clicked", "Queued", "Failed"];
  const tone = (st) => /delivered|opened|clicked|sent/i.test(st) ? "ok" : /queued|pending/i.test(st) ? "wait" : /bounce|fail/i.test(st) ? "bad" : "mut";
  const initials = (em) => { const p = String(em || "?").split(/[@._-]/).filter(Boolean); return ((p[0]?.[0] || "?") + (p[1]?.[0] || "")).toUpperCase(); };
  const toOf = (m) => (Array.isArray(m.to) ? m.to[0] : m.to) || "—";

  function render(root) {
    const s = S();
    if (!s) throw new Error("Platform store is still loading. Click Try again.");
    root.dataset.platformPage = "act-pro";
    const all = s.list("messages");
    const rows = all.filter((m) => {
      const st = String(m.status || "");
      if (flt === "Failed" && !/bounce|fail/i.test(st)) return false;
      else if (flt !== "All" && flt !== "Failed" && !new RegExp(flt, "i").test(st)) return false;
      if (!q) return true;
      return `${m.subject || ""} ${toOf(m)} ${m.from || ""} ${m.stream || ""} ${m.id}`.toLowerCase().includes(q.toLowerCase());
    });
    const c = (re) => all.filter((m) => re.test(m.status || "")).length;

    root.innerHTML = `
    <div class="cr-page">
      <div class="sd-head">
        <div><small class="pp-kicker">MESSAGE STATUS</small><h1>Email activity</h1>
        <p>Every message queued or sent from this workspace — live.</p></div>
        <div class="sd-head-actions"><button class="sd-btn primary" data-nav="send">${svg("send")} Send email</button></div>
      </div>
      <div class="sd-kpis cr-kpis4">
        ${[["Total", all.length, "all messages"], ["Delivered", c(/delivered|opened|clicked/i), "reached the inbox"], ["Opened", c(/opened|clicked/i), "engaged recipients"], ["Bounced / failed", c(/bounce|fail/i), "needs attention"]]
          .map(([l, v, h]) => `<div class="sd-kpi"><div class="sd-kpi-top"><span>${l}</span></div><div class="sd-kpi-value">${v}</div><div class="sd-kpi-sub">${h}</div></div>`).join("")}
      </div>
      <section class="sd-card3">
        <div class="cr-toolbar">
          <div class="cr-search">${svg("search")}<input placeholder="Search subject, recipient, id…" value="${esc(q)}" data-q></div>
          <div class="cr-chips">${FILTERS.map((f) => `<button class="cr-chip ${flt === f ? "active" : ""}" data-flt="${f}">${f}</button>`).join("")}</div>
        </div>
        ${rows.length === 0 ? `<div class="sd-empty">${svg("send")}<h4>No messages${q || flt !== "All" ? " match" : " yet"}</h4><p>${all.length ? "Try another filter." : "Send your first email and it appears here instantly."}</p></div>` : `
        <div class="sd-rows">
          ${rows.slice(0, 60).map((m) => `
            <button class="sd-row" data-open="${esc(m.id)}">
              <span class="sd-row-av">${esc(initials(toOf(m)))}</span>
              <span class="sd-row-main"><b>${esc(m.subject || m.name || "—")}</b><small>${esc(toOf(m))}</small></span>
              <span class="sd-stream3">${esc(m.stream || "—")}</span>
              <span class="sd-chip ${tone(m.status || "")}"><i></i>${esc(m.status || "—")}</span>
              <time>${esc(s.formatRelative?.(m.createdAt) || "")}</time>
              <span class="sd-row-arrow">${svg("arrow")}</span>
            </button>`).join("")}
        </div>
        ${rows.length > 60 ? `<p class="sd-mut" style="margin:10px 4px 0">Showing 60 of ${rows.length} — refine with search or filters.</p>` : ""}`}
      </section>
    </div>`;

    root.querySelector("[data-q]")?.addEventListener("input", (e) => {
      q = e.target.value;
      render(root);
      const i = root.querySelector("[data-q]");
      i?.focus(); i?.setSelectionRange(i.value.length, i.value.length);
    });
    root.querySelectorAll("[data-flt]").forEach((b) => b.addEventListener("click", () => { flt = b.dataset.flt; render(root); }));
    root.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => window.SendittoNavigate?.(b.dataset.nav)));
    root.querySelectorAll("[data-open]").forEach((b) =>
      b.addEventListener("click", () => {
        const m = s.list("messages").find((x) => String(x.id) === b.dataset.open);
        if (m) openDetail(m, s);
      })
    );
  }

  function openDetail(m, s) {
    const st = String(m.status || "Queued");
    const STAGES = ["Queued", "Sent", "Delivered", "Opened", "Clicked"];
    const failed = /bounce|fail/i.test(st);
    const reach = failed ? 1 : /clicked/i.test(st) ? 4 : /opened/i.test(st) ? 3 : /delivered/i.test(st) ? 2 : /sent/i.test(st) ? 1 : 0;
    const el = document.createElement("div");
    el.className = "pp-modal cr-modal";
    el.innerHTML = `
      <div class="cr-modal-card wide" role="dialog" aria-modal="true">
        <div class="cr-modal-head">
          <h3 style="display:flex;align-items:center;gap:10px">${esc(m.subject || "—")} <span class="sd-chip ${tone(st)}"><i></i>${esc(st)}</span></h3>
          <button class="cr-x" data-close>${svg("close")}</button>
        </div>
        <div class="cr-modal-body">
          <div class="act-tl">
            ${STAGES.map((sg, i) => `
              <div class="act-tl-step ${i <= reach && !failed ? "done" : ""} ${failed && i === 1 ? "fail" : ""}">
                <i>${i <= reach && !failed ? svg("check") : failed && i === 1 ? svg("close") : ""}</i><span>${failed && i === 1 ? "Failed" : sg}</span>
              </div>${i < STAGES.length - 1 ? '<em class="act-tl-bar"></em>' : ""}`).join("")}
          </div>
          <div class="dm-recs" style="margin-top:16px">
            ${[["To", toOf(m)], ["From", m.from || "—"], ["Stream", m.stream || "—"], ["Sent", s.formatRelative?.(m.createdAt) || "—"], ["Latency", m.latency || "—"]]
              .map(([k, v]) => `<div class="dm-rec" style="grid-template-columns:120px 1fr"><span class="dm-type" style="background:#eef2f8;color:#47566d">${k}</span><code>${esc(v)}</code></div>`).join("")}
            <div class="dm-rec" style="grid-template-columns:120px 1fr auto"><span class="dm-type" style="background:#eef2f8;color:#47566d">Message ID</span><code>${esc(m.id)}</code><button class="cr-ic" data-copyid title="Copy ID">${svg("copy")}</button></div>
          </div>
          <div class="cr-actions" style="margin-top:16px"><button class="sd-btn primary" data-close2>Close</button></div>
        </div>
      </div>`;
    const close = () => { el.remove(); window.SendittoRender?.(); };
    el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
    el.querySelector("[data-close]").addEventListener("click", close);
    el.querySelector("[data-close2]").addEventListener("click", close);
    el.querySelector("[data-copyid]").addEventListener("click", (e) => {
      navigator.clipboard?.writeText(m.id);
      e.currentTarget.innerHTML = svg("check");
    });
    document.body.appendChild(el);
  }

  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.activity = render;
  setInterval(() => {
    const root = document.getElementById("senditto-platform-root");
    if (root && root.dataset.route === "activity" && root.dataset.platformPage !== "act-pro" && !document.querySelector(".cr-modal, .pp-modal")) {
      window.SendittoUI.activity = render;
      render(root);
    }
  }, 350);
})();
