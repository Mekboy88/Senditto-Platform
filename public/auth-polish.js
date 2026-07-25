/**
 * Auth screens — right-side visual enhancement.
 * Keeps the existing illustration and console card exactly as they are and
 * layers life around them: soft ambient backdrop, gentle floating, a paper
 * plane gliding across, and small delivery-status chips fading in.
 */
(() => {
  const MARK = "data-ap-decor";

  function inject() {
    const story = document.querySelector(".auth-story");
    if (!story || story.querySelector(`[${MARK}]`)) return;
    const decor = document.createElement("div");
    decor.setAttribute(MARK, "1");
    decor.className = "ap-decor";
    decor.setAttribute("aria-hidden", "true");
    decor.innerHTML = `
      <i class="ap-blob ap-blob-a"></i>
      <i class="ap-blob ap-blob-b"></i>
      <i class="ap-grid"></i>
      <svg class="ap-plane" viewBox="0 0 24 24" fill="none" stroke="#367ef5" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m4 4 16 8-16 8 4-8Z" fill="#e8f0fe"/><path d="M8 12h6"/></svg>
      <span class="ap-chip ap-chip-1"><i class="ok"></i>Delivered<b>99.2%</b></span>
      <span class="ap-chip ap-chip-2"><i class="eye"></i>Opened<b>2s ago</b></span>
      <span class="ap-chip ap-chip-3"><i class="lock"></i>OTP verified</span>`;
    story.prepend(decor);
    story.classList.add("ap-enhanced");
  }

  let t = null;
  const obs = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(inject, 80);
  });
  const start = () => {
    obs.observe(document.getElementById("root") || document.body, { subtree: true, childList: true });
    inject();
    [300, 900].forEach((ms) => setTimeout(inject, ms));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

/**
 * Reset-password screen: resend with 60s cooldown + proper guidance.
 * Captures the address from the forgot form, shows where the link went,
 * expiry + spam hints, and lets the user resend once per minute.
 */
(() => {
  const esc2 = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  let lastEmail = "";
  let timer = null;

  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target?.closest?.(".auth-overlay form, form.auth-form");
      if (!form) return;
      const em = form.querySelector('input[type="email"]');
      if (em?.value) lastEmail = em.value.trim();
    },
    true
  );

  function inject() {
    const suc = [...document.querySelectorAll(".auth-success")].find((s) =>
      /reset link sent/i.test(s.querySelector("h2")?.textContent || "")
    );
    if (!suc || suc.querySelector(".ap-resend")) return;

    const hasBack = !!document.querySelector(".auth-back");
    const wrap = document.createElement("div");
    wrap.className = "ap-resend";
    wrap.innerHTML = `
      <p class="ap-resend-meta">${lastEmail ? `Sent to <b>${esc2(lastEmail)}</b>. ` : ""}The link expires in <b>30 minutes</b>. If it doesn't arrive within a minute, check your spam folder.</p>
      <div class="ap-resend-row">
        <button type="button" class="ap-resend-btn" disabled>Resend link in 60s</button>
        ${hasBack ? `<button type="button" class="ap-again">Use a different email</button>` : ""}
      </div>
      <span class="ap-resent" hidden>✓ A new link is on its way${lastEmail ? ` to ${esc2(lastEmail)}` : ""}</span>`;
    const p = suc.querySelector("p");
    (p || suc).insertAdjacentElement("afterend", wrap);

    const btn = wrap.querySelector(".ap-resend-btn");
    const resent = wrap.querySelector(".ap-resent");
    let left = 60;
    const paint = () => {
      btn.disabled = left > 0;
      btn.textContent = left > 0 ? `Resend link in ${left}s` : "Resend link";
    };
    paint();
    clearInterval(timer);
    timer = setInterval(() => {
      if (!wrap.isConnected) return clearInterval(timer);
      if (left > 0) {
        left--;
        paint();
      }
    }, 1000);
    btn.addEventListener("click", () => {
      if (left > 0) return;
      left = 60;
      paint();
      resent.hidden = false;
      setTimeout(() => (resent.hidden = true), 4500);
    });
    wrap.querySelector(".ap-again")?.addEventListener("click", () => document.querySelector(".auth-back")?.click());
  }

  setInterval(inject, 400);
})();
