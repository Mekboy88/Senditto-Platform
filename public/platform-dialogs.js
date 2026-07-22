/**
 * In-app dialog system — the ONLY confirm/alert surface for the platform.
 * Styled project windows (cr-modal kit); no native browser popups anywhere.
 *   window.SendittoConfirm({title,message,danger,confirmLabel}) -> Promise<boolean>
 *   window.SendittoAlert(message, title?) -> Promise<void>
 */
(() => {
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  function openDialog({ title, message, danger, confirmLabel, cancelLabel, alertOnly }) {
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "pp-modal cr-modal";
      el.style.zIndex = 260;
      el.innerHTML = `
        <div class="cr-modal-card" role="${alertOnly ? "alertdialog" : "dialog"}" aria-modal="true">
          <div class="cr-modal-head"><h3>${esc(title || (alertOnly ? "Notice" : "Are you sure?"))}</h3></div>
          <div class="cr-modal-body">
            <p style="margin:0;white-space:pre-wrap;color:#47566d;font-size:13.5px;line-height:1.6">${esc(message || "")}</p>
            <div class="cr-actions" style="margin-top:18px">
              ${alertOnly ? "" : `<button class="sd-btn" data-no>${esc(cancelLabel || "Cancel")}</button>`}
              <button class="sd-btn ${danger ? "danger" : "primary"}" data-yes autofocus>${esc(confirmLabel || (alertOnly ? "OK" : "Confirm"))}</button>
            </div>
          </div>
        </div>`;
      const done = (val) => { document.removeEventListener("keydown", onKey, true); el.remove(); resolve(val); };
      const onKey = (e) => {
        if (e.key === "Escape") { e.stopPropagation(); done(false); }
        if (e.key === "Enter") { e.stopPropagation(); done(true); }
      };
      el.addEventListener("mousedown", (e) => { if (e.target === el) done(false); });
      el.querySelector("[data-yes]").addEventListener("click", () => done(true));
      el.querySelector("[data-no]")?.addEventListener("click", () => done(false));
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(el);
      el.querySelector("[data-yes]")?.focus();
    });
  }

  window.SendittoConfirm = (opts) => openDialog(typeof opts === "string" ? { message: opts } : opts || {});
  window.SendittoAlert = (message, title) => openDialog({ message, title, alertOnly: true });
})();
