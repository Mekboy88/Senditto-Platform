/**
 * Workspace manager — real empty workspaces via SendittoStore.
 */
(() => {
  const S = () => window.SendittoStore;
  function store() {
    const s = S();
    if (!s || typeof s.list !== "function") throw new Error("Platform store is still loading. Click Try again.");
    return s;
  }
  const icon = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${
      {
        plus: '<path d="M12 5v14M5 12h14"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6A7 7 0 0 0 8.8 7L6.4 6 4.5 9.5 6.6 11a7 7 0 0 0 0 2L4.5 14.5 6.4 18l2.4-1a7 7 0 0 0 1.6 1l.3 2.6h4L15 18a7 7 0 0 0 1.6-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
        globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        check: '<path d="m20 6-11 11-5-5"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        edit: '<path d="m4 20 4-1 11-11-3-3L5 16Z"/><path d="m14 6 3 3"/>',
        key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-3 3 3 3m-6 0 3 3"/>',
        server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
      }[n] || ""
    }</svg>`;

  let tab = "general";
  const host = () => document.getElementById("senditto-platform-root");
  const esc = (v) =>
    String(v || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function workspaces() {
    return store().get().workspaces;
  }
  function current() {
    return store().currentWorkspace();
  }
  function initial(w) {
    return esc(w.icon || (w.name || "W")[0]);
  }
  function avatar(w, cls = "wm-avatar") {
    return `<span class="${cls}" style="--wm-color:${esc(w.color || "#367ef5")}">${w.image ? `<img src="${esc(w.image)}" alt="">` : initial(w)}</span>`;
  }

  function render() {
    const h = host();
    if (!h) return;
    const w = current();
    if (!w) return;
    const list = workspaces();
    h.dataset.workspaceManager = "true";
    const memberCount = new Set(list.flatMap((x) => (x.members || []).map((m) => m[1] || m.email))).size;
    const envCount = list.reduce((a, x) => a + (x.envs || []).length, 0);
    h.innerHTML = `<div class="wm-page"><div class="wm-head"><div><small class="wm-kicker">WORKSPACE CONTROL</small><h1>Manage workspaces</h1><p>Configure teams, environments, sending and security from one place.</p></div><div class="wm-head-actions"><button class="wm-btn" data-wm-audit>${icon("shield")} View audit log</button><button class="wm-btn primary" data-wm-create>${icon("plus")} Create workspace</button></div></div><div class="wm-stats">${stat("settings", "Workspaces", list.length)}${stat("users", "Team members", memberCount)}${stat("server", "Environments", envCount)}${stat("shield", "Security", w.security?.mfa ? "MFA on" : "Basic")}</div><div class="wm-layout"><aside class="wm-card wm-workspace-list"><div class="wm-list-title">YOUR WORKSPACES</div>${list
      .map(
        (x) =>
          `<button class="wm-workspace ${x.id === w.id ? "active" : ""}" data-wm-select="${esc(x.id)}">${avatar(x)}<div><b>${esc(x.name)}</b><small>${esc(x.type)}</small></div>${x.id === w.id ? icon("check") : ""}</button>`
      )
      .join("")}<button class="wm-btn wm-list-create" data-wm-create>${icon("plus")} Create another workspace</button></aside><main class="wm-card wm-main"><header class="wm-main-header"><div class="wm-workspace-top"><div class="wm-icon-title">${avatar(w)}<div><h2>${esc(w.name)}</h2><p>${esc(w.type)}${w.region ? ` · ${esc(w.region)}` : ""}</p></div><span class="wm-status">${esc(w.status)}</span></div><div class="wm-actions"><button class="wm-btn" data-wm-switch>${icon("check")} Current workspace</button><button class="wm-btn" data-wm-rename>${icon("edit")} Rename</button></div></div></header><nav class="wm-tabs">${[
      ["general", "General"],
      ["members", "Members & roles"],
      ["environments", "Environments"],
      ["sending", "Sending defaults"],
      ["security", "Security"],
    ]
      .map((x) => `<button class="${tab === x[0] ? "active" : ""}" data-wm-tab="${x[0]}">${x[1]}</button>`)
      .join("")}</nav><div class="wm-panel">${panel(w)}</div></main></div></div>`;
    bind();
  }

  function stat(i, a, b) {
    return `<article class="wm-card wm-stat"><div class="wm-stat-row"><small>${a}</small><span>${icon(i)}</span></div><b>${b}</b></article>`;
  }

  function panel(w) {
    const members = w.members || [];
    const envs = w.envs || [];
    if (tab === "members") {
      return `<section class="wm-section"><div class="wm-card-head"><div><h3>Members and access</h3><p>Control who can access this workspace and what they can do.</p></div><button class="wm-btn primary" data-wm-invite>${icon("plus")} Invite member</button></div>${
        members.length
          ? members
              .map(
                (m, i) =>
                  `<div class="wm-member"><span class="wm-avatar">${esc((m[0] || m.name || "?")[0])}</span><div><b>${esc(m[0] || m.name)}</b><small>${esc(m[1] || m.email)}</small></div><span class="wm-role">${esc(m[2] || m.role)}</span>${(m[2] || m.role) !== "Owner" ? `<button class="wm-btn small" data-wm-member="${i}">Manage</button>` : ""}</div>`
              )
              .join("")
          : `<div class="wm-empty"><p>No members yet. Invite your first teammate.</p></div>`
      }</section><section class="wm-section"><div class="wm-card-head"><div><h3>Role permissions</h3><p>Owner, Admin, Developer, Marketer and Viewer roles use scoped access.</p></div><button class="wm-btn" data-wm-roles>Review permissions</button></div></section>`;
    }
    if (tab === "environments") {
      return `<section class="wm-section"><div class="wm-card-head"><div><h3>Workspace environments</h3><p>Separate live traffic, staging tests and local development.</p></div><button class="wm-btn primary" data-wm-env>${icon("plus")} Add environment</button></div>${
        envs.length
          ? envs
              .map(
                (e, i) =>
                  `<div class="wm-env"><span class="wm-avatar">${esc((e[0] || e.name || "E")[0])}</span><div><b>${esc(e[0] || e.name)}</b><small>${esc(e[1] || e.endpoint)}</small></div><span class="wm-env-badge ${(e[2] || e.status) === "Live" ? "live" : ""}">${esc(e[2] || e.status || "Active")}</span><button class="wm-btn small" data-wm-env-edit="${i}">Configure</button></div>`
              )
              .join("")
          : `<div class="wm-empty"><p>No environments yet. Add Production, Staging or Development.</p></div>`
      }</section>`;
    }
    if (tab === "sending") {
      const s = w.sending || {};
      return `<section class="wm-section"><div class="wm-card-head"><div><h3>Default sending configuration</h3><p>New emails inherit these settings unless overridden.</p></div></div><div class="wm-form"><label>Default stream<select class="wm-select" data-wm-send-stream><option ${s.stream === "Transactional" ? "selected" : ""}>Transactional</option><option ${s.stream === "Marketing" ? "selected" : ""}>Marketing</option><option ${s.stream === "Automations" ? "selected" : ""}>Automations</option></select></label><label>Default sender<input class="wm-input" data-wm-send-from value="${esc(s.from || "")}" placeholder="Name &lt;you@yourdomain.com&gt;"></label><label>Reply-to address<input class="wm-input" type="email" data-wm-send-reply value="${esc(s.replyTo || "")}" placeholder="reply@yourdomain.com"></label><label>Sending region<select class="wm-select" data-wm-send-region><option>Automatic</option><option>Europe</option><option>North America</option><option>Asia Pacific</option></select></label></div></section><section class="wm-section">${toggle("tracking", "Open and click tracking", "Measure message engagement by default", !!s.tracking)}${toggle("unsubscribe", "Automatic unsubscribe footer", "Required automatically for marketing streams", !!s.unsubscribe)}${toggle("sandbox", "Test-mode protection", "Prevent development traffic reaching real contacts", !!s.sandbox)}</section><div class="wm-actions"><button class="wm-btn primary" data-wm-save>Save sending defaults</button></div>`;
    }
    if (tab === "security") {
      const sec = w.security || {};
      return `<section class="wm-section wm-security-score"><span>${sec.mfa ? "90" : "60"}</span><div><h3>Workspace security</h3><p>${sec.mfa ? "MFA recommended settings are enabled." : "Enable MFA and domain lock for stronger protection."}</p></div></section><section class="wm-section">${toggle("mfa", "Require multi-factor authentication", "Enforce MFA for administrators and developers", !!sec.mfa)}${toggle("domainLock", "Domain-change protection", "Require owner confirmation for DNS and domain changes", !!sec.domainLock)}${toggle("approvals", "Two-person production approval", "Require approval before production-key changes", !!sec.approvals)}${toggle("audit", "Extended audit retention", "Keep security and configuration events for 12 months", !!sec.audit)}</section><section class="wm-section"><div class="wm-card-head"><div><h3>Active sessions and API access</h3><p>Review trusted devices, API keys and recent security events.</p></div><button class="wm-btn" data-wm-sessions>Review access</button></div></section>`;
    }
    return `<section class="wm-section"><div class="wm-card-head"><div><h3>Workspace profile</h3><p>Basic identity and regional configuration.</p></div><button class="wm-btn" data-wm-logo>Change icon</button></div><div class="wm-form"><label>Workspace name<input class="wm-input" data-wm-name value="${esc(w.name)}"></label><label>Workspace type<select class="wm-select" data-wm-type><option ${w.type === "Developer workspace" ? "selected" : ""}>Developer workspace</option><option ${w.type === "Marketing workspace" ? "selected" : ""}>Marketing workspace</option><option ${w.type === "Business workspace" ? "selected" : ""}>Business workspace</option></select></label><label>Primary region<select class="wm-select" data-wm-region><option value="">Not set</option><option ${w.region === "Europe (London)" ? "selected" : ""}>Europe (London)</option><option ${w.region === "North America (Virginia)" ? "selected" : ""}>North America (Virginia)</option><option ${w.region === "Asia Pacific (Singapore)" ? "selected" : ""}>Asia Pacific (Singapore)</option></select></label><label>Timezone<input class="wm-input" data-wm-timezone value="${esc(w.timezone || "")}"></label><label class="full">Workspace ID<input class="wm-input" value="${esc(w.id)}" readonly></label></div><div class="wm-actions" style="margin-top:17px"><button class="wm-btn primary" data-wm-save-profile>Save changes</button></div></section><section class="wm-section wm-danger"><div class="wm-card-head"><div><h3>Delete workspace</h3><p>Permanently remove this workspace from local platform data.</p></div><button class="wm-btn danger" data-wm-delete>Delete workspace</button></div></section>`;
  }

  function toggle(k, title, copy, on) {
    return `<div class="wm-switch-row"><div><b>${title}</b><small>${copy}</small></div><button class="wm-toggle ${on ? "on" : ""}" data-wm-toggle="${k}"><i></i></button></div>`;
  }

  function modal(content, wide = false) {
    document.querySelector(".wm-modal")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="wm-modal"><button class="wm-backdrop" data-wm-close></button><section class="wm-dialog ${wide ? "wide" : ""}"><button class="wm-close" data-wm-close>${icon("close")}</button>${content}</section></div>`
    );
    const m = document.querySelector(".wm-modal");
    m.querySelectorAll("[data-wm-close]").forEach((b) => (b.onclick = () => m.remove()));
    return m;
  }

  function createWorkspace() {
    const m = modal(
      `<div class="wm-modal-icon">${icon("plus")}</div><h2>Create workspace</h2><p>Set up a separate team, environment and sending configuration.</p><form class="wm-form"><label>Workspace name<input class="wm-input" name="name" placeholder="e.g. Product team" required></label><label>Workspace type<select class="wm-select" name="type"><option>Developer workspace</option><option>Marketing workspace</option><option>Business workspace</option></select></label><label>Primary region<select class="wm-select" name="region"><option value="">Not set</option><option>Europe (London)</option><option>North America (Virginia)</option><option>Asia Pacific (Singapore)</option></select></label><label>Timezone<input class="wm-input" name="timezone" value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || "")}"></label></form><div class="wm-modal-actions"><button class="wm-btn" data-wm-close>Cancel</button><button class="wm-btn primary" data-wm-create-save>Create workspace</button></div>`
    );
    m.querySelector("[data-wm-create-save]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      store().createWorkspace(Object.fromEntries(new FormData(f)));
      m.remove();
      render();
      toast("Workspace created");
    };
  }

  function invite() {
    const w = current();
    const m = modal(
      `<div class="wm-modal-icon">${icon("users")}</div><h2>Invite a member</h2><p>Invite someone with scoped access to ${esc(w.name)}.</p><form class="wm-form"><label class="full">Email address<input class="wm-input" type="email" name="email" placeholder="person@yourcompany.com" required></label><label>Role<select class="wm-select" name="role"><option>Admin</option><option>Developer</option><option>Marketer</option><option>Viewer</option></select></label></form><div class="wm-modal-actions"><button class="wm-btn" data-wm-close>Cancel</button><button class="wm-btn primary" data-wm-invite-save>Send invitation</button></div>`
    );
    m.querySelector("[data-wm-invite-save]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      const members = [...(w.members || []), [String(d.email).split("@")[0], d.email, d.role]];
      store().updateWorkspace(w.id, { members });
      store().logEvent("info", "workspace.invite", `Invited ${d.email} as ${d.role}`);
      m.remove();
      render();
      toast("Member added");
    };
  }

  function addEnvironment() {
    const w = current();
    const m = modal(
      `<div class="wm-modal-icon">${icon("server")}</div><h2>Add environment</h2><p>Create an isolated configuration for development, staging or production.</p><form class="wm-form"><label>Environment name<input class="wm-input" name="name" placeholder="Staging" required></label><label>Mode<select class="wm-select" name="mode"><option>Test mode</option><option>Production mode</option></select></label><label class="full">Endpoint label<input class="wm-input" name="endpoint" placeholder="staging.yourdomain.com" required></label></form><div class="wm-modal-actions"><button class="wm-btn" data-wm-close>Cancel</button><button class="wm-btn primary" data-wm-env-save>Add environment</button></div>`
    );
    m.querySelector("[data-wm-env-save]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      const envs = [...(w.envs || []), [d.name, d.endpoint, d.mode === "Production mode" ? "Live" : "Active"]];
      store().updateWorkspace(w.id, { envs });
      m.remove();
      render();
      toast("Environment added");
    };
  }

  function changeIcon() {
    const w = current();
    const colors = ["#367ef5", "#21b59b", "#7656e8", "#ef6e91", "#f39a48", "#17233d"];
    const m = modal(
      `<div class="wm-modal-icon">${icon("edit")}</div><h2>Workspace icon</h2><p>Choose an initial and brand colour, or upload a square image.</p><div class="wm-icon-editor">${avatar(w, "wm-avatar wm-avatar-preview")}<div class="wm-icon-options"><label>Icon letter<input class="wm-input" maxlength="2" data-wm-icon-letter value="${initial(w)}"></label><div class="wm-colors">${colors
        .map(
          (c) =>
            `<button type="button" style="--c:${c}" data-wm-color="${c}" class="${(w.color || "#367ef5") === c ? "active" : ""}" aria-label="Choose ${c}"></button>`
        )
        .join("")}</div><label class="wm-upload">${icon("plus")} Upload image<input type="file" accept="image/png,image/jpeg,image/webp" data-wm-icon-file></label><button class="wm-btn small" data-wm-icon-remove>Use initial instead</button></div></div><div class="wm-modal-actions"><button class="wm-btn" data-wm-close>Cancel</button><button class="wm-btn primary" data-wm-icon-save>Save icon</button></div>`
    );
    let color = w.color || "#367ef5";
    let image = w.image || "";
    const preview = m.querySelector(".wm-avatar-preview");
    const letter = m.querySelector("[data-wm-icon-letter]");
    m.querySelectorAll("[data-wm-color]").forEach((b) => {
      b.onclick = () => {
        color = b.dataset.wmColor;
        preview.style.setProperty("--wm-color", color);
        m.querySelectorAll("[data-wm-color]").forEach((x) => x.classList.toggle("active", x === b));
      };
    });
    letter.oninput = () => {
      image = "";
      preview.innerHTML = esc(letter.value.slice(0, 2).toUpperCase() || w.name[0]);
    };
    m.querySelector("[data-wm-icon-file]").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        image = reader.result;
        preview.innerHTML = `<img src="${esc(image)}" alt="">`;
      };
      reader.readAsDataURL(f);
    };
    m.querySelector("[data-wm-icon-remove]").onclick = () => {
      image = "";
      preview.innerHTML = esc(letter.value || w.name[0]);
    };
    m.querySelector("[data-wm-icon-save]").onclick = () => {
      store().updateWorkspace(w.id, {
        icon: (letter.value || w.name[0]).slice(0, 2).toUpperCase(),
        color,
        image,
      });
      m.remove();
      render();
      toast("Workspace icon updated");
    };
  }

  function manageMember(index) {
    const w = current();
    const member = (w.members || [])[index];
    if (!member) return;
    const m = modal(
      `<div class="wm-modal-icon">${icon("users")}</div><h2>Manage member</h2><p>${esc(member[1])}</p><form class="wm-form"><label>Role<select class="wm-select" name="role">${["Admin", "Developer", "Marketer", "Viewer"]
        .map((x) => `<option ${member[2] === x ? "selected" : ""}>${x}</option>`)
        .join("")}</select></label></form><div class="wm-modal-actions split"><button class="wm-btn danger" data-wm-remove-member>Remove member</button><span></span><button class="wm-btn" data-wm-close>Cancel</button><button class="wm-btn primary" data-wm-member-save>Save access</button></div>`
    );
    m.querySelector("[data-wm-member-save]").onclick = () => {
      const members = [...w.members];
      members[index] = [member[0], member[1], m.querySelector("[name=role]").value];
      store().updateWorkspace(w.id, { members });
      m.remove();
      render();
      toast("Member access updated");
    };
    m.querySelector("[data-wm-remove-member]").onclick = () => {
      const members = w.members.filter((_, i) => i !== index);
      store().updateWorkspace(w.id, { members });
      m.remove();
      render();
      toast("Member removed");
    };
  }

  function configureEnvironment(index) {
    const w = current();
    const env = (w.envs || [])[index];
    if (!env) return;
    const m = modal(
      `<div class="wm-modal-icon">${icon("server")}</div><h2>Configure ${esc(env[0])}</h2><form class="wm-form"><label>Environment name<input class="wm-input" name="name" value="${esc(env[0])}"></label><label>Mode<select class="wm-select" name="mode"><option ${env[2] === "Live" ? "selected" : ""}>Production</option><option ${env[2] !== "Live" ? "selected" : ""}>Test</option></select></label><label class="full">Endpoint<input class="wm-input" name="endpoint" value="${esc(env[1])}"></label></form><div class="wm-modal-actions"><button class="wm-btn" data-wm-close>Cancel</button><button class="wm-btn primary" data-wm-env-config-save>Save configuration</button></div>`
    );
    m.querySelector("[data-wm-env-config-save]").onclick = () => {
      const envs = [...w.envs];
      envs[index] = [
        m.querySelector("[name=name]").value,
        m.querySelector("[name=endpoint]").value,
        m.querySelector("[name=mode]").value === "Production" ? "Live" : "Active",
      ];
      store().updateWorkspace(w.id, { envs });
      m.remove();
      render();
      toast("Environment updated");
    };
  }

  function reviewRoles() {
    modal(
      `<div class="wm-modal-icon">${icon("key")}</div><h2>Role permissions</h2><p>Workspace permissions are scoped by role.</p><div class="wm-role-grid"><b>Permission</b><b>Admin</b><b>Developer</b><b>Marketer</b><b>Viewer</b>${["Manage members", "Manage API keys", "Send transactional email", "Build campaigns", "View analytics"]
        .map(
          (p, i) =>
            `<span>${p}</span>${[0, 1, 2, 3]
              .map((r) => `<i class="${r <= [0, 1, 2, 2, 3][i] ? "yes" : ""}">${r <= [0, 1, 2, 2, 3][i] ? "✓" : "—"}</i>`)
              .join("")}`
        )
        .join("")}</div><div class="wm-modal-actions"><button class="wm-btn primary" data-wm-close>Done</button></div>`,
      true
    );
  }

  function reviewAccess() {
    const keys = store().list("keys");
    const m = modal(
      `<div class="wm-modal-icon">${icon("shield")}</div><h2>Access review</h2><p>Sessions and credentials for ${esc(current().name)}.</p><div class="wm-review-tabs"><button class="active" data-review="sessions">Sessions</button><button data-review="keys">API keys</button></div><div data-review-panel="sessions"><div class="wm-env"><span class="wm-avatar">C</span><div><b>This browser</b><small>Local session · Active now</small></div><span class="wm-env-badge live">Current</span></div></div><div data-review-panel="keys" hidden>${
        keys.length
          ? keys
              .map(
                (x) =>
                  `<div class="wm-env"><span class="wm-avatar">K</span><div><b>${esc(x.name)}</b><small>${esc(x.detail || "")} · ${esc(store().formatRelative(x.updatedAt))}</small></div><button class="wm-btn small" data-wm-revoke-key="${esc(x.id)}">Revoke</button></div>`
              )
              .join("")
          : "<p>No API keys yet.</p>"
      }</div><div class="wm-modal-actions"><button class="wm-btn primary" data-wm-close>Done</button></div>`,
      true
    );
    m.querySelectorAll("[data-review]").forEach((b) => {
      b.onclick = () => {
        m.querySelectorAll("[data-review]").forEach((x) => x.classList.toggle("active", x === b));
        m.querySelectorAll("[data-review-panel]").forEach(
          (x) => (x.hidden = x.dataset.reviewPanel !== b.dataset.review)
        );
      };
    });
    m.querySelectorAll("[data-wm-revoke-key]").forEach((b) => {
      b.onclick = () => {
        store().update("keys", b.dataset.wmRevokeKey, { status: "Revoked" });
        b.closest(".wm-env").remove();
        toast("Key revoked");
      };
    });
  }

  function deleteWorkspace() {
    const w = current();
    if (workspaces().length === 1) {
      toast("At least one workspace is required");
      return;
    }
    const m = modal(
      `<div class="wm-modal-icon">${icon("shield")}</div><h2>Delete ${esc(w.name)}?</h2><p>This cannot be undone.</p><div class="wm-confirm">Type <b>${esc(w.name)}</b> to confirm deletion.</div><input class="wm-input" data-wm-confirm placeholder="${esc(w.name)}"><div class="wm-modal-actions"><button class="wm-btn" data-wm-close>Cancel</button><button class="wm-btn danger" data-wm-delete-confirm disabled>Delete permanently</button></div>`
    );
    const input = m.querySelector("[data-wm-confirm]");
    const button = m.querySelector("[data-wm-delete-confirm]");
    input.oninput = () => (button.disabled = input.value !== w.name);
    button.onclick = () => {
      store().deleteWorkspace(w.id);
      m.remove();
      render();
      toast("Workspace deleted");
    };
  }

  function bind() {
    const h = host();
    const w = current();
    h.querySelectorAll("[data-wm-select]").forEach((b) => {
      b.onclick = () => {
        store().selectWorkspace(b.dataset.wmSelect);
        render();
      };
    });
    h.querySelectorAll("[data-wm-tab]").forEach((b) => {
      b.onclick = () => {
        tab = b.dataset.wmTab;
        render();
      };
    });
    h.querySelectorAll("[data-wm-create]").forEach((b) => (b.onclick = createWorkspace));
    h.querySelector("[data-wm-switch]")?.addEventListener("click", () =>
      toast(`${current().name} is already active`)
    );
    h.querySelector("[data-wm-rename]")?.addEventListener("click", () => {
      tab = "general";
      render();
      setTimeout(() => host().querySelector("[data-wm-name]")?.focus(), 0);
    });
    h.querySelector("[data-wm-save-profile]")?.addEventListener("click", () => {
      store().updateWorkspace(w.id, {
        name: h.querySelector("[data-wm-name]").value,
        type: h.querySelector("[data-wm-type]").value,
        region: h.querySelector("[data-wm-region]").value,
        timezone: h.querySelector("[data-wm-timezone]").value,
      });
      render();
      toast("Workspace profile saved");
    });
    h.querySelectorAll("[data-wm-toggle]").forEach((b) => {
      b.onclick = () => {
        const key = b.dataset.wmToggle;
        if (["tracking", "unsubscribe", "sandbox"].includes(key)) {
          const sending = { ...(w.sending || {}), [key]: !w.sending?.[key] };
          store().updateWorkspace(w.id, { sending });
        } else {
          const security = { ...(w.security || {}), [key]: !w.security?.[key] };
          store().updateWorkspace(w.id, { security });
        }
        render();
      };
    });
    h.querySelector("[data-wm-invite]")?.addEventListener("click", invite);
    h.querySelector("[data-wm-env]")?.addEventListener("click", addEnvironment);
    h.querySelectorAll("[data-wm-member]").forEach(
      (b) => (b.onclick = () => manageMember(Number(b.dataset.wmMember)))
    );
    h.querySelectorAll("[data-wm-env-edit]").forEach(
      (b) => (b.onclick = () => configureEnvironment(Number(b.dataset.wmEnvEdit)))
    );
    h.querySelector("[data-wm-save]")?.addEventListener("click", () => {
      store().updateWorkspace(w.id, {
        sending: {
          ...(w.sending || {}),
          stream: h.querySelector("[data-wm-send-stream]")?.value,
          from: h.querySelector("[data-wm-send-from]")?.value,
          replyTo: h.querySelector("[data-wm-send-reply]")?.value,
          region: h.querySelector("[data-wm-send-region]")?.value,
        },
      });
      toast("Sending defaults saved");
      render();
    });
    h.querySelector("[data-wm-audit]")?.addEventListener("click", () => {
      const logs = store().list("logs").slice(0, 20);
      modal(
        `<div class="wm-modal-icon">${icon("shield")}</div><h2>Workspace audit log</h2><p>Recent configuration and access events.</p>${
          logs.length
            ? logs
                .map(
                  (x) =>
                    `<div class="wm-env"><span class="wm-avatar">✓</span><div><b>${esc(x.message || x.event)}</b><small>${esc(store().formatRelative(x.createdAt))}</small></div><span class="wm-env-badge live">${esc(x.level)}</span></div>`
                )
                .join("")
            : "<p>No audit events yet.</p>"
        }`,
        true
      );
    });
    h.querySelector("[data-wm-roles]")?.addEventListener("click", reviewRoles);
    h.querySelector("[data-wm-sessions]")?.addEventListener("click", reviewAccess);
    h.querySelector("[data-wm-logo]")?.addEventListener("click", changeIcon);
    h.querySelector("[data-wm-delete]")?.addEventListener("click", deleteWorkspace);
  }

  function toast(t) {
    document.querySelector(".wm-toast")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="wm-toast">${icon("check")} ${esc(t)}</div>`
    );
    setTimeout(() => document.querySelector(".wm-toast")?.remove(), 2200);
  }

  
  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.workspaces = () => render();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelector(".wm-modal")?.remove();
  });
})();
