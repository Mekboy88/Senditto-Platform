/**
 * Senditto Platform — real authentication gate.
 *
 * Loads before the app and blocks it behind a login that only the control
 * database can satisfy. There is no local, demo or social bypass: the overlay
 * is removed only after POST /api/auth/login returns a token AND that token is
 * verified against the server on every page load.
 */
(() => {
  const SESS_KEY = "senditto_platform_session_v1";
  const base = () =>
    ((window.SENDITTO_PLATFORM_CONFIG || {}).apiBase || window.location.origin).replace(/\/$/, "");

  const session = () => {
    try {
      return JSON.parse(localStorage.getItem(SESS_KEY) || "null");
    } catch {
      return null;
    }
  };

  function clearSession() {
    localStorage.removeItem(SESS_KEY);
  }

  async function verify(token) {
    if (!token) return false;
    try {
      const res = await fetch(`${base()}/api/platform/state`, {
        headers: { Authorization: `Bearer ${token}`, "X-Senditto-Client": "platform" },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  const style = `
    #senditto-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;
      justify-content:center;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
    #senditto-gate .box{width:100%;max-width:380px;padding:32px;border-radius:14px;background:#fff;
      box-shadow:0 24px 60px rgba(0,0,0,.4)}
    #senditto-gate h1{margin:0 0 6px;font-size:20px;font-weight:650;color:#0d1117}
    #senditto-gate p{margin:0 0 22px;font-size:13.5px;line-height:1.5;color:#57606a}
    #senditto-gate label{display:block;font-size:12px;font-weight:600;color:#424a53;margin:0 0 6px}
    #senditto-gate input{width:100%;box-sizing:border-box;padding:11px 12px;font-size:14px;color:#0d1117;
      border:1px solid #d0d7de;border-radius:8px;background:#fff;margin:0 0 16px}
    #senditto-gate input:focus{outline:none;border-color:#367ef5;box-shadow:0 0 0 3px rgba(54,126,245,.15)}
    #senditto-gate button{width:100%;padding:11px;font-size:14px;font-weight:600;color:#fff;background:#367ef5;
      border:0;border-radius:8px;cursor:pointer}
    #senditto-gate button:disabled{opacity:.6;cursor:default}
    #senditto-gate .err{margin:0 0 16px;padding:10px 12px;border-radius:8px;background:#ffebe9;
      border:1px solid #ffcecb;color:#b35900;font-size:13px}
    @media (prefers-color-scheme:dark){
      #senditto-gate .box{background:#161b22}
      #senditto-gate h1{color:#e6edf3} #senditto-gate label{color:#adbac7}
      #senditto-gate input{background:#0d1117;border-color:#30363d;color:#e6edf3}
    }`;

  function showGate() {
    if (document.getElementById("senditto-gate")) return;
    const el = document.createElement("div");
    el.id = "senditto-gate";
    el.innerHTML = `
      <style>${style}</style>
      <form class="box" autocomplete="on">
        <h1>Sign in to Senditto</h1>
        <p>Authenticate against the Senditto control database. Access requires a real account.</p>
        <div class="err" hidden></div>
        <label for="sg-email">Email</label>
        <input id="sg-email" type="email" name="email" autocomplete="username" required>
        <label for="sg-pass">Password</label>
        <input id="sg-pass" type="password" name="password" autocomplete="current-password" required>
        <button type="submit">Sign in</button>
      </form>`;
    document.documentElement.appendChild(el);

    const form = el.querySelector("form");
    const err = el.querySelector(".err");
    const btn = el.querySelector("button");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      btn.disabled = true;
      btn.textContent = "Signing in...";
      try {
        const res = await fetch(`${base()}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Senditto-Client": "platform" },
          body: JSON.stringify({
            email: el.querySelector("#sg-email").value.trim(),
            password: el.querySelector("#sg-pass").value,
            purpose: "platform",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Sign in failed");
        localStorage.setItem(
          SESS_KEY,
          JSON.stringify({ token: data.token, expiresAt: data.expiresAt, user: data.user })
        );
        el.remove();
        window.dispatchEvent(new CustomEvent("senditto:auth-success", { detail: data }));
        window.SendittoAPI?.hydrate?.().catch?.(() => {});
      } catch (e2) {
        err.textContent = e2.message || "Sign in failed";
        err.hidden = false;
        btn.disabled = false;
        btn.textContent = "Sign in";
      }
    });
  }

  // Block first, ask questions later: the gate is up before the app renders and
  // only comes down once the server confirms the stored token.
  showGate();
  verify(session()?.token).then((ok) => {
    if (ok) document.getElementById("senditto-gate")?.remove();
    else clearSession();
  });

  window.SendittoGate = {
    signOut() {
      const t = session()?.token;
      clearSession();
      if (t) {
        fetch(`${base()}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
        }).catch(() => {});
      }
      location.reload();
    },
    session,
  };
})();
