/**
 * Senditto Platform ↔ live control API bridge
 * Real authentication + hydrate workspace data from PostgreSQL.
 * Network endpoints stay in local config only (never rendered in UI).
 */
(() => {
  const CFG_KEY = "senditto_platform_api_cfg_v1";
  const SESS_KEY = "senditto_platform_session_v1";

  function defaultCfg() {
    const local = window.SENDITTO_PLATFORM_CONFIG || {};
    return {
      apiBase: local.apiBase || "",
      // optional machine bootstrap — prefer user login
    };
  }

  function loadCfg() {
    try {
      // window config always wins for apiBase so local-platform-config.js is authoritative
      const stored = JSON.parse(localStorage.getItem(CFG_KEY) || "{}") || {};
      const base = defaultCfg();
      return {
        ...stored,
        ...base,
        apiBase: base.apiBase || stored.apiBase || "",
      };
    } catch {
      return defaultCfg();
    }
  }

  function saveCfg(patch) {
    const next = { ...loadCfg(), ...patch };
    localStorage.setItem(CFG_KEY, JSON.stringify(next));
    return next;
  }

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(SESS_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveSession(s) {
    if (!s) localStorage.removeItem(SESS_KEY);
    else localStorage.setItem(SESS_KEY, JSON.stringify(s));
  }

  function apiBase() {
    return (loadCfg().apiBase || "").replace(/\/$/, "");
  }

  async function request(path, { method = "GET", body, token } = {}) {
    const base = apiBase();
    if (!base) throw new Error("Platform API is not configured");
    const headers = {
      "Content-Type": "application/json",
      "X-Senditto-Client": "platform",
    };
    const t = token || loadSession()?.token;
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  async function login(email, password) {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: { email, password, purpose: "platform" },
      token: null,
    });
    const session = {
      token: data.token,
      expiresAt: data.expiresAt,
      user: data.user,
    };
    saveSession(session);
    await hydrateFromServer(session.token);
    return session;
  }

  async function logout() {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    saveSession(null);
  }

  async function hydrateFromServer(token) {
    const store = window.SendittoStore;
    if (!store) return null;
    const state = await request("/api/platform/state", { token });
    // Map server rows into local store collections (best-effort shape)
    const me = state.user || loadSession()?.user;
    const allWorkspaces = (state.workspaces || []).map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type || "Developer workspace",
      region: w.region || "",
      timezone: w.timezone || "",
      status: w.status || "Active",
      ownerUserId: w.owner_user_id || null,
      ownerEmail: w.owner_email || "",
      color: "#367ef5",
      icon: "",
      image: "",
      members: [],
      envs: [],
      sending: { stream: "Transactional", from: "", replyTo: "", region: "Automatic", tracking: true, unsubscribe: true, sandbox: true },
      security: { mfa: false, domainLock: true, approvals: false, audit: true },
      createdAt: w.created_at,
      updatedAt: w.updated_at || w.created_at,
    }));
    // Product users only see their own workspaces; staff (owner/admin) see all for support
    const staff = me && ["owner", "admin", "operator"].includes(me.role);
    const workspaces = staff
      ? allWorkspaces
      : allWorkspaces.filter((w) => !w.ownerUserId || w.ownerUserId === me?.id || w.ownerEmail === me?.email);
    if (workspaces.length) {
      store.replaceAll?.("workspaces", workspaces);
      const cur = store.get?.();
      if (cur && !workspaces.find((w) => w.id === cur.selectedWorkspaceId)) {
        store.selectWorkspace?.(workspaces[0].id);
      }
    }
    store.replaceAll?.(
      "domains",
      (state.domains || []).map((d) => ({
        id: d.id,
        workspaceId: d.workspace_id,
        domain: d.domain,
        name: d.domain,
        status: d.status,
        spf: d.spf,
        dkim: d.dkim,
        dmarc: d.dmarc,
        createdAt: d.created_at,
      }))
    );
    store.replaceAll?.(
      "keys",
      (state.keys || []).map((k) => ({
        id: k.id,
        workspaceId: k.workspace_id,
        name: k.name,
        prefix: k.key_prefix,
        scopes: k.scopes,
        status: k.status,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
      }))
    );
    store.replaceAll?.(
      "messages",
      (state.messages || []).map((m) => ({
        id: m.id,
        workspaceId: m.workspace_id,
        stream: m.stream,
        from: m.from_email,
        to: m.to_email,
        subject: m.subject,
        status: m.status,
        meta: m.meta,
        createdAt: m.created_at,
      }))
    );
    store.replaceAll?.(
      "logs",
      (state.logs || []).map((l) => ({
        id: l.id,
        level: l.level,
        event: l.event,
        message: l.message,
        meta: l.meta,
        createdAt: l.created_at,
      }))
    );
    store.replaceAll?.(
      "suppressions",
      (state.suppressions || []).map((s) => ({
        id: s.id,
        workspaceId: s.workspace_id,
        email: s.email,
        reason: s.reason,
        createdAt: s.created_at,
      }))
    );
    if (state.user) {
      store.setSettings?.({
        displayName: state.user.displayName || "",
        email: state.user.email || "",
      });
    }
    store.emit?.("platform:hydrated", { at: state.at });
    return state;
  }

  // Capture platform login form (SPA "Sign in securely")
  function bindLoginCapture() {
    document.addEventListener(
      "submit",
      async (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (!document.querySelector(".auth-overlay, .auth-form-side, form")) return;
        // Heuristic: password + email fields on auth screen
        const emailInput =
          form.querySelector('input[type="email"]') ||
          form.querySelector('input[name="email"]') ||
          form.querySelector('input[placeholder*="mail" i]');
        const passInput = form.querySelector('input[type="password"]');
        if (!emailInput || !passInput) return;
        if (!apiBase()) return; // local-only mode if API not configured

        e.preventDefault();
        e.stopPropagation();
        const email = emailInput.value.trim();
        const password = passInput.value;
        try {
          await login(email, password);
          // After real login, click SPA continue path if still needed
          const btn =
            form.querySelector('button[type="submit"]') ||
            document.querySelector('button:has-text("Sign in")') ||
            null;
          // Force SPA into dashboard by dispatching a custom event the router can use
          window.dispatchEvent(new CustomEvent("senditto:auth-success", { detail: loadSession() }));
          // Best-effort: click Sign in securely after setting a flag the SPA may ignore —
          // many previews just need any successful form; try Continue / Sign in buttons
          setTimeout(() => {
            const candidates = [...document.querySelectorAll("button")].filter((b) =>
              /sign in securely|continue|sign in/i.test(b.textContent || "")
            );
            // If still on auth, the SPA may require its own local auth — store a bridge flag
            sessionStorage.setItem("senditto_live_auth", "1");
            candidates[0]?.click();
          }, 50);
        } catch (err) {
          console.error("[SendittoAPI] login failed", err);
          (window.SendittoAlert || console.log)(err.message || "Login failed");
        }
      },
      true
    );
  }

  // Realtime poll hydrate
  let rtTimer = null;
  function startRealtimeHydrate() {
    clearInterval(rtTimer);
    if (!loadSession()?.token || !apiBase()) return;
    rtTimer = setInterval(() => {
      hydrateFromServer().catch(() => {});
    }, 5000);
  }

  async function createWorkspace(fields = {}) {
    // Always a user workspace owned by the signed-in account
    const data = await request("/api/workspaces", {
      method: "POST",
      body: {
        name: fields.name,
        type: fields.type,
        region: fields.region || "",
        timezone: fields.timezone || "",
        status: fields.status || "Active",
        // server defaults owner_user_id to the authenticated user
      },
    });
    await hydrateFromServer();
    if (data.workspace?.id) window.SendittoStore?.selectWorkspace?.(data.workspace.id);
    return data.workspace;
  }

  async function updateWorkspace(id, fields = {}) {
    const data = await request(`/api/workspaces/${id}`, {
      method: "PATCH",
      body: {
        name: fields.name,
        type: fields.type,
        region: fields.region,
        timezone: fields.timezone,
        status: fields.status,
      },
    });
    await hydrateFromServer();
    return data.workspace;
  }

  async function deleteWorkspace(id) {
    const data = await request(`/api/workspaces/${id}`, { method: "DELETE" });
    await hydrateFromServer();
    return data.workspace;
  }

  /** Prefer live control API for workspace CRUD so studio + platform stay aligned. */
  function patchStoreBridge() {
    const store = window.SendittoStore;
    if (!store || store.__sendittoApiBridge) return;
    const origCreate = store.createWorkspace?.bind(store);
    const origUpdate = store.updateWorkspace?.bind(store);
    const origDelete = store.deleteWorkspace?.bind(store);

    if (origCreate) {
      store.createWorkspace = (fields) => {
        if (window.SendittoAPI.isLive()) {
          return createWorkspace(fields).then(() => store.currentWorkspace());
        }
        return origCreate(fields);
      };
    }
    if (origUpdate) {
      store.updateWorkspace = (id, fields) => {
        // Local-only extras (members, envs, sending, security, color) stay in store;
        // shared profile fields sync to PostgreSQL when live.
        const local = origUpdate(id, fields);
        if (window.SendittoAPI.isLive()) {
          const profile = {};
          if (fields.name != null) profile.name = fields.name;
          if (fields.type != null) profile.type = fields.type;
          if (fields.region != null) profile.region = fields.region;
          if (fields.timezone != null) profile.timezone = fields.timezone;
          if (fields.status != null) profile.status = fields.status;
          if (Object.keys(profile).length) {
            updateWorkspace(id, profile).catch((e) => console.error("[SendittoAPI] workspace update", e));
          }
        }
        return local;
      };
    }
    if (origDelete) {
      store.deleteWorkspace = (id) => {
        if (window.SendittoAPI.isLive()) {
          return deleteWorkspace(id)
            .then(() => true)
            .catch((e) => {
              console.error("[SendittoAPI] workspace delete", e);
              (window.SendittoAlert || console.log)(e.message || "Could not delete workspace");
              return false;
            });
        }
        return origDelete(id);
      };
    }
    store.__sendittoApiBridge = true;
  }

  window.SendittoAPI = {
    loadCfg,
    saveCfg,
    loadSession,
    saveSession,
    login,
    logout,
    hydrateFromServer,
    request,
    startRealtimeHydrate,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    patchStoreBridge,
    isLive: () => !!(apiBase() && loadSession()?.token),
  };

  function boot() {
    bindLoginCapture();
    const sess = loadSession();
    const tryPatch = () => patchStoreBridge();
    if (window.SendittoStore) tryPatch();
    else document.addEventListener("DOMContentLoaded", tryPatch);
    setTimeout(tryPatch, 0);
    setTimeout(tryPatch, 500);
    if (sess?.token && apiBase()) {
      hydrateFromServer(sess.token)
        .then(() => {
          patchStoreBridge();
          startRealtimeHydrate();
        })
        .catch(() => {});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
