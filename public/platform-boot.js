/**
 * Senditto boot screen.
 *
 * The app paints in stages — React hydrates, our page layer mounts, then data
 * arrives — and each stage was visible as a flicker. This puts a shimmering
 * skeleton on screen in the very first frame and holds it until the real UI is
 * actually there, so every load is one smooth transition instead of three
 * jumps.
 *
 * It matches what is about to load: the dashboard skeleton when a session is
 * present, the landing skeleton otherwise. It removes itself as soon as the
 * app is ready, and gives up after a few seconds no matter what, so it can
 * never leave anyone staring at a placeholder.
 */
(() => {
  if (window.__sendittoBooted) return;
  window.__sendittoBooted = true;

  const MIN_VISIBLE = 260; // below this the shimmer itself reads as a flash
  const MAX_WAIT = 7000; // never trap the page behind the skeleton
  const started = Date.now();

  // Deliberately self-contained: this runs before every other script, so it
  // reads the hint cookie itself rather than depending on one of them.
  const signedIn = () => /(?:^|;\s*)senditto_ui=1(?:;|$)/.test(document.cookie);

  const style = document.createElement("style");
  style.textContent = `
    #senditto-boot{position:fixed;inset:0;z-index:2147482500;background:#fbfcff;
      opacity:1;transition:opacity .32s ease;pointer-events:none;overflow:hidden}
    #senditto-boot.is-done{opacity:0}
    .sb-sk{background:#eef1f7;border-radius:10px;position:relative;overflow:hidden}
    /* One sweep of light travelling across every placeholder. */
    .sb-sk::after{content:"";position:absolute;inset:0;transform:translateX(-100%);
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);
      animation:sbShimmer 1.25s ease-in-out infinite}
    @keyframes sbShimmer{100%{transform:translateX(100%)}}
    /* Dashboard shape */
    .sb-app{display:flex;height:100%}
    .sb-side{width:248px;flex:0 0 248px;background:#fff;border-right:1px solid #eef2f7;
      padding:20px 16px;display:flex;flex-direction:column;gap:10px}
    .sb-main{flex:1;padding:24px 28px;display:flex;flex-direction:column;gap:18px;min-width:0}
    .sb-row{display:flex;gap:16px;flex-wrap:wrap}
    .sb-card{flex:1 1 200px;height:104px}
    /* Landing shape */
    .sb-land{max-width:1080px;margin:0 auto;padding:34px 28px;display:flex;
      flex-direction:column;gap:26px}
    .sb-nav{display:flex;align-items:center;gap:14px}
    .sb-hero{display:flex;flex-direction:column;gap:14px;align-items:center;
      padding-top:52px}
    @media (prefers-reduced-motion:reduce){
      .sb-sk::after{animation:none}
      #senditto-boot{transition:none}
    }`;

  const el = document.createElement("div");
  el.id = "senditto-boot";
  el.setAttribute("aria-hidden", "true");

  const bar = (w, h, r) =>
    `<div class="sb-sk" style="width:${w};height:${h};${r ? `border-radius:${r};` : ""}"></div>`;

  el.innerHTML = signedIn()
    ? `<div class="sb-app">
         <div class="sb-side">
           ${bar("60%", "26px")}
           <div style="height:14px"></div>
           ${Array.from({ length: 8 }, () => bar("100%", "30px")).join("")}
         </div>
         <div class="sb-main">
           ${bar("240px", "30px")}
           <div class="sb-row">${Array.from({ length: 4 }, () => `<div class="sb-sk sb-card"></div>`).join("")}</div>
           ${bar("100%", "260px", "14px")}
         </div>
       </div>`
    : `<div class="sb-land">
         <div class="sb-nav">
           ${bar("132px", "30px")}<div style="flex:1"></div>
           ${bar("84px", "26px")}${bar("84px", "26px")}${bar("116px", "36px", "999px")}
         </div>
         <div class="sb-hero">
           ${bar("min(620px,86%)", "52px", "14px")}
           ${bar("min(520px,78%)", "52px", "14px")}
           ${bar("min(430px,70%)", "20px")}
           <div style="height:10px"></div>
           ${bar("190px", "44px", "999px")}
         </div>
         <div class="sb-row">${Array.from({ length: 3 }, () => `<div class="sb-sk sb-card"></div>`).join("")}</div>
       </div>`;

  // Attach to whatever exists right now. Waiting for <body> would mean waiting
  // for every stylesheet and script in <head> first — precisely the delay the
  // skeleton is meant to cover.
  (document.head || document.documentElement).appendChild(style);
  (document.body || document.documentElement).appendChild(el);
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      if (document.body && el.parentElement !== document.body) document.body.appendChild(el);
    },
    { once: true }
  );

  /** The real UI is considered ready once one of its landmarks is on screen. */
  function appReady() {
    return Boolean(
      document.querySelector(".dashboard-shell") ||
        document.querySelector(".auth-overlay") ||
        document.querySelector(".announcement") ||
        document.querySelector("#root > *")
    );
  }

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(poll);
    const wait = Math.max(0, MIN_VISIBLE - (Date.now() - started));
    setTimeout(() => {
      el.classList.add("is-done");
      // Remove only after the fade, so nothing pops.
      setTimeout(() => el.remove(), 360);
    }, wait);
  }

  const poll = setInterval(() => {
    if (appReady() || Date.now() - started > MAX_WAIT) finish();
  }, 60);

  window.addEventListener("load", () => setTimeout(() => appReady() && finish(), 120));
  window.SendittoBootScreen = { finish };
})();
