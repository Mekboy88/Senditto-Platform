/**
 * Analytics detail v2 — intercepts funnel-stage / campaign clicks on the
 * Analytics page and opens a stage-colored detail window (gradient header
 * matching the clicked stage) instead of the flattened legacy modal.
 */
(() => {
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const STAGES = {
    Accepted: { c1: "#4a8bf7", c2: "#2f6fe0", icon: "📥", copy: "Requests accepted by the API — the top of your funnel." },
    Delivered: { c1: "#38bdf8", c2: "#0891b2", icon: "✅", copy: "Reached the recipient's mail server successfully." },
    Opened: { c1: "#4ade80", c2: "#16a34a", icon: "👀", copy: "Unique recipients who opened the message." },
    Clicked: { c1: "#a78bfa", c2: "#7c3aed", icon: "🖱️", copy: "Recipients who clicked at least one link." },
  };

  function openStage(label, value, pct) {
    const st = STAGES[label] || STAGES.Accepted;
    const el = document.createElement("div");
    el.className = "pp-modal cr-modal";
    el.innerHTML = `
      <div class="cr-modal-card an2-card" role="dialog" aria-modal="true">
        <div class="an2-hero" style="background:linear-gradient(135deg,${st.c1},${st.c2})">
          <span class="an2-ico">${st.icon}</span>
          <small>DELIVERY FUNNEL</small>
          <h3>${esc(label)}</h3>
          <button class="cr-x an2-x" data-close>✕</button>
        </div>
        <div class="cr-modal-body">
          <div class="an2-nums"><b>${esc(value)}</b><span>messages · ${esc(pct)}</span></div>
          <div class="sd-progress"><i style="width:${Math.min(100, parseFloat(pct) || 0)}%;background:linear-gradient(90deg,${st.c1},${st.c2})"></i></div>
          <p class="cr-help" style="margin-top:12px">${st.copy}</p>
          <div class="cr-actions"><button class="sd-btn primary" data-close2 style="background:linear-gradient(180deg,${st.c1},${st.c2});border-color:${st.c2}">Done</button></div>
        </div>
      </div>`;
    const close = () => el.remove();
    el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
    el.querySelector("[data-close]").addEventListener("click", close);
    el.querySelector("[data-close2]").addEventListener("click", close);
    document.body.appendChild(el);
  }

  document.addEventListener(
    "click",
    (e) => {
      const root = document.getElementById("senditto-platform-root");
      if (!root || root.dataset.route !== "analytics") return;
      const btn = e.target.closest("[data-detail]");
      if (!btn || !root.contains(btn)) return;
      const parts = String(btn.dataset.detail || "").split("|");
      if (parts.length > 4 || !STAGES[parts[0]]) return; // campaigns keep their flow
      e.preventDefault();
      e.stopPropagation();
      openStage(parts[0], parts[1] || "0", parts[2] || "0%");
    },
    true
  );
})();
