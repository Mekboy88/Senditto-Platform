/**
 * Senditto Platform — browser history.
 *
 * The app never recorded where it had been, so the browser's Back button had
 * nothing of ours to return to and left the site entirely. This records each
 * step — every page you open in the dashboard, and the sign-in panel — so Back
 * walks back through the platform one step at a time, and only leaves once
 * there is genuinely nothing left to go back to.
 *
 * It writes to the URL fragment only, so nothing is ever re-requested from the
 * server: going back is instant and never reloads the app.
 */
(() => {
  const KEY = "senditto";
  let applyingPop = false; // set while restoring, so we never re-record a step

  const routerReady = () => typeof window.SendittoNavigate === "function";
  const authPanel = () => document.querySelector(".auth-overlay");
  const inDashboard = () => Boolean(document.querySelector(".dashboard-shell"));

  const stateOf = (e) => (e && e.state && e.state[KEY]) || null;

  function entry(data, replace) {
    const url = data.route ? `#/${data.route}` : data.auth ? "#/sign-in" : "#/";
    const payload = { [KEY]: data };
    try {
      if (replace) history.replaceState(payload, "", url);
      else history.pushState(payload, "", url);
    } catch {
      /* history unavailable — navigation still works, just without Back */
    }
  }

  /** Record a page the operator opened. */
  function recordRoute(route) {
    if (applyingPop || !route) return;
    const current = stateOf({ state: history.state });
    if (current && current.route === route) return; // already the top of the stack
    entry({ route }, !current);
  }

  /** Record the sign-in / create-account panel opening. */
  function recordAuth(mode) {
    if (applyingPop) return;
    const current = stateOf({ state: history.state });
    if (current && current.auth) return;
    entry({ auth: mode || "signin" }, false);
  }

  function closeAuthPanel() {
    document.querySelector(".auth-overlay .auth-close")?.click();
  }

  /* ------------------------------ going back ------------------------------ */

  window.addEventListener("popstate", (e) => {
    const target = stateOf(e);
    applyingPop = true;
    try {
      if (target && target.auth) {
        // Going back *to* the panel: if it was closed, this is as far as our
        // own history goes; leave the page as it is rather than reopening it.
        return;
      }

      // Anything else means the panel should not be showing.
      if (authPanel()) closeAuthPanel();

      if (target && target.route && routerReady()) {
        window.SendittoNavigate(target.route);
      }
    } finally {
      // Let the router settle before recording anything again.
      setTimeout(() => {
        applyingPop = false;
      }, 350);
    }
  });

  /* ------------------------------ recording ------------------------------ */

  // Wrap the router's own navigate so every page change is a step back.
  function wrapNavigate() {
    if (!routerReady() || window.SendittoNavigate.__historyWrapped) return;
    const inner = window.SendittoNavigate;
    const wrapped = (route, opts) => {
      const result = inner(route, opts);
      recordRoute(route);
      return result;
    };
    wrapped.__historyWrapped = true;
    window.SendittoNavigate = wrapped;
  }

  let lastRoute = null;
  let lastAuth = false;

  // The dashboard's own sidebar buttons do not go through SendittoNavigate, so
  // watch what is actually on screen and record real changes either way.
  function watch() {
    wrapNavigate();

    const root = document.querySelector("[data-platform-root]");
    const route = root ? root.dataset.route : null;
    if (route && route !== lastRoute && inDashboard()) {
      lastRoute = route;
      recordRoute(route);
    }

    const open = Boolean(authPanel());
    if (open !== lastAuth) {
      lastAuth = open;
      if (open) recordAuth(document.querySelector(".auth-overlay")?.dataset.mode);
    }
  }

  const start = () => {
    // Seed the stack so the first Back has something of ours to return to.
    if (!history.state || !history.state[KEY]) entry({ landing: true }, true);
    setInterval(watch, 250);
    watch();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
