/**
 * Senditto Platform — sign-in client.
 *
 * Talks only to this site's own /api/auth/* routes, which verify the account
 * against the Senditto control database server-side. The session lives in an
 * HttpOnly cookie, so no token is readable by page scripts, and nothing here
 * can grant access on its own: `verified` is set only after the database has
 * accepted the credentials.
 */
(() => {
  let verified = false;
  let profile = null;

  /**
   * A readable hint the server sets beside the session cookie. It lets the app
   * paint the dashboard immediately on a refresh instead of flashing the
   * marketing site while the session is confirmed. It grants nothing: the
   * HttpOnly session cookie is the only thing the server trusts, and if it
   * turns out to be gone we clear the hint and return to signed-out.
   */
  const hasHint = () => /(?:^|;\s*)senditto_ui=1(?:;|$)/.test(document.cookie);

  function clearHint() {
    document.cookie = "senditto_ui=; Path=/; Max-Age=0; SameSite=Lax";
  }

  /** Read synchronously, before React renders, so the first paint is right. */
  window.SendittoBoot = {
    view: () => (hasHint() ? "dashboard" : null),
    signedIn: hasHint,
  };

  async function post(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Sign in failed");
    return data;
  }

  const SendittoAuth = {
    /** True only once the control database has accepted this visitor. */
    isAuthenticated: () => verified,
    user: () => profile,

    async signIn(email, password) {
      const data = await post("/api/auth/login", { email, password });
      verified = true;
      profile = data.user || { email };
      window.dispatchEvent(new CustomEvent("senditto:signed-in", { detail: profile }));
      return profile;
    },

    /** Create a real account, then sign straight in. */
    async signUp({ email, password, name, company } = {}) {
      const data = await post("/api/auth/register", { email, password, name, company });
      verified = true;
      profile = data.user || { email };
      window.dispatchEvent(new CustomEvent("senditto:signed-in", { detail: profile }));
      return profile;
    },

    /**
     * Restore a session left by a previous visit.
     *
     * The only thing that signs anyone out here is the server positively
     * saying the session is gone (401). A failed check — server restarting,
     * network dropped, request timed out — leaves you signed in and retries.
     * Anything else turns a one-second blip into "it logged me out again".
     */
    async restore({ retries = 4 } = {}) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        let res = null;
        try {
          res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        } catch {
          res = null; // unreachable — not a sign-out
        }

        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          verified = !!data.authenticated;
          profile = data.user || null;
          sessionStorage.removeItem("senditto_session_expired");
          return verified ? profile : null;
        }

        if (res && res.status === 401) {
          // The server is certain: this session is over.
          clearHint();
          verified = false;
          profile = null;
          return null;
        }

        // Could not verify. Keep the session and try again shortly.
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, Math.min(400 * 2 ** attempt, 4000)));
        }
      }

      // Still unverified. Stay signed in — the cookies are untouched, and any
      // genuine problem will surface on the next real request.
      console.warn("[Senditto] could not verify the session; staying signed in");
      return profile;
    },

    async signOut() {
      verified = false;
      profile = null;
      try {
        await post("/api/auth/logout");
      } catch {
        /* cookie is cleared server-side regardless */
      }
      location.reload();
    },
  };

  window.SendittoAuth = SendittoAuth;
  SendittoAuth.restore();
})();
