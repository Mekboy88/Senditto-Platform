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
