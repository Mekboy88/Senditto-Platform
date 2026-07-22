/**
 * Template Studio v2 — overrides the "templates" route.
 * 30 built-in responsive email designs (table-based, inline styles, 600px
 * desktop / fluid mobile), a workspace brand kit (logo, colors, background,
 * footer) applied live, desktop/mobile preview, and a strict allowlist HTML
 * sanitizer so user templates can never contain scripts, forms, iframes,
 * event handlers or javascript:/unsafe URLs. No external requests required.
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  /* ================= safety: allowlist sanitizer ================= */

  const ALLOWED_TAGS = new Set(["TABLE","TBODY","THEAD","TR","TD","TH","DIV","P","H1","H2","H3","H4","A","IMG","SPAN","STRONG","B","EM","I","U","BR","HR","UL","OL","LI","BLOCKQUOTE","CENTER","SMALL","BODY"]);
  const ALLOWED_ATTRS = new Set(["style","href","src","alt","width","height","align","valign","cellpadding","cellspacing","border","bgcolor","color","target","rel"]);

  function safeUrl(url, kind) {
    const u = String(url || "").trim();
    if (!u) return "";
    if (/^javascript:|^vbscript:|^file:/i.test(u)) return "";
    if (kind === "img") return /^https:\/\//i.test(u) || /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(u) ? u : "";
    return /^https:\/\//i.test(u) || /^mailto:/i.test(u) || /^\{\{/.test(u) ? u : "";
  }

  function safeStyle(css) {
    const s = String(css || "");
    if (/expression|javascript:|@import|behavior/i.test(s)) return "";
    // allow url() only for https images
    return s.replace(/url\(([^)]*)\)/gi, (m, inner) => {
      const clean = inner.replace(/["']/g, "").trim();
      return /^https:\/\//i.test(clean) ? `url(${clean})` : "none";
    });
  }

  function sanitizeEmailHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    const walk = (node) => {
      for (const el of [...node.children]) {
        if (!ALLOWED_TAGS.has(el.tagName)) {
          el.remove();
          continue;
        }
        for (const attr of [...el.attributes]) {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on") || !ALLOWED_ATTRS.has(name)) {
            el.removeAttribute(attr.name);
            continue;
          }
          if (name === "style") el.setAttribute("style", safeStyle(attr.value));
          if (name === "href") {
            const u = safeUrl(attr.value, "a");
            if (u) { el.setAttribute("href", u); el.setAttribute("rel", "noopener noreferrer"); }
            else el.removeAttribute("href");
          }
          if (name === "src") {
            const u = safeUrl(attr.value, "img");
            if (u) el.setAttribute("src", u);
            else el.remove();
          }
        }
        walk(el);
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }

  /* ================= brand kit ================= */

  const BG_PRESETS = [["Mist","#f4f6fb"],["Paper","#ffffff"],["Sand","#faf6ef"],["Mint","#f1faf5"],["Lavender","#f6f4fc"],["Sky","#eff6ff"]];

  function brand() {
    const st = S()?.snapshot?.()?.settings || {};
    const ws = S()?.currentWorkspace?.() || {};
    return {
      logoMode: "text", logoText: ws.name || "Senditto", logoUrl: "",
      color: "#367ef5", bg: "#f4f6fb", radius: 14,
      footerAddress: "Senditto Inc · 100 Mail Street · Internet",
      footerNote: "You receive this email because you signed up.",
      ...(st.brand || {}),
    };
  }
  function saveBrand(patch) {
    const s = S();
    const cur = brand();
    s.setSettings?.({ ...(s.snapshot?.()?.settings || {}), brand: { ...cur, ...patch } });
  }

  /* ================= email building blocks (table-based, inline) ================= */

  const FONT = "font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;";

  function logoHtml(b) {
    if (b.logoMode === "image" && safeUrl(b.logoUrl, "img"))
      return `<img src="${esc(b.logoUrl)}" alt="${esc(b.logoText)}" height="34" style="display:block;max-height:34px;width:auto">`;
    return `<div style="${FONT}font-size:19px;font-weight:800;color:#111827;letter-spacing:-0.02em">${esc(b.logoText)}</div>`;
  }
  const btn = (b, label, url = "{{action_url}}") =>
    `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto 6px"><tr><td bgcolor="${b.color}" style="border-radius:${b.radius > 6 ? 10 : 4}px"><a href="${url}" target="_blank" style="${FONT}display:inline-block;padding:13px 30px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none">${esc(label)}</a></td></tr></table>`;
  const h1 = (t) => `<h1 style="${FONT}margin:0 0 12px;font-size:24px;line-height:1.25;color:#111827;letter-spacing:-0.02em;text-align:center">${t}</h1>`;
  const p = (t, center = true) => `<p style="${FONT}margin:0 0 14px;font-size:14.5px;line-height:1.65;color:#4b5563;text-align:${center ? "center" : "left"}">${t}</p>`;
  const codeBox = (b) => `<div style="${FONT}margin:22px auto;max-width:230px;background:#f3f6fc;border:1px dashed ${b.color};border-radius:${b.radius}px;padding:16px 10px;text-align:center;font-size:30px;font-weight:800;letter-spacing:10px;color:#111827">{{code}}</div>`;
  const badge = (b, t) => `<div style="text-align:center;margin-bottom:14px"><span style="${FONT}display:inline-block;background:${b.color}1a;color:${b.color};font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:6px 14px">${esc(t)}</span></div>`;
  const divider = () => `<hr style="border:0;border-top:1px solid #eceff5;margin:24px 0">`;
  const kv = (rows) => `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 6px">${rows.map(([k, v, strong]) => `<tr><td style="${FONT}padding:9px 0;font-size:13.5px;color:#6b7280;border-bottom:1px solid #f1f4f9">${esc(k)}</td><td align="right" style="${FONT}padding:9px 0;font-size:13.5px;font-weight:${strong ? 800 : 600};color:#111827;border-bottom:1px solid #f1f4f9">${esc(v)}</td></tr>`).join("")}</table>`;
  const featureRow = (emojiChar, title, text) => `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px"><tr><td width="42" valign="top" style="font-size:22px;padding-top:2px">${emojiChar}</td><td style="${FONT}"><div style="font-size:14px;font-weight:700;color:#111827">${esc(title)}</div><div style="font-size:13px;color:#6b7280;line-height:1.55">${esc(text)}</div></td></tr></table>`;
  const heroIcon = (b, ch) => `<div style="text-align:center;margin:4px 0 16px"><div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;background:${b.color}14;font-size:30px;text-align:center">${ch}</div></div>`;

  function shell(b, inner, preheader) {
    return `<body style="margin:0;padding:0;background:${b.bg}">
<div style="display:none;max-height:0;overflow:hidden">${esc(preheader || "")}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${b.bg}"><tr><td align="center" style="padding:32px 14px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%"><tr><td style="padding:0 6px 18px">${logoHtml(b)}</td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:${b.radius}px;padding:36px 34px;border:1px solid #e8edf5">${inner}</td></tr>
<tr><td style="${FONT}padding:20px 8px;text-align:center;font-size:11.5px;line-height:1.7;color:#9aa5b4">${esc(b.footerNote)}<br>${esc(b.footerAddress)}<br><a href="{{unsubscribe_url}}" style="color:#9aa5b4;text-decoration:underline">Unsubscribe</a> · <a href="{{preferences_url}}" style="color:#9aa5b4;text-decoration:underline">Email preferences</a></td></tr>
</table></td></tr></table></body>`;
  }

  /* ================= 30 template definitions ================= */

  const T = (id, name, category, subject, pre, build) => ({ id, name, category, subject, pre, build });
  const DEFS = [
    T("welcome","Welcome","Onboarding","Welcome to {{product}} 👋","Your account is ready",(b)=>heroIcon(b,"👋")+h1("Welcome, {{name}}!")+p("Your account is ready. You're three small steps away from sending your first email — it takes minutes.")+btn(b,"Open your dashboard")),
    T("getting-started","Getting started checklist","Onboarding","Your {{product}} setup checklist","3 steps to go live",(b)=>badge(b,"Getting started")+h1("Let's get you live")+p("Follow these steps and your first real email is minutes away.")+featureRow("🔑","Create an API key","Scoped credentials for your app in one click.")+featureRow("🌐","Verify your domain","Add SPF and DKIM so inbox providers trust you.")+featureRow("✉️","Send a test","One request — see it arrive.")+btn(b,"Continue setup")),
    T("activate","Confirm your email","Onboarding","Confirm your email address","One click to activate",(b)=>heroIcon(b,"✅")+h1("Confirm your email")+p("Tap the button below to verify <strong>{{email}}</strong> and activate your account.")+btn(b,"Confirm email")+p("<small style='color:#9aa5b4'>If you didn't create an account, you can safely ignore this.</small>")),
    T("trial-start","Trial started","Onboarding","Your free trial has started","14 days, full power",(b)=>badge(b,"Free trial")+h1("Your 14-day trial is live")+p("Everything is unlocked — send, automate and track without limits until {{trial_end}}.")+btn(b,"Explore features")),
    T("profile","Complete your profile","Onboarding","One last step, {{name}}","Complete your profile",(b)=>heroIcon(b,"🪪")+h1("Finish setting up")+p("Add your company details so invoices and sending identity are correct.")+btn(b,"Complete profile")),
    T("otp","One-time code","Security","Your verification code","Code inside — expires in 10 minutes",(b)=>heroIcon(b,"🔐")+h1("Your verification code")+p("Use this code to finish signing in. It expires in <strong>10 minutes</strong>.")+codeBox(b)+p("<small style='color:#9aa5b4'>Never share this code. Our team will never ask for it.</small>")),
    T("reset","Password reset","Security","Reset your password","Reset link inside",(b)=>heroIcon(b,"🔁")+h1("Reset your password")+p("Someone requested a password reset for <strong>{{email}}</strong>. The link is valid for 30 minutes.")+btn(b,"Choose a new password")+p("<small style='color:#9aa5b4'>Didn't request this? Your account is safe — ignore this email.</small>")),
    T("new-device","New sign-in alert","Security","New sign-in to your account","Was this you?",(b)=>heroIcon(b,"🖥️")+h1("New device signed in")+p("We noticed a sign-in from a new device.")+kv([["Device","{{device}}"],["Location","{{location}}"],["Time","{{time}}"]])+btn(b,"Review activity")+p("<small style='color:#9aa5b4'>If this was you, no action is needed.</small>")),
    T("2fa-on","Two-step auth enabled","Security","Two-step verification is on","Your account is safer",(b)=>heroIcon(b,"🛡️")+h1("Two-step verification enabled")+p("From now on we'll ask for a one-time code when you sign in on a new device.")+btn(b,"Manage security settings")),
    T("suspicious","Unusual activity","Security","We blocked an unusual attempt","Action may be required",(b)=>heroIcon(b,"⚠️")+h1("We blocked something unusual")+p("A sign-in attempt didn't match your usual pattern, so we stopped it. If this was you, verify to continue.")+btn(b,"Secure my account")),
    T("invoice","Invoice","Billing","Invoice {{invoice_no}} is ready","Your invoice from {{product}}",(b)=>badge(b,"Invoice")+h1("Invoice {{invoice_no}}")+p("Your invoice for {{month}} is ready.")+kv([["Plan","{{plan}}"],["Period","{{period}}"],["Amount due","{{amount}}",true]])+btn(b,"Download invoice")),
    T("receipt","Payment receipt","Billing","Payment received — thank you","Receipt inside",(b)=>heroIcon(b,"🧾")+h1("Thanks — payment received")+kv([["Payment method","{{method}}"],["Date","{{date}}"],["Total paid","{{amount}}",true]])+btn(b,"View receipt")),
    T("pay-failed","Payment failed","Billing","Your payment didn't go through","Please update billing",(b)=>heroIcon(b,"💳")+h1("Payment failed")+p("We couldn't charge your card ending in {{last4}}. Service continues for now — please update billing to avoid interruption.")+btn(b,"Update payment method")),
    T("renewal","Renewal reminder","Billing","Your plan renews on {{date}}","Renewal ahead",(b)=>badge(b,"Heads up")+h1("Your plan renews soon")+p("Your <strong>{{plan}}</strong> plan renews on <strong>{{date}}</strong> for {{amount}}. No action needed if all is well.")+btn(b,"Manage subscription")),
    T("upgraded","Plan upgraded","Billing","Welcome to {{plan}} 🎉","Upgrade confirmed",(b)=>heroIcon(b,"🚀")+h1("You're on {{plan}} now")+p("Higher limits, more power. Your new capabilities are live immediately.")+btn(b,"See what's new")),
    T("newsletter","Newsletter","Marketing","{{month}} at {{product}}","This month's highlights",(b)=>badge(b,"Newsletter")+h1("What's new this month")+p("A quick tour of what we shipped and what's coming next.",false)+featureRow("✨","Highlight one","Describe your biggest improvement here.")+featureRow("⚡","Highlight two","A second thing users will love.")+featureRow("🧩","Highlight three","One more update worth sharing.")+btn(b,"Read the full update")),
    T("launch","Product launch","Marketing","Introducing {{feature}} 🚀","It's here",(b)=>heroIcon(b,"🚀")+h1("Introducing {{feature}}")+p("The thing you asked for is here. Built to be fast, simple and reliable.")+btn(b,"Try it now")),
    T("feature","Feature announcement","Marketing","New: {{feature}}","Small update, big difference",(b)=>badge(b,"New feature")+h1("{{feature}} is live")+p("Here's what it does and why it matters — one clear paragraph.")+btn(b,"See how it works")),
    T("offer","Discount offer","Marketing","{{percent}} off — this week only","A little thank-you",(b)=>heroIcon(b,"🎁")+h1("{{percent}} off, just for you")+p("Use the code below before {{deadline}}.")+codeBox(b)+btn(b,"Redeem offer")),
    T("winback","Win-back","Marketing","We miss you, {{name}}","Here's what changed",(b)=>heroIcon(b,"💌")+h1("It's been a while")+p("A lot improved since your last visit. Come see — your workspace is exactly where you left it.")+btn(b,"Pick up where you left off")),
    T("event","Event invitation","Marketing","You're invited: {{event}}","Save your seat",(b)=>badge(b,"Invitation")+h1("{{event}}")+kv([["Date","{{date}}"],["Time","{{time}}"],["Where","{{location}}"]])+btn(b,"Save my seat")),
    T("webinar","Webinar reminder","Marketing","Starts in 1 hour: {{event}}","See you soon",(b)=>heroIcon(b,"🎥")+h1("Starting soon")+p("<strong>{{event}}</strong> begins in one hour. Grab a coffee and join us live.")+btn(b,"Join the webinar")),
    T("order","Order confirmation","Transactional","Order {{order_no}} confirmed","Thanks for your order",(b)=>heroIcon(b,"🛍️")+h1("Order confirmed")+p("Thanks {{name}} — we're getting your order ready.")+kv([["Order","{{order_no}}"],["Items","{{items}}"],["Total","{{total}}",true]])+btn(b,"Track your order")),
    T("shipping","Shipping update","Transactional","Your order is on its way 📦","Tracking inside",(b)=>heroIcon(b,"📦")+h1("It's on the way")+p("Your package left our warehouse and is heading to you.")+kv([["Carrier","{{carrier}}"],["Tracking","{{tracking_no}}"],["Arrives","{{eta}}"]])+btn(b,"Track package")),
    T("delivered","Delivery confirmation","Transactional","Delivered ✅","Your order arrived",(b)=>heroIcon(b,"✅")+h1("Delivered")+p("Your order {{order_no}} was delivered. We hope you love it — tell us how it went.")+btn(b,"Leave a quick review")),
    T("booking","Booking confirmation","Transactional","Booking confirmed — {{date}}","See you then",(b)=>heroIcon(b,"📅")+h1("You're booked")+kv([["What","{{service}}"],["When","{{date}} · {{time}}"],["Where","{{location}}"]])+btn(b,"Add to calendar")),
    T("waitlist","Waitlist invite","Transactional","You're in — access granted","Your turn came up",(b)=>heroIcon(b,"🎟️")+h1("You're off the waitlist")+p("Your access to {{product}} is ready. Your invite expires in 7 days.")+btn(b,"Claim access")),
    T("feedback","Feedback / NPS","Lifecycle","How are we doing?","60 seconds, one question",(b)=>heroIcon(b,"💬")+h1("Quick question")+p("How likely are you to recommend {{product}} to a friend? One tap — that's it.")+btn(b,"Give feedback")),
    T("milestone","Milestone","Lifecycle","1 year with {{product}} 🎂","Thanks for being here",(b)=>heroIcon(b,"🎂")+h1("Happy anniversary, {{name}}!")+p("A year together — thank you. Here's a small look at what you achieved with us.")+kv([["Emails sent","{{stat_sent}}"],["Delivered","{{stat_delivered}}"],["Best month","{{stat_month}}"]])+btn(b,"See your year")),
    T("referral","Referral invite","Lifecycle","Give {{reward}}, get {{reward}}","Share the love",(b)=>heroIcon(b,"🤝")+h1("Invite a friend")+p("Share your link — they get {{reward}}, you get {{reward}}. Everyone wins.")+btn(b,"Share your invite link")),
  ];
  const CATEGORIES = ["All","Onboarding","Security","Billing","Marketing","Transactional","Lifecycle"];

  function renderDef(def, b) {
    return sanitizeEmailHtml(shell(b, def.build(b), def.pre));
  }

  /* ================= page ================= */

  let cat = "All";
  let q = "";
  let preview = null; // def id
  let mobile = false;
  let brandOpen = false;

  const icon = (n) => ({
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    brush:'<path d="M14 3l7 7-9 9H5v-7l9-9Z"/><path d="M5 21h14"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9.5 11.5 11 13l3.5-3.5"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
  }[n] || "");
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${icon(n)}</svg>`;

  function render(root) {
    const s = S();
    if (!s) throw new Error("Platform store is still loading. Click Try again.");
    root.dataset.platformPage = "templates-pro";
    const b = brand();
    const saved = s.list("templates");
    const defs = DEFS.filter((d) => (cat === "All" || d.category === cat) && (!q || `${d.name} ${d.subject} ${d.category}`.toLowerCase().includes(q.toLowerCase())));

    root.innerHTML = `
    <div class="tp2-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">CONTENT SYSTEM</small>
          <h1>Templates</h1>
          <p>30 production-ready responsive designs — branded with your logo and colors, sanitized for safety.</p>
        </div>
        <div class="sd-head-actions">
          <button class="sd-btn" data-act="brand">${svg("brush")} Brand kit</button>
          <span class="tp2-safe">${svg("shield")} Safe HTML only</span>
        </div>
      </div>

      ${saved.length ? `
      <section class="sd-card3">
        <div class="sd-card3-head"><div><h3>Your library</h3><p>${saved.length} saved template${saved.length === 1 ? "" : "s"} — used by campaigns and the API</p></div></div>
        <div class="tp2-lib">
          ${saved.slice(0, 12).map((t) => `
            <div class="tp2-lib-item" data-lib="${esc(t.id)}">
              <b>${esc(t.name)}</b><small>${esc(t.subject || "—")}</small>
              <div class="tp2-lib-actions">
                <button class="sd-btn sm" data-libact="preview">${svg("eye")} Preview</button>
                <button class="sd-btn sm danger" data-libact="delete">${svg("trash")}</button>
              </div>
            </div>`).join("")}
        </div>
      </section>` : ""}

      <div class="cr-toolbar">
        <div class="cr-search">${svg("search")}<input placeholder="Search ${DEFS.length} designs…" value="${esc(q)}" data-q></div>
        <div class="cr-chips">${CATEGORIES.map((c) => `<button class="cr-chip ${cat === c ? "active" : ""}" data-cat="${c}">${c}</button>`).join("")}</div>
      </div>

      <div class="tp2-grid">
        ${defs.map((d) => `
          <div class="tp2-card" data-id="${d.id}">
            <div class="tp2-thumb"><iframe sandbox="" scrolling="no" srcdoc="${esc(renderDef(d, b))}" tabindex="-1"></iframe></div>
            <div class="tp2-meta">
              <div><b>${esc(d.name)}</b><small>${esc(d.subject)}</small></div>
              <span class="sd-chip mut">${esc(d.category)}</span>
            </div>
            <div class="tp2-actions">
              <button class="sd-btn sm" data-tpl="preview">${svg("eye")} Preview</button>
              <button class="sd-btn sm primary" data-tpl="use">${svg("plus")} Use template</button>
            </div>
          </div>`).join("")}
      </div>
    </div>`;

    wire(root, b);
    if (preview) openPreview(root, b);
    if (brandOpen) openBrand(root, b);
  }

  function wire(root, b) {
    const s = S();
    root.querySelector("[data-q]")?.addEventListener("input", (e) => {
      q = e.target.value;
      render(root);
      const inp = root.querySelector("[data-q]");
      inp?.focus(); inp?.setSelectionRange(inp.value.length, inp.value.length);
    });
    root.querySelectorAll("[data-cat]").forEach((el) => el.addEventListener("click", () => { cat = el.dataset.cat; render(root); }));
    root.querySelector('[data-act="brand"]')?.addEventListener("click", () => { brandOpen = true; render(root); });
    root.querySelectorAll("[data-tpl]").forEach((el) =>
      el.addEventListener("click", () => {
        const id = el.closest(".tp2-card").dataset.id;
        const def = DEFS.find((x) => x.id === id);
        if (!def) return;
        if (el.dataset.tpl === "preview") { preview = id; mobile = false; render(root); }
        if (el.dataset.tpl === "use") {
          s.add("templates", { name: def.name, category: def.category, subject: def.subject, html: renderDef(def, b), status: "Published", usage: 0, builtin: def.id });
          s.logEvent?.("success", "templates.create", `Template “${def.name}” added to library`, {});
        }
      })
    );
    root.querySelectorAll("[data-lib]").forEach((card) =>
      card.querySelectorAll("[data-libact]").forEach((btn2) =>
        btn2.addEventListener("click", () => {
          const row = s.list("templates").find((t) => String(t.id) === card.dataset.lib);
          if (!row) return;
          if (btn2.dataset.libact === "delete") s.remove("templates", row.id);
          if (btn2.dataset.libact === "preview") { preview = `lib:${row.id}`; mobile = false; render(root); }
        })
      )
    );
  }

  function previewHtml(b) {
    if (String(preview).startsWith("lib:")) {
      const row = S().list("templates").find((t) => `lib:${t.id}` === preview);
      return { title: row?.name || "Template", html: sanitizeEmailHtml(row?.html || "") };
    }
    const def = DEFS.find((x) => x.id === preview);
    return { title: def?.name || "Template", html: def ? renderDef(def, b) : "" };
  }

  function openPreview(root, b) {
    const { title, html } = previewHtml(b);
    const el = document.createElement("div");
    el.className = "pp-modal tp2-modal";
    el.innerHTML = `
      <div class="tp2-preview-card">
        <div class="tp2-preview-bar">
          <b>${esc(title)}</b>
          <div class="sd-seg">
            <button class="sd-seg-btn ${!mobile ? "active" : ""}" data-dev="desktop">Desktop</button>
            <button class="sd-seg-btn ${mobile ? "active" : ""}" data-dev="mobile">Mobile</button>
          </div>
          <button class="cr-x" data-close>${svg("close")}</button>
        </div>
        <div class="tp2-preview-body"><iframe sandbox="" style="width:${mobile ? "375px" : "100%"};max-width:${mobile ? "375px" : "680px"}" srcdoc="${esc(html)}"></iframe></div>
      </div>`;
    el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
    const close = () => { preview = null; el.remove(); window.SendittoRender?.(); };
    el.querySelector("[data-close]").addEventListener("click", close);
    el.querySelectorAll("[data-dev]").forEach((d) => d.addEventListener("click", () => { mobile = d.dataset.dev === "mobile"; el.remove(); openPreview(root, b); }));
    document.body.appendChild(el);
  }

  function openBrand(root, b) {
    const el = document.createElement("div");
    el.className = "pp-modal tp2-modal";
    el.innerHTML = `
      <div class="cr-modal-card wide tp2-brand">
        <div class="cr-modal-head"><h3>Brand kit</h3><button class="cr-x" data-close>${svg("close")}</button></div>
        <div class="cr-modal-body">
          <p class="cr-help">Applied to every template. Logos accept <b>https images only</b>; all HTML is sanitized — scripts, forms and unsafe links are removed automatically.</p>
          <form class="cr-form" data-brand-form>
            <div class="cr-row2">
              <label>Logo type
                <select name="logoMode"><option value="text" ${b.logoMode !== "image" ? "selected" : ""}>Text logo</option><option value="image" ${b.logoMode === "image" ? "selected" : ""}>Image URL</option></select>
              </label>
              <label>Logo text<input name="logoText" value="${esc(b.logoText)}"></label>
            </div>
            <label>Logo image URL <small>https:// only</small><input name="logoUrl" value="${esc(b.logoUrl)}" placeholder="https://yourdomain.com/logo.png"></label>
            <div class="cr-row2">
              <label>Brand color<input type="color" name="color" value="${esc(b.color)}" style="height:42px;padding:4px"></label>
              <label>Corner radius
                <select name="radius"><option value="14" ${b.radius >= 8 ? "selected" : ""}>Rounded</option><option value="4" ${b.radius < 8 ? "selected" : ""}>Square</option></select>
              </label>
            </div>
            <label>Background</label>
            <div class="tp2-bgs">
              ${BG_PRESETS.map(([n, c]) => `<button type="button" class="tp2-bg ${b.bg === c ? "active" : ""}" data-bg="${c}" style="background:${c}" title="${n}"></button>`).join("")}
              <input name="bg" value="${esc(b.bg)}" style="width:110px">
            </div>
            <label>Footer address<input name="footerAddress" value="${esc(b.footerAddress)}"></label>
            <label>Footer note<input name="footerNote" value="${esc(b.footerNote)}"></label>
            <div class="cr-actions">
              <button type="button" class="sd-btn" data-close2>Cancel</button>
              <button type="submit" class="sd-btn primary">Save brand kit</button>
            </div>
          </form>
        </div>
      </div>`;
    const close = () => { brandOpen = false; el.remove(); window.SendittoRender?.(); };
    el.addEventListener("mousedown", (e) => { if (e.target === el) close(); });
    el.querySelector("[data-close]").addEventListener("click", close);
    el.querySelector("[data-close2]").addEventListener("click", close);
    el.querySelectorAll("[data-bg]").forEach((bg) => bg.addEventListener("click", () => { el.querySelector('input[name="bg"]').value = bg.dataset.bg; el.querySelectorAll(".tp2-bg").forEach((x) => x.classList.toggle("active", x === bg)); }));
    el.querySelector("[data-brand-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const url = String(f.get("logoUrl") || "").trim();
      saveBrand({
        logoMode: String(f.get("logoMode")),
        logoText: String(f.get("logoText") || "").slice(0, 40),
        logoUrl: safeUrl(url, "img") ? url : "",
        color: /^#[0-9a-f]{6}$/i.test(String(f.get("color"))) ? String(f.get("color")) : "#367ef5",
        radius: Number(f.get("radius")) || 14,
        bg: /^#[0-9a-f]{3,8}$/i.test(String(f.get("bg")).trim()) ? String(f.get("bg")).trim() : "#f4f6fb",
        footerAddress: String(f.get("footerAddress") || "").slice(0, 140),
        footerNote: String(f.get("footerNote") || "").slice(0, 140),
      });
      brandOpen = false;
      el.remove();
      window.SendittoRender?.();
    });
    document.body.appendChild(el);
  }

  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.templates = render;
  window.SendittoTemplates = { DEFS, renderDef, sanitizeEmailHtml, brand };
})();
