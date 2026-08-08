/**
 * Send email composer — empty real state, queues into SendittoStore.
 */
(() => {
  const S = () => window.SendittoStore;
  const I = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${
      {
        send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
        eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        save: '<path d="M5 3h12l2 2v16H5Z"/><path d="M8 3v6h8V3M8 21v-8h8v8"/>',
        paperclip: '<path d="m20 12-8 8a6 6 0 0 1-8-8l9-9a4 4 0 0 1 6 6l-9 9a2 2 0 0 1-3-3l8-8"/>',
        template: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
        settings:
          '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        check: '<path d="m20 6-11 11-5-5"/>',
        chev: '<path d="m8 10 4 4 4-4"/>',
        code: '<path d="m8 9-3 3 3 3m8-6 3 3-3 3m-2-9-4 12"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        spark: '<path d="m12 3 1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2Z"/>',
      }[n] || ""
    }</svg>`;

  function defaultState() {
    const ws = S()?.currentWorkspace?.();
    const from = ws?.sending?.from || "";
    return {
      from,
      to: [],
      subject: "",
      body: "",
      html: "",
      reply: ws?.sending?.replyTo || "",
      stream: ws?.sending?.stream || "Transactional",
      mode: "visual",
      open: null,
      tracking: ws?.sending?.tracking !== false,
      unsubscribe: ws?.sending?.unsubscribe !== false,
      attachments: [],
    };
  }

  let state = defaultState();
  const host = () => document.getElementById("senditto-platform-root");
  const esc = (s) =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function store() {
    const s = S();
    if (!s) throw new Error("Platform store is still loading. Click Try again.");
    return s;
  }

  function senders() {
    const s = store();
    const ws = s.currentWorkspace();
    const list = [];
    if (ws?.sending?.from) list.push(ws.sending.from);
    s.list("domains")
      .filter((d) => /verified/i.test(d.status || ""))
      .forEach((d) => {
        const addr = `hello@${d.name}`;
        const labeled = `Senditto <${addr}>`;
        if (!list.includes(labeled)) list.push(labeled);
      });
    return list;
  }

  function qualityScore() {
    let score = 20;
    if (state.from) score += 25;
    if (state.to.length) score += 25;
    if (state.subject.trim()) score += 15;
    if ((state.body || state.html).trim()) score += 15;
    return Math.min(100, score);
  }

  function contentEditor() {
    if (state.mode === "html") {
      return `<textarea class="se-editor se-html" data-input="html" placeholder="<p>Your HTML email…</p>">${esc(state.html)}</textarea>`;
    }
    if (state.mode === "visual") {
      return `<div class="se-visual-editor"><div class="se-block"><small>HEADLINE</small><input data-input="subject" value="${esc(state.subject)}" placeholder="Email headline / subject" maxlength="120"></div><div class="se-block"><small>BODY TEXT</small><textarea data-input="body" placeholder="Write your email body…">${esc(state.body)}</textarea></div><div class="se-block"><small>BUTTON</small><button type="button" class="se-block-button">Call to action</button></div></div><div class="se-mode-note">${I("template")} Visual blocks · email-safe output</div>`;
    }
    return `<div class="se-editor-tools"><button type="button" data-format="bold">B</button><button type="button" data-format="italic"><i>I</i></button><button type="button" data-format="link">↗</button><button type="button" data-format="list">≡</button><button type="button" data-format="clear">Tx</button></div><textarea class="se-editor" data-input="body" placeholder="Write your message…">${esc(state.body)}</textarea>`;
  }

  function render() {
    const h = host();
    if (!h) return;
    store();
    const score = qualityScore();
    const ready = score >= 90;
    h.dataset.sendEnhanced = "true";
    h.dataset.route = "send";
    h.style.setProperty("--se-score", String(score));
    h.innerHTML = `<div class="se-page">
      <div class="se-head">
        <div>
          <small>MESSAGE COMPOSER</small>
          <h1>Send email</h1>
          <p>Compose a real message for this workspace. Nothing is pre-filled with demo content.</p>
        </div>
        <div class="se-actions">
          <button type="button" class="se-btn" data-act="draft">${I("save")} Save draft</button>
          <button type="button" class="se-btn" data-act="preview">${I("eye")} Preview</button>
          <button type="button" class="se-btn primary" data-act="send">${I("send")} Send email</button>
        </div>
      </div>
      <div class="se-layout">
        <main class="se-card se-compose">
          <div class="se-toolbar">
            <div>
              <h2>New message</h2>
              <span>Drafts save on this device until the API is connected</span>
            </div>
            <div class="se-mode">
              <button type="button" data-mode="visual" class="${state.mode === "visual" ? "active" : ""}">${I("template")} Visual</button>
              <button type="button" data-mode="design" class="${state.mode === "design" ? "active" : ""}">Rich text</button>
              <button type="button" data-mode="html" class="${state.mode === "html" ? "active" : ""}">${I("code")} HTML</button>
            </div>
          </div>
          <div class="se-form">
            <div class="se-field">
              <div class="se-field-top"><label>From</label><button type="button" data-act="sender">Manage senders</button></div>
              <div class="se-select">
                <button type="button" class="se-select-trigger" data-menu="from">
                  <span><i class="se-avatar">${esc((state.from || "S")[0] || "S")}</i>${esc(state.from || "Select a sender")}</span>${I("chev")}
                </button>
                ${state.open === "from" ? menu(senders().length ? senders() : ["Type a custom sender…"], "from") : ""}
              </div>
            </div>
            <div class="se-field">
              <div class="se-field-top"><label>Recipients</label><button type="button" data-act="contacts">Choose contacts</button></div>
              <div class="se-recipient-wrap">
                ${state.to.map((x, i) => `<span class="se-chip">${esc(x)}<button type="button" data-remove="${i}" aria-label="Remove">×</button></span>`).join("")}
                <input data-input="recipient" placeholder="Add email and press Enter" type="email" autocomplete="email">
              </div>
              <div class="se-error" data-error="recipient"></div>
            </div>
            <div class="se-field">
              <div class="se-field-top"><label>Subject</label><button type="button" data-act="assist">${I("spark")} Clean subject</button></div>
              <input class="se-input" data-input="subject" value="${esc(state.subject)}" maxlength="120" placeholder="Email subject">
              <small style="float:right;color:#8794aa;margin-top:5px">${state.subject.length}/120</small>
            </div>
            <div class="se-field">
              <div class="se-field-top"><label>Message content</label><button type="button" data-act="template">${I("template")} Use template</button></div>
              ${contentEditor()}
            </div>
            <div class="se-compose-actions">
              <div>
                <button type="button" class="se-btn" data-act="attach">${I("paperclip")} Attachment ${state.attachments.length ? `<span>${state.attachments.length}</span>` : ""}</button>
                <button type="button" class="se-btn" data-act="test">${I("mail")} Send test</button>
              </div>
              <button type="button" class="se-btn" data-act="schedule">${I("clock")} Schedule</button>
            </div>
          </div>
        </main>
        <aside class="se-side">
          <section class="se-card">
            <div class="se-side-head">
              <div><h2>Message settings</h2><small>Delivery configuration</small></div>
              <span>${I("settings")}</span>
            </div>
            <div class="se-setting">
              <label>Email stream</label>
              <div class="se-select">
                <button type="button" class="se-select-trigger" data-menu="stream"><span>${esc(state.stream || "Transactional")}</span>${I("chev")}</button>
                ${state.open === "stream" ? menu(["Transactional", "Marketing", "Automations"], "stream") : ""}
              </div>
            </div>
            <div class="se-setting">
              <label>Reply-to address</label>
              <input class="se-input" data-input="reply" value="${esc(state.reply)}" type="email" placeholder="reply@yourdomain.com">
            </div>
            <div class="se-setting">
              <div class="se-switch-row"><div><b>Open tracking</b><small>Measure unique opens</small></div><button type="button" class="se-switch ${state.tracking ? "on" : ""}" data-toggle="tracking" aria-label="Toggle open tracking"><i></i></button></div>
              <div class="se-switch-row"><div><b>Unsubscribe footer</b><small>Required for marketing</small></div><button type="button" class="se-switch ${state.unsubscribe ? "on" : ""}" data-toggle="unsubscribe" aria-label="Toggle unsubscribe footer"><i></i></button></div>
            </div>
          </section>
          <section class="se-card">
            <div class="se-side-head">
              <div><h2>Message quality</h2><small>Pre-send checks</small></div>
              <span>${I("check")}</span>
            </div>
            <div class="se-score">
              <div class="se-score-ring" style="--se-score:${score}"><b>${score}</b></div>
              <div>
                <b>${ready ? "Ready to send" : "Incomplete"}</b>
                <p>${state.from ? "Sender set" : "Add sender"} · ${state.to.length ? "Recipient set" : "Add recipient"} · ${state.subject.trim() ? "Subject set" : "Add subject"} · ${(state.body || state.html).trim() ? "Body set" : "Add body"}</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>`;
    bind();
  }

  function menu(a, k) {
    return `<div class="se-menu">${a
      .map(
        (x) =>
          `<button data-choice="${k}" data-value="${esc(x)}" class="${state[k] === x ? "selected" : ""}">${esc(x)}${state[k] === x ? I("check") : ""}</button>`
      )
      .join("")}</div>`;
  }

  function toast(t) {
    document.querySelector(".se-toast")?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="se-toast">${I("check")} ${esc(t)}</div>`
    );
    setTimeout(() => document.querySelector(".se-toast")?.remove(), 2200);
  }

  function modal(type) {
    const templates = store().list("templates");
    const contacts = store().list("contacts");
    const content = {
      preview: `<div class="se-modal-icon">${I("eye")}</div><h2>Email preview</h2><p>How this message will appear to recipients.</p><div class="se-preview-frame"><div class="se-email-preview"><small>${esc(state.from || "No sender")}</small><h3>${esc(state.subject || "No subject")}</h3><p>${esc(state.body || state.html || "Empty body").replaceAll("\n", "<br>")}</p></div></div>`,
      schedule: `<div class="se-modal-icon">${I("clock")}</div><h2>Schedule delivery</h2><p>Choose when Senditto should queue this message.</p><div class="se-radio-grid"><div class="se-radio active" data-schedule="Now"><b>Send now</b><small>Queue immediately</small></div><div class="se-radio" data-schedule="Tomorrow, 09:00"><b>Tomorrow morning</b><small>09:00 local time</small></div><div class="se-radio" data-schedule="Custom"><b>Custom date</b><small>Choose date and time</small></div></div><div class="se-modal-actions"><button class="se-btn" data-close>Cancel</button><button class="se-btn primary" data-confirm="schedule">Schedule message</button></div>`,
      attach: `<div class="se-modal-icon">${I("paperclip")}</div><h2>Add attachments</h2><p>Attach files for this message (stored locally until delivery is connected).</p><label class="se-btn" style="display:inline-flex;cursor:pointer">${I("paperclip")} Choose file<input type="file" data-real-file hidden></label><div class="se-file-list">${
        state.attachments.length
          ? state.attachments
              .map(
                (x, i) =>
                  `<div class="se-file"><b>${esc(x)}</b><button class="se-btn" data-file-remove="${i}">Remove</button></div>`
              )
              .join("")
          : "<p>No attachments added.</p>"
      }</div><div class="se-modal-actions"><button class="se-btn primary" data-close>Done</button></div>`,
      template: `<div class="se-modal-icon">${I("template")}</div><h2>Choose a template</h2><p>${templates.length ? "Apply a reusable template from your library." : "No templates yet — create one under Templates."}</p><div class="se-radio-grid">${
        templates.length
          ? templates
              .map(
                (x) =>
                  `<div class="se-radio" data-template-id="${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.tag || "General")}</small></div>`
              )
              .join("")
          : "<p>Library is empty.</p>"
      }</div>`,
      test: `<div class="se-modal-icon">${I("mail")}</div><h2>Send a test email</h2><p>Queue a safe test to an address you control.</p><label><b>Test recipient</b><input class="se-input" data-test-email type="email" value="" placeholder="you@yourdomain.com"></label><div class="se-modal-actions"><button class="se-btn" data-close>Cancel</button><button class="se-btn primary" data-confirm="test">Send test</button></div>`,
      send: `<div class="se-modal-icon">${I("send")}</div><h2>Ready to send?</h2><p>Review the destination and confirm delivery (queued locally until the send pipeline is connected).</p><div class="se-radio active"><b>${state.to.length} recipient${state.to.length === 1 ? "" : "s"}</b><small>${esc(state.subject || "No subject")}</small></div><div class="se-modal-actions"><button class="se-btn" data-close>Cancel</button><button class="se-btn primary" data-confirm="send">Confirm and send</button></div>`,
      contacts: `<div class="se-modal-icon">${I("mail")}</div><h2>Choose contacts</h2><p>${contacts.length ? "Select recipients from your workspace audience." : "No contacts yet — add some under Contacts, or type an email above."}</p><div class="se-radio-grid">${
        contacts.length
          ? contacts
              .map(
                (x) =>
                  `<div class="se-radio ${state.to.includes(x.email) ? "active" : ""}" data-contact="${esc(x.email)}"><b>${esc(x.email)}</b><small>${esc(x.name || "")}</small></div>`
              )
              .join("")
          : "<p>Audience is empty.</p>"
      }</div><div class="se-modal-actions"><button class="se-btn primary" data-close>Done</button></div>`,
    };
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="se-modal"><button class="se-backdrop" data-close></button><section class="se-dialog ${type === "preview" ? "wide" : ""}"><button class="se-close" data-close>${I("close")}</button>${content[type] || content.contacts}</section></div>`
    );
    bindModal(type);
  }

  function senderManager() {
    const list = senders();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="se-modal"><button class="se-backdrop" data-close></button><section class="se-dialog wide"><button class="se-close" data-close>${I("close")}</button><div class="se-modal-icon">${I("mail")}</div><h2>Sender identities</h2><p>Use a verified domain address, or type a custom From identity.</p><div class="se-radio-grid">${
        list.length
          ? list
              .map(
                (x) =>
                  `<div class="se-radio ${state.from === x ? "active" : ""}" data-sender="${esc(x)}"><b>${esc(x)}</b><small>Workspace sender</small></div>`
              )
              .join("")
          : "<p>No senders yet. Add a domain or type a From address below.</p>"
      }</div><label><b>Add sender</b><input class="se-input" data-new-sender type="text" placeholder="Name &lt;you@yourdomain.com&gt;"></label><div class="se-modal-actions"><button class="se-btn" data-close>Cancel</button><button class="se-btn primary" data-sender-save>Use selected sender</button></div></section></div>`
    );
    const m = document.querySelector(".se-modal");
    m.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => m.remove()));
    m.querySelectorAll("[data-sender]").forEach((x) => {
      x.onclick = () => {
        m.querySelectorAll("[data-sender]").forEach((y) => y.classList.remove("active"));
        x.classList.add("active");
        m.dataset.sender = x.dataset.sender;
      };
    });
    m.querySelector("[data-sender-save]").onclick = () => {
      const added = m.querySelector("[data-new-sender]").value.trim();
      state.from = added || m.dataset.sender || state.from;
      const ws = store().currentWorkspace();
      if (ws && state.from) {
        store().updateWorkspace(ws.id, { sending: { ...(ws.sending || {}), from: state.from } });
      }
      m.remove();
      render();
      toast("Sender identity selected");
    };
  }

  function bind() {
    const h = host();
    h.querySelectorAll("[data-menu]").forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        state.open = state.open === b.dataset.menu ? null : b.dataset.menu;
        render();
      };
    });
    h.querySelectorAll("[data-choice]").forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const val = b.dataset.value;
        if (val === "Add a verified domain first" || val === "Type a custom sender…") {
          state.open = null;
          render();
          if (val === "Type a custom sender…") senderManager();
          return;
        }
        state[b.dataset.choice] = val;
        state.open = null;
        render();
      };
    });
    h.querySelectorAll("[data-mode]").forEach((b) => {
      b.onclick = () => {
        state.mode = b.dataset.mode;
        render();
      };
    });
    h.querySelectorAll("[data-toggle]").forEach((b) => {
      b.onclick = () => {
        state[b.dataset.toggle] = !state[b.dataset.toggle];
        render();
      };
    });
    h.querySelectorAll("[data-remove]").forEach((b) => {
      b.onclick = () => {
        state.to.splice(+b.dataset.remove, 1);
        render();
      };
    });
    h.querySelectorAll("[data-input]").forEach((x) => {
      x.oninput = () => (state[x.dataset.input] = x.value);
      if (x.dataset.input === "recipient") {
        x.onkeydown = (e) => {
          if (e.key === "Enter" && x.value) {
            e.preventDefault();
            if (/^\S+@\S+\.\S+$/.test(x.value)) {
              state.to.push(x.value.trim());
              render();
            } else {
              h.querySelector('[data-error="recipient"]').textContent =
                "Enter a valid email address.";
            }
          }
        };
      }
    });
    h.querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = () => {
        const a = b.dataset.act;
        if (a === "draft") {
          try {
            localStorage.setItem("senditto_send_draft_v2", JSON.stringify(state));
          } catch {
            /* ignore */
          }
          toast("Draft saved");
          return;
        }
        if (a === "assist") {
          if (!state.subject.trim()) {
            toast("Write a subject first");
            return;
          }
          state.subject = state.subject.replace(/\s+/g, " ").trim();
          if (!/[.!?]$/.test(state.subject)) state.subject += "";
          render();
          toast("Subject cleaned up");
          return;
        }
        if (a === "sender") {
          senderManager();
          return;
        }
        modal(a);
      };
    });
    h.querySelectorAll("[data-format]").forEach(
      (b) => (b.onclick = () => toast(`${b.dataset.format} formatting applied`))
    );
  }


  /**
   * Hand the message to the sending engine and report exactly what it said.
   *
   * The composer used to write a row straight into the store, which looked
   * like success and produced a message that was never actually sent. Every
   * send now goes through the server, and its answer — queued, suppressed,
   * bad address, unverified domain — is what the person sees.
   */
  async function sendNow({ to, subject, text, html, stream, from, replyTo, sendAt }) {
    const workspaceId =
      (store().get && store().get().selectedWorkspaceId) ||
      (store().list("workspaces")[0] || {}).id ||
      null;
    const recipients = Array.isArray(to) ? to : [to];
    const results = [];
    for (const recipient of recipients) {
      try {
        const res = await fetch("/api/platform/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            workspaceId,
            to: recipient,
            subject,
            text,
            html,
            stream: String(stream || "transactional").toLowerCase(),
            from,
            replyTo,
            sendAt: sendAt || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        results.push(
          res.ok
            ? { ok: true, to: recipient, id: data.message && data.message.id }
            : { ok: false, to: recipient, error: data.error || `Failed (${res.status})` }
        );
      } catch {
        results.push({ ok: false, to: recipient, error: "Could not reach the server" });
      }
    }
    return results;
  }

  function reportSend(results) {
    const ok = results.filter((r) => r.ok);
    const bad = results.filter((r) => !r.ok);
    if (ok.length && !bad.length) {
      toast(ok.length === 1 ? `Queued for delivery · ${ok[0].id}` : `Queued ${ok.length} messages`);
    } else if (ok.length && bad.length) {
      toast(`Queued ${ok.length}, ${bad.length} refused: ${bad[0].error}`);
    } else {
      toast(bad[0] ? bad[0].error : "Nothing was sent");
    }
  }

  function bindModal(type) {
    const m = document.querySelector(".se-modal");
    m.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => m.remove()));
    m.querySelectorAll("[data-schedule]").forEach((x) => {
      x.onclick = () => {
        m.querySelectorAll("[data-schedule]").forEach((y) => y.classList.remove("active"));
        x.classList.add("active");
        m.dataset.schedule = x.dataset.schedule;
      };
    });
    m.querySelector('[data-confirm="schedule"]')?.addEventListener("click", () => {
      const choice = m.dataset.schedule || "Now";
      // "Schedule" used to write a row nothing ever sent. It now sets a real
      // send time, which the queue honours — it will not touch the message
      // before then.
      let sendAt = null;
      if (choice.startsWith("Tomorrow")) {
        const t = new Date();
        t.setDate(t.getDate() + 1);
        t.setHours(9, 0, 0, 0);
        sendAt = t.toISOString();
      } else if (choice === "Custom") {
        const answer = prompt("Send at (YYYY-MM-DD HH:MM, your local time):");
        if (!answer) return;
        const when = new Date(answer.replace(" ", "T"));
        if (Number.isNaN(when.getTime())) {
          toast("That is not a valid date and time");
          return;
        }
        sendAt = when.toISOString();
      }
      if (!state.to.length || !state.subject.trim()) {
        m.remove();
        toast("Add a recipient and subject first");
        return;
      }
      m.remove();
      sendNow({
        from: state.from,
        to: [...state.to],
        subject: state.subject,
        text: state.body,
        html: state.html,
        stream: state.stream,
        sendAt,
      }).then((results) => {
        // One message, one toast. Reporting twice meant the second replaced
        // the first, so a partial failure could be announced as a success.
        const bad = results.filter((r) => !r.ok);
        if (sendAt && !bad.length) {
          toast(`Scheduled for ${new Date(sendAt).toLocaleString()}`);
        } else {
          reportSend(results);
        }
      });
    });
    m.querySelector("[data-real-file]")?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) {
        state.attachments.push(f.name);
        m.remove();
        modal("attach");
        render();
      }
    });
    m.querySelectorAll("[data-file-remove]").forEach((b) => {
      b.onclick = () => {
        state.attachments.splice(+b.dataset.fileRemove, 1);
        m.remove();
        modal("attach");
        render();
      };
    });
    m.querySelectorAll("[data-template-id]").forEach((x) => {
      x.onclick = () => {
        const t = store().list("templates").find((i) => i.id === x.dataset.templateId);
        if (!t) return;
        state.subject = t.subject || "";
        state.body = t.body || "";
        m.remove();
        render();
        toast("Template applied");
      };
    });
    m.querySelectorAll("[data-contact]").forEach((x) => {
      x.onclick = () => {
        const v = x.dataset.contact;
        const i = state.to.indexOf(v);
        i < 0 ? state.to.push(v) : state.to.splice(i, 1);
        x.classList.toggle("active");
      };
    });
    m.querySelector('[data-confirm="test"]')?.addEventListener("click", () => {
      const v = m.querySelector("[data-test-email]").value;
      if (!/^\S+@\S+\.\S+$/.test(v)) {
        toast("Enter a valid test email");
        return;
      }
      m.remove();
      toast(`Sending test to ${v}…`);
      sendNow({
        from: state.from,
        to: [v],
        subject: `[TEST] ${state.subject || "Untitled"}`,
        text: state.body,
        html: state.html,
        stream: state.stream,
      }).then(reportSend);
    });
    m.querySelector('[data-confirm="send"]')?.addEventListener("click", () => {
      if (!state.to.length || !state.subject.trim()) {
        m.remove();
        toast("Add a recipient and subject first");
        return;
      }
      if (!state.from) {
        m.remove();
        toast("Select a sender first");
        return;
      }
      const outgoing = {
        from: state.from,
        to: [...state.to],
        subject: state.subject,
        text: state.body,
        html: state.html,
        stream: state.stream,
      };
      m.remove();
      // Wait for the answer before saying anything. This used to announce
      // "Message queued successfully" with an em dash for an ID the instant
      // the button was pressed, which was a claim about a send that had not
      // happened yet and might be refused.
      sendNow(outgoing).then((results) => {
        const ok = results.filter((r) => r.ok);
        if (!ok.length) {
          reportSend(results);
          return;
        }
        // Only clear the composer once something really went.
        state = { ...defaultState(), from: state.from, stream: state.stream, reply: state.reply };
        render();
        const bad = results.filter((r) => !r.ok);
        const id = ok[0].id;
        const heading = bad.length ? `Queued ${ok.length}, ${bad.length} refused` : "Message queued";
        const detail = bad.length
          ? esc(bad[0].error)
          : ok.length === 1
            ? "Accepted by the sending queue. Track it on Email activity."
            : `${ok.length} messages accepted by the sending queue.`;
        document.body.insertAdjacentHTML(
          "beforeend",
          `<div class="se-modal"><button class="se-backdrop" data-close></button><section class="se-dialog"><button class="se-close" data-close>✕</button><div class="se-modal-icon">✓</div><h2>${heading}</h2><p>${detail}</p><div class="se-radio active"><b>Message ID</b><small style="font-family:ui-monospace,monospace">${esc(id)}</small></div><div class="se-modal-actions"><button class="se-btn" data-copy-mid>Copy ID</button><button class="se-btn primary" data-close>Done</button></div></section></div>`
        );
        const done = document.querySelector(".se-modal");
        done.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => done.remove()));
        done.querySelector("[data-copy-mid]")?.addEventListener("click", () => {
          navigator.clipboard?.writeText(id);
          toast("Message ID copied");
        });
      });
    });
  }

  function bootComposer() {
    try {
      const draft = JSON.parse(localStorage.getItem("senditto_send_draft_v2") || "null");
      if (draft && typeof draft === "object") {
        state = { ...defaultState(), ...draft, to: Array.isArray(draft.to) ? draft.to : [] };
      } else {
        state = defaultState();
      }
    } catch {
      state = defaultState();
    }
    render();
  }

  
  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.send = () => bootComposer();

  document.addEventListener("click", (e) => {
    if (state.open && !e.target.closest(".se-select") && document.getElementById("senditto-platform-root")?.dataset.route === "send") {
      state.open = null;
      render();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelector(".se-modal")?.remove();
      if (state.open) {
        state.open = null;
        if (host()?.dataset) render();
      }
    }
  });
})();
