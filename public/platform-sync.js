/**
 * Senditto Platform — live data bridge.
 *
 * Every page reads and writes through window.SendittoStore. This layer makes
 * that store a view of the control database instead of browser storage:
 *
 *   • on sign-in it loads the account's real rows,
 *   • add/update/remove are written through to the database,
 *   • a server-sent event stream applies changes made anywhere else.
 *
 * All traffic goes to this site's own /api/platform/* routes, which attach the
 * session server-side. Nothing here knows where the database lives.
 */
(() => {
  const store = () => window.SendittoStore;

  /** Store collection → API collection. */
  const REMOTE = {
    workspaces: "workspaces",
    domains: "domains",
    keys: "keys",
    messages: "messages",
    suppressions: "suppressions",
    contacts: "contacts",
    templates: "templates",
    campaigns: "campaigns",
    webhooks: "webhooks",
  };

  let ready = false; // true once the first real load has landed
  let applying = false; // guards against echoing server changes back
  const pending = new Map(); // local id → server id, for rows created offline

  async function api(path, { method = "GET", body } = {}) {
    const res = await fetch(`/api/platform${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  /* ------------------------- server → store ------------------------- */

  const mapRow = {
    workspaces: (w) => ({
      id: w.id,
      name: w.name,
      type: w.type || "Developer",
      region: w.region || "",
      timezone: w.timezone || "",
      status: w.status || "Active",
      ownerUserId: w.owner_user_id || null,
      ownerEmail: w.owner_email || "",
      color: "#367ef5",
      members: [],
      envs: [],
      createdAt: w.created_at,
      updatedAt: w.updated_at || w.created_at,
    }),
    domains: (d) => ({
      id: d.id,
      workspaceId: d.workspace_id,
      domain: d.domain,
      name: d.domain,
      status: d.status,
      spf: d.spf,
      dkim: d.dkim,
      dmarc: d.dmarc,
      createdAt: d.created_at,
    }),
    keys: (k) => ({
      id: k.id,
      workspaceId: k.workspace_id,
      name: k.name,
      prefix: k.key_prefix,
      environment: k.environment,
      scopes: k.scopes,
      status: k.status,
      createdAt: k.created_at,
      lastUsedAt: k.last_used,
    }),
    messages: (m) => ({
      id: m.id,
      workspaceId: m.workspace_id,
      stream: m.stream,
      from: m.from_email,
      to: m.to_email,
      subject: m.subject,
      status: m.status,
      opens: m.opens,
      clicks: m.clicks,
      createdAt: m.created_at,
    }),
    suppressions: (s) => ({
      id: s.id,
      workspaceId: s.workspace_id,
      email: s.email,
      reason: s.reason,
      createdAt: s.created_at,
    }),
    contacts: (c) => ({
      id: c.id,
      workspaceId: c.workspace_id,
      name: c.name,
      email: c.email,
      status: c.status,
      tags: c.tags || [],
      createdAt: c.created_at,
    }),
    templates: (t) => ({
      id: t.id,
      workspaceId: t.workspace_id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      updatedAt: t.updated_at,
      createdAt: t.created_at,
    }),
    campaigns: (c) => ({
      id: c.id,
      workspaceId: c.workspace_id,
      name: c.name,
      subject: c.subject,
      status: c.status,
      sent: c.sent,
      opens: c.opens,
      clicks: c.clicks,
      createdAt: c.created_at,
    }),
    webhooks: (w) => ({
      id: w.id,
      workspaceId: w.workspace_id,
      name: w.name,
      url: w.url,
      events: w.events || [],
      status: w.status,
      createdAt: w.created_at,
    }),
  };

  /** Store field → server field, for writes. */
  function toServer(collection, row) {
    const out = { ...row };
    if (out.workspaceId) out.workspace_id = out.workspaceId;
    if (collection === "domains" && out.name && !out.domain) out.domain = out.name;
    if (collection === "keys" && out.lastUsedAt) delete out.lastUsedAt;
    delete out.createdAt;
    delete out.updatedAt;
    return out;
  }

  function applyState(state) {
    const s = store();
    if (!s || !state) return;
    applying = true;
    try {
      for (const [local, remote] of Object.entries(REMOTE)) {
        const rows = state[remote];
        if (Array.isArray(rows)) s.replaceAll(local, rows.map(mapRow[local]));
      }
      if (Array.isArray(state.logs)) {
        s.replaceAll(
          "logs",
          state.logs.map((l) => ({
            id: l.id,
            level: l.level,
            event: l.event,
            message: l.message,
            createdAt: l.created_at,
          }))
        );
      }
      if (state.user) {
        s.setSettings({
          displayName: state.user.displayName || state.user.display_name || "",
          email: state.user.email || "",
        });
      }
      const current = s.get?.();
      const list = s.list?.("workspaces") || [];
      if (list.length && current && !list.some((w) => w.id === current.selectedWorkspaceId)) {
        s.selectWorkspace(list[0].id);
      }
    } finally {
      applying = false;
    }
    ready = true;
    s.emit?.("platform:hydrated", { at: state.at });
    window.dispatchEvent(new CustomEvent("senditto:data", { detail: { at: state.at } }));
  }

  async function load() {
    const state = await api("/state");
    applyState(state);
    return state;
  }

  /* ------------------------- store → server ------------------------- */

  function wrapWrites() {
    const s = store();
    if (!s || s.__synced) return;
    s.__synced = true;

    const localAdd = s.add;
    const localUpdate = s.update;
    const localRemove = s.remove;

    s.add = (collection, row) => {
      const created = localAdd.call(s, collection, row);
      const remote = REMOTE[collection];
      if (!applying && ready && remote) {
        api(`/data/${remote}`, { method: "POST", body: toServer(collection, created) })
          .then((res) => {
            // The database assigns the real id. The store pins row ids, so
            // remember the mapping instead: later edits and deletes of this
            // row address the right record, and the next stream-triggered
            // reload swaps in the stored row for good.
            const saved = res.row || res;
            if (saved && saved.id && saved.id !== created.id) pending.set(created.id, saved.id);
          })
          .catch((err) => reportWriteFailure(collection, err, () => localRemove.call(s, collection, created.id)));
      }
      return created;
    };

    s.update = (collection, id, patch) => {
      const updated = localUpdate.call(s, collection, id, patch);
      const remote = REMOTE[collection];
      if (!applying && ready && remote) {
        const serverId = pending.get(id) || id;
        api(`/data/${remote}/${encodeURIComponent(serverId)}`, {
          method: "PATCH",
          body: toServer(collection, patch),
        }).catch((err) => reportWriteFailure(collection, err));
      }
      return updated;
    };

    s.remove = (collection, id) => {
      const removed = localRemove.call(s, collection, id);
      const remote = REMOTE[collection];
      if (!applying && ready && remote) {
        const serverId = pending.get(id) || id;
        api(`/data/${remote}/${encodeURIComponent(serverId)}`, { method: "DELETE" }).catch((err) =>
          reportWriteFailure(collection, err)
        );
      }
      return removed;
    };
  }

  function reportWriteFailure(collection, err, undo) {
    console.error(`[Senditto] could not save ${collection}`, err);
    if (undo) {
      applying = true;
      try {
        undo();
      } finally {
        applying = false;
      }
    }
    const message = err && err.message ? err.message : "Change could not be saved.";
    if (typeof window.SendittoAlert === "function") window.SendittoAlert(message);
    window.dispatchEvent(new CustomEvent("senditto:save-failed", { detail: { collection, message } }));
  }

  /* --------------------------- live stream --------------------------- */

  let stream = null;
  let reloadTimer = null;
  let streamState = "connecting";

  /**
   * The page shows a live indicator, so the indicator has to be told the truth
   * rather than assuming the connection is up. The badge is updated in place —
   * rebuilding the page for a status dot would be a visible flash.
   */
  function setStreamState(next) {
    if (streamState === next) return;
    streamState = next;
    const label = next === "live" ? "Live" : next === "offline" ? "Reconnecting" : "Connecting";
    document.querySelectorAll(".sd-live[data-stream]").forEach((el) => {
      el.dataset.state = next;
      el.innerHTML = `<i></i>${label}`;
    });
    window.dispatchEvent(new CustomEvent("senditto:stream", { detail: { state: next } }));
  }

  function startStream() {
    if (stream) return;
    setStreamState("connecting");
    try {
      stream = new EventSource("/api/platform/stream", { withCredentials: true });
    } catch {
      setStreamState("offline");
      return;
    }
    stream.onopen = () => setStreamState("live");
    stream.onmessage = (e) => {
      setStreamState("live");
      let event;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      if (event.type === "overview" && event.data) {
        window.dispatchEvent(new CustomEvent("senditto:overview", { detail: event.data }));
        return;
      }
      if (event.type === "change") {
        // Reload the account's slice: cheap, always correct, and respects
        // the per-account scoping the database applies.
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => load().catch(() => {}), 250);
      }
    };
    stream.onerror = () => {
      setStreamState("offline");
      stream?.close();
      stream = null;
      // Come back quickly: a live page that has stopped listening is worse
      // than one that reconnects a little eagerly.
      setTimeout(startStream, 3000);
    };
  }

  function stopStream() {
    stream?.close();
    stream = null;
  }

  /* ----------------------------- lifecycle ----------------------------- */

  async function start() {
    wrapWrites();
    try {
      await load();
      startStream();
    } catch {
      ready = false;
    }
  }

  window.SendittoSync = {
    start,
    reload: load,
    stop: stopStream,
    isReady: () => ready,
    streamState: () => streamState,
  };

  window.addEventListener("senditto:signed-in", start);
  // Already signed in from a previous visit.
  document.addEventListener("DOMContentLoaded", () => {
    if (window.SendittoAuth?.isAuthenticated()) start();
    else window.SendittoAuth?.restore().then((u) => u && start());
  });
})();
