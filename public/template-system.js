/**
 * Templates & campaigns — empty real library via SendittoStore.
 */
(() => {
  const S = () => window.SendittoStore;
  function store() {
    const s = S();
    if (!s || typeof s.list !== "function") throw new Error("Platform store is still loading. Click Try again.");
    return s;
  }
  const svg = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${
      {
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
        edit: '<path d="m4 20 4-1 11-11-3-3L5 16Z"/><path d="m14 6 3 3"/>',
        template: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        check: '<path d="m20 6-11 11-5-5"/>',
        tag: '<path d="M20 13 11 22l-9-9V4h9Z"/><circle cx="7" cy="9" r="1"/>',
        spark: '<path d="m12 3 1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2Z"/>',
        send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      }[n] || ""
    }</svg>`;

  let filter = "All";
  let query = "";

  const host = () => document.getElementById("senditto-platform-root");
  const esc = (v) =>
    String(v || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function templates() {
    return store().list("templates");
  }
  function campaigns() {
    return store().list("campaigns");
  }
  function filtered() {
    return templates().filter(
      (t) =>
        (filter === "All" || t.tag === filter) &&
        `${t.name} ${t.subject} ${t.body}`.toLowerCase().includes(query.toLowerCase())
    );
  }
  function tags() {
    return ["All", ...new Set(templates().map((t) => t.tag).filter(Boolean))];
  }

  function renderTemplates() {
    const h = host();
    if (!h) return;
    h.dataset.templateSystem = "library";
    const list = filtered();
    h.innerHTML = `<div class="tpl-page"><div class="tpl-head"><div><small class="tpl-kicker">CONTENT SYSTEM</small><h1>Templates</h1><p>Reusable email designs for transactional and marketing messages.</p></div><div class="tpl-head-actions"><button class="tpl-btn" data-tpl-tags>${svg("tag")} Manage tags</button><button class="tpl-btn primary" data-tpl-new>${svg("plus")} New template</button></div></div><section class="tpl-card tpl-searchbar"><div class="tpl-search">${svg("search")}<input class="tpl-input" data-tpl-search value="${esc(query)}" placeholder="Search templates by name or content"></div><span><b>${list.length}</b> templates</span></section><div class="tpl-tags">${tags()
      .map((t) => `<button class="tpl-tag ${filter === t ? "active" : ""}" data-tpl-filter="${esc(t)}">${esc(t)}</button>`)
      .join("")}</div><div class="tpl-grid">${
      list.length
        ? list.map(card).join("")
        : `<div class="tpl-card tpl-empty">${svg("template")}<h3>No templates yet</h3><p>Create your first reusable template. This library starts empty — no demo content.</p></div>`
    }</div></div>`;
    bindLibrary();
  }

  function card(t) {
    return `<article class="tpl-card tpl-item"><div class="tpl-thumb"><div class="tpl-email-mini"><i></i><span></span><span></span><b>Continue</b></div></div><div class="tpl-item-body"><div class="tpl-card-head"><h3>${esc(t.name)}</h3><span class="tpl-badge">${esc(t.tag || "General")}</span></div><p>${esc(t.subject || "No subject")}</p><div class="tpl-meta"><span>Updated ${esc(store().formatRelative(t.updatedAt))}</span><span>Source template</span></div><div class="tpl-card-actions"><button class="tpl-btn" data-tpl-preview="${esc(t.id)}">${svg("eye")} Preview</button><button class="tpl-btn" data-tpl-edit="${esc(t.id)}">${svg("edit")} Edit</button><button class="tpl-btn" data-tpl-more="${esc(t.id)}">•••</button></div></div></article>`;
  }

  function renderCampaigns() {
    const h = host();
    if (!h) return;
    const items = campaigns();
    h.dataset.templateSystem = "campaigns";
    h.innerHTML = `<div class="tpl-page"><div class="tpl-head"><div><small class="tpl-kicker">CAMPAIGN WORKSPACE</small><h1>Campaigns</h1><p>Start with a template, then tailor it for the audience.</p></div><div class="tpl-head-actions"><button class="tpl-btn" data-campaign-draft>View drafts</button><button class="tpl-btn primary" data-campaign-new>${svg("plus")} Create campaign</button></div></div><div class="tpl-campaign-stats">${[
      ["Total campaigns", items.length],
      ["Active", items.filter((c) => c.status === "Active").length],
      ["Scheduled", items.filter((c) => c.status === "Scheduled").length],
      ["Templates", templates().length],
    ]
      .map((x) => `<div class="tpl-card"><small>${x[0]}</small><b>${x[1]}</b></div>`)
      .join("")}</div><section class="tpl-card tpl-campaign-list">${
      items.length
        ? items
            .map(
              (c) =>
                `<div class="tpl-campaign-row"><div><b>${esc(c.name)}</b><br><small>Using ${esc(c.template || "—")}</small></div><span>${esc(c.audience || "—")}</span><span class="tpl-status ${c.status === "Draft" ? "draft" : ""}">${esc(c.status || "Draft")}</span><small>${esc(store().formatRelative(c.updatedAt))}</small><button class="tpl-btn" data-campaign-open="${esc(c.id)}">Open</button></div>`
            )
            .join("")
        : `<div class="tpl-empty"><h3>No campaigns yet</h3><p>Create a campaign when you are ready to send. The list starts empty.</p></div>`
    }</section></div>`;
    bindCampaigns();
  }

  function modal(content, small = false) {
    document.querySelector(".tpl-modal")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="tpl-modal"><button class="tpl-backdrop" data-tpl-close></button><section class="tpl-dialog ${small ? "small" : ""}"><button class="tpl-close" data-tpl-close>${svg("close")}</button>${content}</section></div>`
    );
    const m = document.querySelector(".tpl-modal");
    m.querySelectorAll("[data-tpl-close]").forEach((b) => (b.onclick = () => m.remove()));
    return m;
  }

  function preview(t, action = "close") {
    const m = modal(
      `<h2>${esc(t.name)}</h2><p>${esc(t.tag || "General")} template · Preview</p><div class="tpl-preview"><div class="tpl-preview-email"><small>SENDITTO</small><h3>${esc(t.subject || "")}</h3><p>${esc(t.body || "")}</p></div></div><div class="tpl-modal-actions"><button class="tpl-btn" data-tpl-close>Close</button>${action === "apply" ? `<button class="tpl-btn primary" data-tpl-apply="${esc(t.id)}">${svg("check")} Apply template</button>` : ""}</div>`
    );
    m.querySelector("[data-tpl-apply]")?.addEventListener("click", () => applyTemplate(t, m));
  }

  function editor(t = null) {
    const m = modal(
      `<div class="tpl-editor-head"><span>${svg("template")}</span><div><h2>${t ? "Edit template" : "Create template"}</h2><p>Reusable source for future messages.</p></div></div><form class="tpl-form"><label>Template name<input class="tpl-input" name="name" value="${esc(t?.name || "")}" required></label><label>Tag<input class="tpl-input" name="tag" value="${esc(t?.tag || "Transactional")}" required></label><label class="full">Subject<input class="tpl-input" name="subject" value="${esc(t?.subject || "")}" required></label><label class="full">Message content<textarea class="tpl-textarea" name="body" required>${esc(t?.body || "")}</textarea></label></form><div class="tpl-modal-actions">${t ? `<button class="tpl-btn danger" data-tpl-delete>Delete</button>` : ""}<button class="tpl-btn" data-tpl-close>Cancel</button><button class="tpl-btn primary" data-tpl-save>${t ? "Update source" : "Save template"}</button></div>`,
      true
    );
    m.querySelector("[data-tpl-save]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      if (t) store().update("templates", t.id, d);
      else store().add("templates", d);
      m.remove();
      renderTemplates();
      notice(t ? "Template updated" : "Template saved");
    };
    m.querySelector("[data-tpl-delete]")?.addEventListener("click", () => {
      store().remove("templates", t.id);
      m.remove();
      renderTemplates();
      notice("Template removed");
    });
  }

  function browser(mode = "email") {
    const list = templates();
    if (!list.length) {
      notice("Create a template first");
      editor();
      return;
    }
    let chosen = list[0].id;
    let tag = "All";
    let q = "";
    const draw = () => {
      const items = list.filter(
        (t) =>
          (tag === "All" || t.tag === tag) &&
          `${t.name} ${t.subject}`.toLowerCase().includes(q.toLowerCase())
      );
      return `<div class="tpl-browser-grid">${items
        .map(
          (t) =>
            `<button class="tpl-browser-item ${chosen === t.id ? "selected" : ""}" data-browser-pick="${esc(t.id)}"><span class="tpl-badge">${esc(t.tag)}</span><h3>${esc(t.name)}</h3><p>${esc(t.subject)}</p><footer><span data-browser-preview="${esc(t.id)}">Preview</span><span>${chosen === t.id ? "Selected" : "Choose"}</span></footer></button>`
        )
        .join("")}</div>`;
    };
    const m = modal(
      `<h2>${mode === "campaign" ? "Choose a campaign template" : "Browse templates"}</h2><p>Search and preview before applying.</p><div class="tpl-browser-tools"><div class="tpl-search">${svg("search")}<input class="tpl-input" data-browser-search placeholder="Search the library"></div><button class="tpl-btn" data-browser-blank>Start blank</button></div><div class="tpl-tags" data-browser-tags>${tags()
        .map((t) => `<button class="tpl-tag ${tag === t ? "active" : ""}" data-browser-tag="${esc(t)}">${esc(t)}</button>`)
        .join("")}</div><div data-browser-list>${draw()}</div><div class="tpl-modal-actions"><button class="tpl-btn" data-tpl-close>Cancel</button><button class="tpl-btn primary" data-browser-apply>${mode === "campaign" ? "Continue with template" : "Apply template"}</button></div>`
    );
    function rebind() {
      m.querySelectorAll("[data-browser-pick]").forEach((b) => {
        b.onclick = (e) => {
          if (e.target.closest("[data-browser-preview]")) {
            preview(list.find((t) => t.id === b.dataset.browserPick));
            return;
          }
          chosen = b.dataset.browserPick;
          m.querySelector("[data-browser-list]").innerHTML = draw();
          rebind();
        };
      });
    }
    rebind();
    m.querySelector("[data-browser-search]").oninput = (e) => {
      q = e.target.value;
      m.querySelector("[data-browser-list]").innerHTML = draw();
      rebind();
    };
    m.querySelectorAll("[data-browser-tag]").forEach((b) => {
      b.onclick = () => {
        tag = b.dataset.browserTag;
        m.remove();
        browser(mode);
      };
    });
    m.querySelector("[data-browser-apply]").onclick = () => {
      const t = list.find((x) => x.id === chosen);
      mode === "campaign" ? campaignBuilder(t, m) : applyTemplate(t, m);
    };
    m.querySelector("[data-browser-blank]").onclick = () =>
      mode === "campaign"
        ? campaignBuilder({ name: "Blank campaign", subject: "", body: "" }, m)
        : (m.remove(), notice("Blank message ready"));
  }

  function applyTemplate(t, m) {
    m?.remove();
    const h = host();
    const subject = h?.querySelector('[data-input="subject"]');
    const body = h?.querySelector('[data-v2-body], [data-input="body"]');
    if (subject) {
      subject.value = t.subject || "";
      subject.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (body) {
      body.value = t.body || "";
      body.dispatchEvent(new Event("input", { bubbles: true }));
    }
    notice(`${t.name} applied`);
  }

  function campaignBuilder(t, old) {
    old?.remove();
    const m = modal(
      `<div class="tpl-editor-head"><span>${svg("send")}</span><div><h2>Create campaign</h2><p>Starting from ${esc(t.name || "blank")}</p></div></div><form class="tpl-form"><label>Campaign name<input class="tpl-input" name="name" value="${esc((t.name || "Campaign") + (t.name ? " campaign" : ""))}" required></label><label>Audience<input class="tpl-input" name="audience" value="" placeholder="e.g. All subscribed contacts" required></label><label class="full">Subject<input class="tpl-input" name="subject" value="${esc(t.subject || "")}" required></label><label>Delivery<select class="tpl-input" name="status"><option>Draft</option><option>Scheduled</option></select></label><label>Send time<input class="tpl-input" type="datetime-local" name="time"></label><label class="full">Campaign content<textarea class="tpl-textarea" name="body">${esc(t.body || "")}</textarea></label></form><div class="tpl-modal-actions"><button class="tpl-btn" data-tpl-close>Cancel</button><button class="tpl-btn primary" data-campaign-save>Save campaign</button></div>`
    );
    m.querySelector("[data-campaign-save]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f));
      store().add("campaigns", { ...d, template: t.name || "Blank" });
      m.remove();
      renderCampaigns();
      notice("Campaign created");
    };
  }

  function campaignEditor(id) {
    const c = campaigns().find((x) => x.id === id);
    if (!c) return;
    const m = modal(
      `<div class="tpl-editor-head"><span>${svg("send")}</span><div><h2>Edit campaign</h2><p>Update audience and delivery state.</p></div></div><form class="tpl-form"><label>Campaign name<input class="tpl-input" name="name" value="${esc(c.name)}" required></label><label>Audience<input class="tpl-input" name="audience" value="${esc(c.audience || "")}" required></label><label>Template<input class="tpl-input" value="${esc(c.template || "")}" readonly></label><label>Status<select class="tpl-input" name="status"><option ${c.status === "Draft" ? "selected" : ""}>Draft</option><option ${c.status === "Scheduled" ? "selected" : ""}>Scheduled</option><option ${c.status === "Active" ? "selected" : ""}>Active</option><option>Paused</option></select></label><label class="full">Subject<input class="tpl-input" name="subject" value="${esc(c.subject || c.name)}"></label><label class="full">Message content<textarea class="tpl-textarea" name="body">${esc(c.body || "")}</textarea></label></form><div class="tpl-modal-actions"><button class="tpl-btn danger" data-campaign-delete>Delete</button><button class="tpl-btn" data-tpl-close>Cancel</button><button class="tpl-btn primary" data-campaign-update>Save campaign</button></div>`,
      true
    );
    m.querySelector("[data-campaign-update]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      store().update("campaigns", c.id, Object.fromEntries(new FormData(f)));
      m.remove();
      renderCampaigns();
      notice("Campaign updated");
    };
    m.querySelector("[data-campaign-delete]").onclick = () => {
      store().remove("campaigns", c.id);
      m.remove();
      renderCampaigns();
      notice("Campaign deleted");
    };
  }

  function draftManager() {
    const drafts = campaigns().filter((c) => c.status === "Draft");
    const m = modal(
      `<h2>Campaign drafts</h2><p>Continue editing incomplete campaigns.</p><div class="tpl-campaign-list">${
        drafts.length
          ? drafts
              .map(
                (c) =>
                  `<div class="tpl-campaign-row"><div><b>${esc(c.name)}</b><br><small>${esc(c.template || "")}</small></div><span>${esc(c.audience || "")}</span><span class="tpl-status draft">Draft</span><button class="tpl-btn" data-draft-open="${esc(c.id)}">Edit</button></div>`
              )
              .join("")
          : '<div class="tpl-empty">No drafts are waiting.</div>'
      }</div><div class="tpl-modal-actions"><button class="tpl-btn primary" data-tpl-close>Done</button></div>`,
      true
    );
    m.querySelectorAll("[data-draft-open]").forEach((b) => {
      b.onclick = () => {
        m.remove();
        campaignEditor(b.dataset.draftOpen);
      };
    });
  }

  function tagManager() {
    const used = tags().filter((x) => x !== "All");
    const m = modal(
      `<h2>Manage template tags</h2><p>Tags currently organizing your library.</p>${
        used.length
          ? used
              .map(
                (x, i) =>
                  `<div class="tpl-guide"><span>${i + 1}</span><div><b>${esc(x)}</b><p>${templates().filter((t) => t.tag === x).length} templates use this tag.</p></div></div>`
              )
              .join("")
          : "<p>No tags yet — they appear when you create templates.</p>"
      }<form class="tpl-form"><label class="full">Add a new tag<input class="tpl-input" name="tag" placeholder="Product updates" required></label></form><div class="tpl-modal-actions"><button class="tpl-btn" data-tpl-close>Close</button><button class="tpl-btn primary" data-tag-save>Create starter template</button></div>`,
      true
    );
    m.querySelector("[data-tag-save]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      const tag = new FormData(f).get("tag");
      store().add("templates", {
        name: `${tag} template`,
        tag,
        subject: "",
        body: "",
      });
      m.remove();
      renderTemplates();
      notice("Tag created with an empty starter template");
    };
  }

  function bindLibrary() {
    const h = host();
    if (!h) return;
    const search = h.querySelector("[data-tpl-search]");
    if (search) search.oninput = (e) => {
      query = e.target.value;
      renderTemplates();
    };
    h.querySelectorAll("[data-tpl-filter]").forEach((b) => {
      b.onclick = () => {
        filter = b.dataset.tplFilter;
        renderTemplates();
      };
    });
    const neu = h.querySelector("[data-tpl-new]");
    if (neu) neu.onclick = () => editor();
    h.querySelectorAll("[data-tpl-preview]").forEach((b) => {
      b.onclick = () => preview(templates().find((t) => t.id === b.dataset.tplPreview));
    });
    h.querySelectorAll("[data-tpl-edit]").forEach((b) => {
      b.onclick = () => editor(templates().find((t) => t.id === b.dataset.tplEdit));
    });
    h.querySelectorAll("[data-tpl-more]").forEach((b) => {
      b.onclick = () => {
        const t = templates().find((x) => x.id === b.dataset.tplMore);
        if (!t) return;
        store().add("templates", { ...t, id: undefined, name: `${t.name} copy` });
        renderTemplates();
        notice("Template duplicated");
      };
    });
    const tags = h.querySelector("[data-tpl-tags]");
    if (tags) tags.onclick = tagManager;
  }

  function bindCampaigns() {
    const h = host();
    if (!h) return;
    h.querySelectorAll("[data-campaign-new]").forEach((b) => (b.onclick = () => browser("campaign")));
    const draft = h.querySelector("[data-campaign-draft]");
    if (draft) draft.onclick = draftManager;
    h.querySelectorAll("[data-campaign-open]").forEach(
      (b) => (b.onclick = () => campaignEditor(b.dataset.campaignOpen))
    );
  }

  function saveFromComposer() {
    const h = host();
    const subject = h?.querySelector('[data-input="subject"]')?.value || "";
    const body = h?.querySelector('[data-v2-body], [data-input="body"]')?.value || "";
    const m = modal(
      `<div class="tpl-editor-head"><span>${svg("template")}</span><div><h2>Save as template</h2><p>Store the current design as a reusable source.</p></div></div><form class="tpl-form"><label>Template name<input class="tpl-input" name="name" value="" placeholder="Template name" required></label><label>Tag<input class="tpl-input" name="tag" value="Transactional" required></label><label class="full">Subject<input class="tpl-input" name="subject" value="${esc(subject)}" required></label><label class="full">Message content<textarea class="tpl-textarea" name="body" required>${esc(body)}</textarea></label></form><div class="tpl-modal-actions"><button class="tpl-btn" data-tpl-close>Cancel</button><button class="tpl-btn primary" data-save-current>Save template</button></div>`,
      true
    );
    m.querySelector("[data-save-current]").onclick = () => {
      const f = m.querySelector("form");
      if (!f.reportValidity()) return;
      store().add("templates", Object.fromEntries(new FormData(f)));
      m.remove();
      notice("Saved as template");
    };
  }

  function notice(t) {
    document.querySelector(".tpl-notice")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="se-toast tpl-notice">${svg("check")} ${esc(t)}</div>`
    );
    setTimeout(() => document.querySelector(".tpl-notice")?.remove(), 2200);
  }

  function enhanceComposer() {
    const h = host();
    if (!h?.dataset.sendEnhanced) return;
    const use = h.querySelector('[data-act="template"]');
    if (use && !h.querySelector("[data-tpl-browse]")) {
      use.dataset.tplBrowse = "true";
      use.removeAttribute("data-act");
      use.innerHTML = `${svg("template")} Browse templates`;
      const saveBtn = document.createElement("button");
      saveBtn.dataset.tplSaveComposer = "true";
      saveBtn.className = "tpl-save-composer";
      saveBtn.innerHTML = `${svg("plus")} Save as template`;
      use.after(saveBtn);
    }
    h.querySelector("[data-tpl-browse]")?.addEventListener(
      "click",
      (e) => {
        e.stopImmediatePropagation();
        browser("email");
      },
      { once: true }
    );
    h.querySelector("[data-tpl-save-composer]")?.addEventListener(
      "click",
      () => {
        const subject = h.querySelector('[data-input="subject"]')?.value || "";
        const body = h.querySelector('[data-v2-body], [data-input="body"]')?.value || "";
        editor({ id: null, name: "", tag: "Transactional", subject, body });
      },
      { once: true }
    );
  }

  
  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.templates = () => renderTemplates();
  window.SendittoUI.campaigns = () => renderCampaigns();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelector(".tpl-modal")?.remove();
  });
})();
