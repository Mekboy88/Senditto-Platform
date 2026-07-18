/**
 * Senditto platform client store.
 * Empty-by-default, real-time (in-browser) state until the database ships.
 * No demo, mock, or seed content.
 */
(() => {
  const STORAGE_KEY = "senditto_platform_v2";
  const STORAGE_VERSION = 5;
  const LEGACY_KEYS = [
    "senditto_platform_pages",
    "senditto_templates",
    "senditto_campaigns",
    "senditto_workspaces",
    "senditto_workspace_selected",
    "senditto_messages",
    "senditto_send_draft",
  ];

  const listeners = new Set();

  function uid(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function formatRelative(iso) {
    if (!iso) return "—";
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "—";
    const diff = Date.now() - t;
    if (diff < 45_000) return "Just now";
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
    if (diff < 604_800_000) return `${Math.round(diff / 86_400_000)} d ago`;
    return new Date(iso).toLocaleDateString();
  }

  function emptyState() {
    const workspaceId = uid("ws");
    const ts = nowIso();
    return {
      version: STORAGE_VERSION,
      selectedWorkspaceId: workspaceId,
      workspaces: [
        {
          id: workspaceId,
          name: "My workspace",
          type: "Developer workspace",
          region: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
          status: "Active",
          color: "#367ef5",
          icon: "",
          image: "",
          members: [],
          envs: [],
          sending: {
            stream: "Transactional",
            from: "",
            replyTo: "",
            region: "Automatic",
            tracking: true,
            unsubscribe: true,
            sandbox: true,
          },
          security: {
            mfa: false,
            domainLock: true,
            approvals: false,
            audit: true,
            sso: false,
            ipAllowlist: false,
            sessionTimeoutMin: 480,
            apiKeyRotationDays: 90,
            newDevice: true,
            sensitive: true,
          },
          createdAt: ts,
          updatedAt: ts,
        },
      ],
      contacts: [],
      segments: [],
      inbound: [],
      domains: [],
      keys: [],
      webhooks: [],
      automations: [],
      templates: [],
      campaigns: [],
      messages: [],
      logs: [],
      audit: [],
      suppressions: [],
      senders: [],
      smtpCredentials: [],
      batches: [],
      ipPools: [],
      otps: [],
      integrations: [],
      teamInvites: [],
      tracking: {
        openTracking: true,
        clickTracking: true,
        unsubscribeHeader: true,
        utmDefaults: true,
      },

      streams: [
        {
          id: "stream_tx",
          name: "Transactional",
          type: "transactional",
          priority: "High",
          dailyCap: 0,
          status: "Ready",
          createdAt: ts,
          updatedAt: ts,
        },
        {
          id: "stream_mkt",
          name: "Marketing",
          type: "marketing",
          priority: "Normal",
          dailyCap: 0,
          status: "Ready",
          createdAt: ts,
          updatedAt: ts,
        },
        {
          id: "stream_auto",
          name: "Automations",
          type: "automations",
          priority: "Normal",
          dailyCap: 0,
          status: "Ready",
          createdAt: ts,
          updatedAt: ts,
        },
      ],
      capacity: {
        monthlyQuota: 1000000,
        burstPerSecond: 100,
        concurrentSends: 50,
        regions: ["eu-west", "us-east"],
        dedicatedIp: false,
        warmupEnabled: true,
      },
      settings: defaultSettings(),
    };
  }

  function defaultSettings() {
    return {
      displayName: "",
      email: "",
      jobTitle: "",
      phone: "",
      language: "English",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      dateFormat: "YYYY-MM-DD",
      notifications: {
        deliveryIncidents: true,
        weeklyReport: false,
        securityActivity: true,
        productUpdates: false,
        billingAlerts: true,
        complianceDeadlines: true,
        dsarRequests: true,
        bounceSpike: true,
        complaintSpike: true,
        digestChannel: "email",
      },
      privacy: {
        analytics: false,
        regional: true,
        diagnostics: false,
        shareSubprocessors: true,
        minimizePiiInLogs: true,
      },
      securityPrefs: {
        mfa: false,
        newDevice: true,
        sensitive: true,
        loginAlerts: true,
      },
      sendingDefaults: {
        brandName: "",
        defaultFrom: "",
        defaultReplyTo: "",
        defaultStream: "Transactional",
        footerText: "",
        trackingDefault: true,
        sandboxDefault: true,
        openTracking: true,
        clickTracking: true,
      },
      compliance: {
        companyLegalName: "",
        tradingName: "",
        companyNumber: "",
        vatTaxId: "",
        physicalAddress: "",
        city: "",
        regionState: "",
        postalCode: "",
        country: "",
        supportEmail: "",
        privacyPolicyUrl: "",
        termsUrl: "",
        cookiePolicyUrl: "",
        imprintUrl: "",
        preferenceCenterUrl: "",
        dpoName: "",
        dpoEmail: "",
        // Email / marketing law controls
        includePhysicalAddress: true,
        includeUnsubscribe: true,
        listUnsubscribeHeader: true,
        oneClickUnsubscribe: true,
        identifySender: true,
        noDeceptiveSubjects: true,
        commercialVsTransactional: true,
        honorGlobalUnsub: true,
        suppressionsForever: true,
        doubleOptIn: true,
        consentRecords: true,
        lawfulBasisDefault: "consent",
        caslExpressConsent: true,
        caslImpliedConsentTracking: true,
        // Regional frameworks (workspace operates under these)
        frameworks: {
          canSpam: true,
          casl: true,
          gdpr: true,
          ukGdpr: true,
          peCr: true,
          ccpa: true,
          lgpd: true,
          pipeda: false,
          appAu: false,
          pdpaSg: false,
          popia: false,
        },
        dpaAccepted: false,
        sccAccepted: false,
        dataResidency: "eu-west",
        messageRetentionDays: 90,
        logRetentionDays: 365,
        eventRetentionDays: 180,
        auditRetentionDays: 730,
        breachNotifyHours: 72,
        dsarSlaDays: 30,
        coppaNoChildren: true,
        noSpecialCategoryData: true,
        accessibilityStatementUrl: "",
        lastComplianceReview: "",
      },
      plan: "Scale",
      monthlyAllowance: 1000000,
      /* Account lifecycle / privacy rights (GDPR Art.17, CCPA delete, etc.) */
      accountLifecycle: {
        status: "active", // active | pending_deletion | deleted
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        deletionReason: "",
        deletionConfirmEmail: "",
        legalHold: false,
        doNotSellShare: false,
        restrictProcessing: false,
        objectToProcessing: false,
        marketingConsentWithdrawn: false,
      },
      rightsRequests: [], // DSAR / erasure / portability tickets
    };
  }

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== "object") return base;
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const [k, v] of Object.entries(patch)) {
      if (v && typeof v === "object" && !Array.isArray(v) && base && typeof base[k] === "object" && base[k] && !Array.isArray(base[k])) {
        out[k] = deepMerge(base[k], v);
      } else if (v !== undefined) {
        out[k] = v;
      }
    }
    return out;
  }

  // Declare state first so persist() never hits the temporal dead zone.
  let state = null;

  function persist(next) {
    if (arguments.length > 0) state = next;
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }

  function migrateAndLoad() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.workspaces)) {
          const base = emptyState();
          const merged = { ...base, ...parsed, version: STORAGE_VERSION };
          // Ensure new scale collections always exist
          for (const key of ["suppressions", "streams", "capacity", "keys", "domains", "webhooks", "messages", "logs", "senders", "smtpCredentials", "batches", "ipPools", "otps", "integrations", "teamInvites"]) {
            if (merged[key] == null) merged[key] = base[key];
          }
          if (!Array.isArray(merged.streams) || !merged.streams.length) merged.streams = base.streams;
          if (!merged.capacity) merged.capacity = base.capacity;
          if (!merged.tracking) merged.tracking = base.tracking;
          merged.settings = deepMerge(defaultSettings(), merged.settings || {});
          // ensure workspace security defaults
          merged.workspaces = (merged.workspaces || []).map((w) => ({
            ...w,
            security: deepMerge(
              {
                mfa: false,
                domainLock: true,
                approvals: false,
                audit: true,
                sso: false,
                ipAllowlist: false,
                sessionTimeoutMin: 480,
                apiKeyRotationDays: 90,
                newDevice: true,
                sensitive: true,
              },
              w.security || {}
            ),
          }));
          return merged;
        }
      }
    } catch {
      /* ignore corrupt storage */
    }

    // Drop legacy demo stores completely — start clean.
    for (const key of LEGACY_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }

    return emptyState();
  }

  state = migrateAndLoad();
  persist();

  function emit(type, detail) {
    const event = { type, detail, at: nowIso() };
    listeners.forEach((fn) => {
      try {
        fn(event, state);
      } catch {
        /* listener error */
      }
    });
    window.dispatchEvent(new CustomEvent("senditto:store", { detail: event }));
  }

  function snapshot() {
    return structuredClone(state);
  }

  function get() {
    return state;
  }

  function currentWorkspace() {
    return (
      state.workspaces.find((w) => w.id === state.selectedWorkspaceId) ||
      state.workspaces[0] ||
      null
    );
  }

  function selectWorkspace(id) {
    if (!state.workspaces.some((w) => w.id === id)) return;
    state.selectedWorkspaceId = id;
    persist();
    emit("workspace:select", { id });
  }

  function collection(name) {
    if (!Array.isArray(state[name])) state[name] = [];
    return state[name];
  }

  function list(name) {
    return [...collection(name)];
  }

  function add(name, item) {
    const record = {
      id: item.id || uid(name.slice(0, 3)),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...item,
    };
    collection(name).unshift(record);
    persist();
    logEvent("info", `${name}.create`, `Created ${name.slice(0, -1) || name}`, {
      id: record.id,
    });
    emit(`${name}:create`, record);
    return record;
  }

  function update(name, id, patch) {
    const items = collection(name);
    const index = items.findIndex((x) => x.id === id);
    if (index < 0) return null;
    items[index] = { ...items[index], ...patch, id, updatedAt: nowIso() };
    persist();
    emit(`${name}:update`, items[index]);
    return items[index];
  }

  function remove(name, id) {
    const items = collection(name);
    const index = items.findIndex((x) => x.id === id);
    if (index < 0) return false;
    const [removed] = items.splice(index, 1);
    persist();
    logEvent("info", `${name}.delete`, `Deleted ${name.slice(0, -1) || name}`, { id });
    emit(`${name}:delete`, removed);
    return true;
  }

  function replaceAll(name, items) {
    state[name] = Array.isArray(items) ? items : [];
    persist();
    emit(`${name}:replace`, null);
  }

  function setSettings(patch) {
    state.settings = deepMerge(state.settings || defaultSettings(), patch || {});
    persist();
    emit("settings:update", state.settings);
  }

  function updateWorkspace(id, patch) {
    const index = state.workspaces.findIndex((w) => w.id === id);
    if (index < 0) return null;
    state.workspaces[index] = {
      ...state.workspaces[index],
      ...patch,
      id,
      updatedAt: nowIso(),
    };
    persist();
    emit("workspace:update", state.workspaces[index]);
    return state.workspaces[index];
  }

  function createWorkspace(fields) {
    const id = uid("ws");
    const workspace = {
      id,
      name: fields.name || "Untitled workspace",
      type: fields.type || "Developer workspace",
      region: fields.region || "",
      timezone: fields.timezone || state.settings.timezone || "",
      status: "Active",
      color: fields.color || "#367ef5",
      icon: "",
      image: "",
      members: [],
      envs: [],
      sending: {
        stream: "Transactional",
        from: "",
        replyTo: "",
        region: "Automatic",
        tracking: true,
        unsubscribe: true,
        sandbox: true,
      },
      security: {
        mfa: false,
        domainLock: true,
        approvals: false,
        audit: true,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.workspaces.push(workspace);
    state.selectedWorkspaceId = id;
    persist();
    logEvent("info", "workspace.create", `Workspace “${workspace.name}” created`, { id });
    emit("workspace:create", workspace);
    return workspace;
  }

  function deleteWorkspace(id) {
    if (state.workspaces.length <= 1) return false;
    state.workspaces = state.workspaces.filter((w) => w.id !== id);
    if (state.selectedWorkspaceId === id) {
      state.selectedWorkspaceId = state.workspaces[0].id;
    }
    persist();
    emit("workspace:delete", { id });
    return true;
  }

  function logEvent(level, event, message, meta = {}) {
    const entry = {
      id: uid("log"),
      level, // success | warning | error | info
      event,
      message,
      meta,
      createdAt: nowIso(),
    };
    state.logs.unshift(entry);
    if (state.logs.length > 500) state.logs.length = 500;
    persist();
    emit("logs:create", entry);
    return entry;
  }

  function queueMessage(payload) {
    const message = add("messages", {
      name: payload.subject || "Untitled message",
      to: payload.to || [],
      from: payload.from || "",
      subject: payload.subject || "",
      body: payload.body || "",
      html: payload.html || "",
      stream: payload.stream || "Transactional",
      status: payload.status || "Queued",
      latency: "—",
      ...payload,
    });
    logEvent("success", "POST /v1/emails", `Message queued · ${message.subject || message.id}`, {
      messageId: message.id,
      status: message.status,
    });
    return message;
  }

  function metrics() {
    const messages = state.messages;
    const sent = messages.length;
    const delivered = messages.filter((m) =>
      /delivered|opened|clicked/i.test(m.status || "")
    ).length;
    const opened = messages.filter((m) => /opened|clicked/i.test(m.status || "")).length;
    const clicked = messages.filter((m) => /clicked/i.test(m.status || "")).length;
    const bounced = messages.filter((m) => /bounce/i.test(m.status || "")).length;
    const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");
    return {
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      deliveryRate: pct(delivered, sent),
      openRate: pct(opened, delivered || sent),
      clickRate: pct(clicked, delivered || sent),
      contacts: state.contacts.length,
      subscribed: state.contacts.filter((c) => c.status === "Subscribed").length,
      unsubscribed: state.contacts.filter((c) => c.status === "Unsubscribed").length,
      segments: state.segments.length,
      domains: state.domains.length,
      verifiedDomains: state.domains.filter((d) => /verified/i.test(d.status || "")).length,
      keys: state.keys.length,
      activeKeys: state.keys.filter((k) => /active/i.test(k.status || "")).length,
      webhooks: state.webhooks.length,
      automations: state.automations.length,
      liveAutomations: state.automations.filter((a) => /live|active/i.test(a.status || "")).length,
      templates: state.templates.length,
      campaigns: state.campaigns.length,
      inbound: state.inbound.length,
      logs: state.logs.length,
      workspaces: state.workspaces.length,
    };
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function resetAll() {
    for (const key of LEGACY_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    state = emptyState();
    persist();
    emit("store:reset", null);
  }

  function exportJson() {
    return JSON.stringify(snapshot(), null, 2);
  }

  function logRightsRequest(type, detail = {}) {
    const req = {
      id: uid("rights"),
      type,
      detail,
      status: "recorded",
      createdAt: nowIso(),
    };
    if (!Array.isArray(state.settings.rightsRequests)) state.settings.rightsRequests = [];
    state.settings.rightsRequests.unshift(req);
    state.settings.rightsRequests = state.settings.rightsRequests.slice(0, 200);
    persist();
    logEvent("info", `rights.${type}`, `Rights request: ${type}`, detail);
    emit("rights:request", req);
    return req;
  }

  /** Schedule account deletion (grace period) — GDPR erasure / CCPA delete style. */
  function requestAccountDeletion({ reason = "", email = "", graceDays = 30 } = {}) {
    const days = Math.max(0, Number(graceDays) || 30);
    const when = new Date(Date.now() + days * 86400000).toISOString();
    state.settings.accountLifecycle = {
      ...(state.settings.accountLifecycle || {}),
      status: "pending_deletion",
      deletionRequestedAt: nowIso(),
      deletionScheduledFor: when,
      deletionReason: reason || "",
      deletionConfirmEmail: email || state.settings.email || "",
    };
    persist();
    logRightsRequest("account_deletion_scheduled", { reason, email, graceDays: days, when });
    emit("account:deletion_scheduled", state.settings.accountLifecycle);
    return state.settings.accountLifecycle;
  }

  function cancelAccountDeletion() {
    state.settings.accountLifecycle = {
      ...(state.settings.accountLifecycle || {}),
      status: "active",
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      deletionReason: "",
      deletionConfirmEmail: "",
    };
    persist();
    logRightsRequest("account_deletion_cancelled", {});
    emit("account:deletion_cancelled", null);
    return state.settings.accountLifecycle;
  }

  /**
   * Immediately erase all local account/workspace data (right to erasure / delete account).
   * Production will call the backend; here we wipe local control-plane state.
   */
  function deleteAccountNow({ reason = "" } = {}) {
    logRightsRequest("account_deleted", { reason, mode: "immediate" });
    resetAll();
    // After reset, mark that a deletion completed (ephemeral flag for UI)
    try {
      sessionStorage.setItem(
        "senditto_account_deleted",
        JSON.stringify({ at: nowIso(), reason })
      );
    } catch {
      /* ignore */
    }
    emit("account:deleted", { reason });
    return true;
  }

  function setPrivacyRight(key, value) {
    state.settings.accountLifecycle = {
      ...(state.settings.accountLifecycle || {}),
      [key]: !!value,
    };
    persist();
    logRightsRequest(`privacy_right_${key}`, { value: !!value });
    emit("rights:privacy", { key, value: !!value });
    return state.settings.accountLifecycle;
  }

  window.SendittoStore = {
    STORAGE_KEY,
    uid,
    nowIso,
    formatRelative,
    get,
    snapshot,
    persist: () => persist(),
    subscribe,
    emit,
    list,
    add,
    update,
    remove,
    replaceAll,
    setSettings,
    currentWorkspace,
    selectWorkspace,
    updateWorkspace,
    createWorkspace,
    deleteWorkspace,
    logEvent,
    queueMessage,
    metrics,
    resetAll,
    exportJson,
    logRightsRequest,
    requestAccountDeletion,
    cancelAccountDeletion,
    deleteAccountNow,
    setPrivacyRight,
  };

  // One-time purge banner for previous demo localStorage
  try {
    if (!localStorage.getItem("senditto_platform_clean_v2")) {
      for (const key of LEGACY_KEYS) localStorage.removeItem(key);
      localStorage.setItem("senditto_platform_clean_v2", "1");
    }
  } catch {
    /* ignore */
  }
})();
