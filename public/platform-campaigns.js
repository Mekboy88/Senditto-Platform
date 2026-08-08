/**
 * Campaigns — the real page.
 *
 * What was here before was a shell: four counters stuck at zero, an empty
 * state, and a "Create campaign" button that did nothing when pressed. This
 * replaces it with a page that reads campaigns from the database, writes them
 * back, and sends them through the same engine everything else uses.
 *
 * Three things it refuses to fake:
 *   • The audience is a rule the send obeys, so the number on the button is
 *     the number of people who will receive it.
 *   • The figures are what the campaign's messages really did.
 *   • A campaign that has been sent cannot be sent again by pressing twice.
 */
(function () {
  "use strict";

  const S = () => window.SendittoStore;
  const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  const host = () => document.getElementById("senditto-platform-root");

  let tags = [];
  let subscribedTotal = null;
  let editing = null;
  let busy = false;

  function store() {
    const s = S();
    if (!s) throw new Error("Platform store is still loading.");
    return s;
  }

  function workspaceId() {
    const s = S();
    if (!s) return null;
    const current = s.get && s.get().selectedWorkspaceId;
    return current || (s.list("workspaces")[0] || {}).id || null;
  }

  function campaigns() {
    const ws = workspaceId();
    return store()
      .list("campaigns")
      .filter((c) => !ws || !c.workspaceId || c.workspaceId === ws);
  }

  async function apiJson(path, options) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  function loadTags() {
    const ws = workspaceId();
    apiJson(`/api/platform/campaigns/audience-tags${ws ? `?workspaceId=${encodeURIComponent(ws)}` : ""}`)
      .then((d) => {
        tags = d.tags || [];
        subscribedTotal = d.subscribed ?? null;
        if (host()?.dataset.route === "campaigns") render();
      })
      .catch(() => {});
  }

  function toast(text) {
    document.querySelector(".pc-toast")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div class="pc-toast">${esc(text)}</div>`);
    setTimeout(() => document.querySelector(".pc-toast")?.remove(), 3800);
  }

  /* ------------------------------- rendering ------------------------------ */

  function statusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "sent") return "good";
    if (s === "sending") return "blue";
    if (s === "scheduled") return "amber";
    if (s === "cancelled") return "bad";
    return "";
  }

  function reachOf(draft) {
    if ((draft.audienceKind || "subscribed") !== "tag") return subscribedTotal;
    const hit = tags.find((t) => t.tag === draft.audienceTag);
    return hit ? hit.contacts : 0;
  }

  function row(c) {
    const engagement = c.sent
      ? `${c.sent} sent · ${c.delivered} delivered · ${c.opens} opened (${c.openRate}%)`
      : "Not sent yet";
    return `<tr data-id="${esc(c.id)}">
      <td><b>${esc(c.name || "Untitled")}</b><small>${esc(c.subject || "No subject yet")}</small></td>
      <td><span class="pc-tag">${esc(c.audience || "All subscribed contacts")} · ${c.audienceSize ?? 0}</span></td>
      <td><span class="pc-badge ${statusClass(c.status)}">${esc(c.status || "Draft")}</span></td>
      <td>${esc(engagement)}</td>
      <td class="pc-actions">
        <button type="button" class="pc-btn" data-edit="${esc(c.id)}">Edit</button>
        <button type="button" class="pc-btn" data-test="${esc(c.id)}">Test</button>
        ${
          c.sent
            ? ""
            : c.audienceSize
              ? `<button type="button" class="pc-btn primary" data-send="${esc(c.id)}">Send to ${c.audienceSize}</button>
                 <button type="button" class="pc-btn" data-schedule="${esc(c.id)}">Schedule</button>`
              : // Offering "Send to 0" invites a press that can only fail.
                `<span class="pc-note">Nobody to send to yet</span>`
        }
        <button type="button" class="pc-btn danger" data-delete="${esc(c.id)}">Delete</button>
      </td>
    </tr>`;
  }

  function editor() {
    if (!editing) return "";
    const d = editing;
    const reach = reachOf(d);
    const isTag = (d.audienceKind || "subscribed") === "tag";
    return `<div class="pc-modal"><button class="pc-backdrop" data-close></button><section class="pc-dialog">
      <button class="pc-close" data-close aria-label="Close">✕</button>
      <h2>${d.id ? "Edit campaign" : "New campaign"}</h2>
      <div class="pc-grid">
        <label class="full">Name<input class="pc-input" data-f="name" value="${esc(d.name || "")}" placeholder="Winter news"></label>
        <label class="full">Subject<input class="pc-input" data-f="subject" value="${esc(d.subject || "")}" placeholder="What we shipped this winter"></label>
        <label class="full">Preheader — the line inboxes show after the subject<input class="pc-input" data-f="preheader" value="${esc(d.preheader || "")}"></label>
        <label class="full">HTML content<textarea class="pc-input" rows="7" data-f="bodyHtml" placeholder="&lt;h1&gt;Hello&lt;/h1&gt;&lt;p&gt;What we shipped…&lt;/p&gt;">${esc(d.bodyHtml || "")}</textarea></label>
        <label class="full">Plain-text alternative — for clients that refuse HTML<textarea class="pc-input" rows="4" data-f="bodyText">${esc(d.bodyText || "")}</textarea></label>
        <label>From (blank uses your workspace address)<input class="pc-input" data-f="fromEmail" value="${esc(d.fromEmail || "")}"></label>
        <label>Reply-to<input class="pc-input" data-f="replyTo" value="${esc(d.replyTo || "")}"></label>
        <label>Send to<select class="pc-input" data-f="audienceKind">
          <option value="subscribed"${isTag ? "" : " selected"}>Every subscribed contact</option>
          <option value="tag"${isTag ? " selected" : ""}>Subscribed contacts with a tag</option>
        </select></label>
        ${
          isTag
            ? `<label>Tag<select class="pc-input" data-f="audienceTag">
                 <option value="">Choose a tag…</option>
                 ${tags
                   .map(
                     (t) =>
                       `<option value="${esc(t.tag)}"${t.tag === d.audienceTag ? " selected" : ""}>${esc(t.tag)} · ${t.contacts} subscribed</option>`
                   )
                   .join("")}
               </select></label>`
            : "<span></span>"
        }
        <p class="pc-note full">${
          reach == null
            ? "Working out who this reaches…"
            : `This campaign would reach ${reach} ${reach === 1 ? "person" : "people"}. Unsubscribed and suppressed addresses are never included.`
        }</p>
      </div>
      <div class="pc-modal-actions">
        <button type="button" class="pc-btn" data-close>Cancel</button>
        <button type="button" class="pc-btn primary" data-save${busy ? " disabled" : ""}>${busy ? "Saving…" : d.id ? "Save campaign" : "Create campaign"}</button>
      </div>
    </section></div>`;
  }

  function render() {
    const h = host();
    if (!h) return;
    h.dataset.route = "campaigns";
    let list;
    try {
      list = campaigns();
    } catch {
      h.innerHTML = `<div class="pc-page"><p class="pc-note">Loading…</p></div>`;
      return;
    }

    const totalSent = list.reduce((n, c) => n + (c.sent || 0), 0);
    const delivered = list.reduce((n, c) => n + (c.delivered || 0), 0);
    const opened = list.reduce((n, c) => n + (c.opens || 0), 0);
    const running = list.filter((c) => /sending|scheduled/i.test(c.status || "")).length;

    h.innerHTML = `<div class="pc-page">
      <div class="pc-head">
        <div>
          <small>MARKETING</small>
          <h1>Campaigns</h1>
          <p>A campaign goes to the contacts a rule picks out. The figures below are what its messages really did.</p>
        </div>
        <div class="pc-head-actions">
          <button type="button" class="pc-btn primary" data-new>New campaign</button>
        </div>
      </div>
      <div class="pc-stats">
        <div class="pc-stat"><span>Campaigns</span><b>${list.length}</b></div>
        <div class="pc-stat"><span>Emails sent</span><b>${totalSent}</b></div>
        <div class="pc-stat"><span>Open rate</span><b>${delivered ? `${Math.round((opened / delivered) * 1000) / 10}%` : "—"}</b></div>
        <div class="pc-stat"><span>Running now</span><b>${running}</b></div>
      </div>
      ${
        list.length
          ? `<div class="pc-table-wrap"><table class="pc-table">
              <thead><tr><th>Campaign</th><th>Audience</th><th>Status</th><th>Sent / delivered / opened</th><th></th></tr></thead>
              <tbody>${list.map(row).join("")}</tbody>
            </table></div>`
          : `<div class="pc-empty"><h3>No campaigns yet</h3><p>Create one, choose who it goes to, and send it. Nothing is sent until you press send.</p></div>`
      }
      ${editor()}
    </div>`;
    bind();
  }

  /* ------------------------------- actions ------------------------------- */

  function bind() {
    const h = host();
    if (!h) return;

    h.querySelector("[data-new]")?.addEventListener("click", () => {
      editing = { audienceKind: "subscribed", audienceTag: "" };
      loadTags();
      render();
    });

    h.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => {
        editing = { ...campaigns().find((c) => c.id === b.dataset.edit) };
        loadTags();
        render();
      })
    );

    h.querySelectorAll("[data-send]").forEach((b) =>
      b.addEventListener("click", () => sendCampaign(b.dataset.send, null))
    );
    h.querySelectorAll("[data-schedule]").forEach((b) =>
      b.addEventListener("click", () => scheduleCampaign(b.dataset.schedule))
    );
    h.querySelectorAll("[data-test]").forEach((b) =>
      b.addEventListener("click", () => testCampaign(b.dataset.test))
    );
    h.querySelectorAll("[data-delete]").forEach((b) =>
      b.addEventListener("click", () => {
        const c = campaigns().find((x) => x.id === b.dataset.delete);
        if (!c) return;
        if (!window.confirm(`Delete “${c.name}”? Messages it already sent are kept.`)) return;
        store().remove("campaigns", c.id);
        render();
      })
    );

    // Editor
    h.querySelectorAll("[data-f]").forEach((el) => {
      const field = el.dataset.f;
      const handler = () => {
        editing[field] = el.value;
        // The audience controls change what the reach line says, so redraw.
        if (field === "audienceKind" || field === "audienceTag") render();
      };
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", handler);
    });
    h.querySelectorAll("[data-close]").forEach((b) =>
      b.addEventListener("click", () => {
        editing = null;
        render();
      })
    );
    h.querySelector("[data-save]")?.addEventListener("click", saveCampaign);
  }

  function saveCampaign() {
    if (!editing || busy) return;
    if (!String(editing.name || "").trim()) {
      toast("Give the campaign a name");
      return;
    }
    busy = true;
    render();
    const payload = {
      name: editing.name,
      subject: editing.subject || "",
      preheader: editing.preheader || "",
      bodyHtml: editing.bodyHtml || "",
      bodyText: editing.bodyText || "",
      fromEmail: editing.fromEmail || "",
      replyTo: editing.replyTo || "",
      audienceKind: editing.audienceKind || "subscribed",
      audienceTag: editing.audienceTag || "",
      workspaceId: workspaceId(),
    };
    try {
      if (editing.id) store().update("campaigns", editing.id, payload);
      else store().add("campaigns", payload);
      toast(editing.id ? "Campaign saved" : "Campaign created");
    } catch (e) {
      toast(e.message || "Could not save the campaign");
    }
    busy = false;
    editing = null;
    render();
  }

  async function sendCampaign(id, sendAt) {
    const c = campaigns().find((x) => x.id === id);
    if (!c) return;
    let check;
    try {
      check = await apiJson(`/api/platform/campaigns/${encodeURIComponent(id)}/audience`);
    } catch (e) {
      toast(e.message);
      return;
    }
    if (!check.ready) {
      toast(check.blockers?.[0] || "This campaign is not ready to send");
      return;
    }
    const when = sendAt ? ` at ${new Date(sendAt).toLocaleString()}` : " now";
    if (
      !window.confirm(
        `“${c.name}” will go to ${check.size} ${check.size === 1 ? "person" : "people"}${when}.\n\nThis cannot be recalled once it leaves.`
      )
    ) {
      return;
    }
    try {
      const res = await apiJson(`/api/platform/campaigns/${encodeURIComponent(id)}/send`, {
        method: "POST",
        body: JSON.stringify(sendAt ? { sendAt } : {}),
      });
      const skipped = res.skipped?.length ? `, ${res.skipped.length} skipped (${res.skipped[0].reason})` : "";
      toast(
        sendAt
          ? `Scheduled for ${new Date(sendAt).toLocaleString()} · ${res.queued} queued${skipped}`
          : `Sending to ${res.queued}${skipped}`
      );
      window.SendittoSync?.refresh?.();
    } catch (e) {
      toast(e.message);
    }
  }

  function scheduleCampaign(id) {
    const answer = window.prompt("Send at (YYYY-MM-DD HH:MM, your local time):");
    if (!answer) return;
    const when = new Date(answer.replace(" ", "T"));
    if (Number.isNaN(when.getTime())) {
      toast("That is not a valid date and time");
      return;
    }
    sendCampaign(id, when.toISOString());
  }

  async function testCampaign(id) {
    const c = campaigns().find((x) => x.id === id);
    if (!c) return;
    const to = window.prompt(`Send a test copy of “${c.name}” to:`);
    if (!to) return;
    try {
      const res = await apiJson(`/api/platform/campaigns/${encodeURIComponent(id)}/test`, {
        method: "POST",
        body: JSON.stringify({ to }),
      });
      toast(`Test queued to ${to} · ${res.message.id}`);
    } catch (e) {
      toast(e.message);
    }
  }

  const mount = () => {
    editing = null;
    loadTags();
    render();
  };

  // Several page modules assign SendittoUI.campaigns and the last one wins,
  // which made this page depend on script order in an HTML file. Defining the
  // property instead means a later assignment is ignored rather than quietly
  // restoring the shell that does nothing.
  window.SendittoUI = window.SendittoUI || {};
  try {
    Object.defineProperty(window.SendittoUI, "campaigns", {
      configurable: false,
      enumerable: true,
      get: () => mount,
      set: () => {},
    });
  } catch {
    window.SendittoUI.campaigns = mount;
  }
  window.__sendittoCampaignsReady = true;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editing) {
      editing = null;
      render();
    }
  });
})();
