/**
 * Senditto — full enterprise Settings control plane
 * Profile, security, notifications, workspace, sending defaults,
 * global email law / marketing compliance, consent, data protection,
 * legal documents, accessibility, danger zone.
 */
(() => {
  const host = () => document.getElementById("senditto-platform-root");
  const S = () => window.SendittoStore;
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  let activeTab = "Profile";

  const TABS = [
    ["Profile", "Operator identity"],
    ["Security", "Access & MFA"],
    ["Notifications", "Alerts & digests"],
    ["Workspace", "Org defaults"],
    ["Sending", "From, brand, tracking"],
    ["Email law", "CAN-SPAM · CASL · PECR"],
    ["Consent", "Opt-in & basis"],
    ["Data protection", "GDPR · CCPA · LGPD"],
    ["Your rights", "Access · erase · opt-out"],
    ["Legal docs", "Policies & DPA"],
    ["Accessibility", "Inclusive product"],
    ["Danger zone", "Delete account"],
  ];

  function toast(t) {
    document.querySelector(".pp-toast")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div class="pp-toast">${esc(t)}</div>`);
    setTimeout(() => document.querySelector(".pp-toast")?.remove(), 2600);
  }

  function settings() {
    return S()?.get()?.settings || {};
  }
  function workspace() {
    return S()?.currentWorkspace?.() || null;
  }

  function switchRow(key, title, copy, on, opts = {}) {
    const locked = opts.locked ? " data-locked=\"1\"" : "";
    const note = opts.law ? `<em class="st-law">${esc(opts.law)}</em>` : "";
    return `<div class="pp-switch-row st-switch${opts.locked ? " is-locked" : ""}">
      <div><b>${esc(title)}</b><small>${esc(copy)}</small>${note}</div>
      <button type="button" class="pp-toggle ${on ? "on" : ""}" data-sw="${esc(key)}"${locked} aria-label="Toggle ${esc(title)}"><i></i></button>
    </div>`;
  }

  function field(label, name, value, type = "text", extra = "") {
    if (type === "textarea") {
      return `<label class="full st-field"><span class="pp-label-text">${esc(label)}</span>
        <textarea class="pp-input pp-textarea" name="${esc(name)}" rows="3" ${extra}>${esc(value || "")}</textarea></label>`;
    }
    if (type === "select") {
      return `<label class="st-field"><span class="pp-label-text">${esc(label)}</span>
        <select class="pp-input" name="${esc(name)}" ${extra}>${value}</select></label>`;
    }
    return `<label class="st-field"><span class="pp-label-text">${esc(label)}</span>
      <input class="pp-input" type="${esc(type)}" name="${esc(name)}" value="${esc(value || "")}" ${extra}></label>`;
  }

  function opt(val, cur, label) {
    return `<option value="${esc(val)}" ${val === cur ? "selected" : ""}>${esc(label || val)}</option>`;
  }

  function callout(title, body, tone = "info") {
    return `<div class="st-callout st-callout-${tone}"><strong>${esc(title)}</strong><p>${body}</p></div>`;
  }

  function section(title, lead, body) {
    return `<section class="st-section"><h2>${esc(title)}</h2><p class="ent-muted">${esc(lead)}</p>${body}</section>`;
  }

  function complianceScore(c) {
    const checks = [
      !!c.companyLegalName,
      !!c.physicalAddress && !!c.country,
      !!c.privacyPolicyUrl,
      c.includePhysicalAddress !== false,
      c.includeUnsubscribe !== false,
      c.listUnsubscribeHeader !== false,
      c.oneClickUnsubscribe !== false,
      c.doubleOptIn !== false,
      c.consentRecords !== false,
      !!c.dpoEmail || !c.frameworks?.gdpr,
      c.dpaAccepted === true,
      c.coppaNoChildren !== false,
      !!c.supportEmail,
    ];
    const ok = checks.filter(Boolean).length;
    const pct = Math.round((ok / checks.length) * 100);
    let label = "Needs work";
    if (pct >= 90) label = "Strong";
    else if (pct >= 70) label = "Good progress";
    else if (pct >= 45) label = "Partial";
    return { ok, total: checks.length, pct, label };
  }

  function panelHtml(tab) {
    const s = settings();
    const ws = workspace();
    const c = s.compliance || {};
    const n = s.notifications || {};
    const p = s.privacy || {};
    const sp = s.securityPrefs || {};
    const sd = s.sendingDefaults || {};
    const sec = ws?.security || {};
    const fw = c.frameworks || {};

    if (tab === "Profile") {
      return (
        section(
          "Profile",
          "Your operator identity on this control plane. Used in audit trails and support tickets.",
          `<form class="pp-form st-form" data-form="profile">
            ${field("Display name", "displayName", s.displayName, "text", 'placeholder="Ada Lovelace"')}
            ${field("Work email", "email", s.email, "email", 'placeholder="you@company.com"')}
            ${field("Job title", "jobTitle", s.jobTitle, "text", 'placeholder="Head of Engineering"')}
            ${field("Phone", "phone", s.phone, "tel", 'placeholder="+1 …"')}
            ${field(
              "Language",
              "language",
              ["English", "English (US)", "English (UK)", "Français", "Deutsch", "Español", "Português", "日本語"].map((l) => opt(l, s.language || "English")).join(""),
              "select"
            )}
            ${field("Timezone", "timezone", s.timezone, "text", 'placeholder="Europe/London"')}
            ${field(
              "Date format",
              "dateFormat",
              ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"].map((d) => opt(d, s.dateFormat || "YYYY-MM-DD")).join(""),
              "select"
            )}
          </form>
          <div class="pp-actions st-actions"><button type="button" class="pp-btn primary" data-save="profile">Save profile</button></div>`
        )
      );
    }

    if (tab === "Security") {
      return (
        section(
          "Security",
          "Protect operator access, production changes, and sensitive infrastructure actions.",
          `${callout(
            "Security baseline",
            "MFA, session limits, and dual control for production keys/domains reduce account takeover and insider risk. These settings are stored for this workspace until the auth service is connected.",
            "info"
          )}
          <div class="st-toggles">
            ${switchRow("mfa", "Require multi-factor authentication (MFA)", "Second factor for admin and owner sign-in", !!sec.mfa, { law: "Security best practice · SOC 2-aligned control" })}
            ${switchRow("newDevice", "New device confirmation", "Approve unrecognized browsers and devices", sec.newDevice !== false)}
            ${switchRow("sensitive", "Re-auth for sensitive actions", "Confirm identity before key, domain, or billing changes", sec.sensitive !== false)}
            ${switchRow("sso", "SSO / SAML (enterprise)", "Require corporate identity provider when available", !!sec.sso)}
            ${switchRow("ipAllowlist", "IP allowlist for dashboard", "Restrict console access to known networks", !!sec.ipAllowlist)}
            ${switchRow("domainLock", "Domain-change protection", "Owner confirmation for DNS and authentication changes", sec.domainLock !== false)}
            ${switchRow("approvals", "Two-person approval", "Second admin must approve production key/domain changes", !!sec.approvals)}
            ${switchRow("audit", "Extended security audit log", "Retain security-relevant events for investigations", sec.audit !== false)}
            ${switchRow("loginAlerts", "Login alerts", "Email when a new session is created", sp.loginAlerts !== false)}
          </div>
          <form class="pp-form st-form" data-form="security-meta" style="margin-top:12px">
            ${field("Session timeout (minutes)", "sessionTimeoutMin", sec.sessionTimeoutMin ?? 480, "number", 'min="15" max="10080"')}
            ${field("API key rotation reminder (days)", "apiKeyRotationDays", sec.apiKeyRotationDays ?? 90, "number", 'min="7" max="365"')}
          </form>
          <div class="pp-actions st-actions">
            <button type="button" class="pp-btn" data-act="sessions">View sessions</button>
            <button type="button" class="pp-btn" data-act="password">Change password</button>
            <button type="button" class="pp-btn primary" data-save="security">Save security</button>
          </div>`
        )
      );
    }

    if (tab === "Notifications") {
      return section(
        "Notifications",
        "Operational, security, billing, and compliance alerts for this account.",
        `<div class="st-toggles">
          ${switchRow("deliveryIncidents", "Delivery incidents", "Outages, degradation, and edge failures", n.deliveryIncidents !== false)}
          ${switchRow("bounceSpike", "Bounce / block spikes", "Sudden reputation or list-quality issues", n.bounceSpike !== false)}
          ${switchRow("complaintSpike", "Complaint spikes", "Spam complaint rate alerts", n.complaintSpike !== false)}
          ${switchRow("securityActivity", "Security activity", "Keys, logins, and sensitive changes", n.securityActivity !== false)}
          ${switchRow("billingAlerts", "Billing & quota", "Usage thresholds and invoice events", n.billingAlerts !== false)}
          ${switchRow("complianceDeadlines", "Compliance deadlines", "DPA renewals, retention, and review reminders", n.complianceDeadlines !== false)}
          ${switchRow("dsarRequests", "Data-subject requests", "Access, delete, and export request alerts", n.dsarRequests !== false)}
          ${switchRow("weeklyReport", "Weekly performance digest", "Sending, delivery, and engagement summary", !!n.weeklyReport)}
          ${switchRow("productUpdates", "Product updates", "Platform features and change notices", !!n.productUpdates)}
        </div>
        <form class="pp-form st-form" data-form="notes-meta" style="margin-top:8px">
          ${field(
            "Digest channel",
            "digestChannel",
            ["email", "webhook", "both"].map((v) => opt(v, n.digestChannel || "email", v)).join(""),
            "select"
          )}
        </form>
        <div class="pp-actions st-actions"><button type="button" class="pp-btn primary" data-save="notifications">Save notifications</button></div>`
      );
    }

    if (tab === "Workspace") {
      return section(
        "Workspace",
        "Organization defaults for this Senditto workspace (name, region, type).",
        `<form class="pp-form st-form" data-form="workspace">
          ${field("Workspace name", "name", ws?.name || "", "text", "required")}
          ${field(
            "Type",
            "type",
            ["Developer workspace", "Marketing workspace", "Business workspace", "Enterprise workspace"]
              .map((t) => opt(t, ws?.type || "Developer workspace"))
              .join(""),
            "select"
          )}
          ${field(
            "Primary processing region",
            "region",
            [
              ["", "Not set"],
              ["eu-west", "Europe (EU)"],
              ["eu-central", "Europe Central"],
              ["uk-south", "United Kingdom"],
              ["us-east", "United States (East)"],
              ["us-west", "United States (West)"],
              ["ca-central", "Canada"],
              ["ap-southeast", "Asia Pacific"],
              ["sa-east", "South America"],
            ]
              .map(([v, l]) => opt(v, ws?.region || "", l))
              .join(""),
            "select"
          )}
          ${field("Workspace timezone", "timezone", ws?.timezone || s.timezone || "", "text")}
        </form>
        ${callout(
          "Data residency",
          "Choose a region that matches your contracts and customer expectations. EU/UK personal data often requires documented transfers (SCCs) if processed outside the EEA/UK.",
          "warn"
        )}
        <div class="pp-actions st-actions"><button type="button" class="pp-btn primary" data-save="workspace">Save workspace</button></div>`
      );
    }

    if (tab === "Sending") {
      return section(
        "Sending defaults",
        "Default identity, brand, and tracking used by the send composer and API control plane.",
        `<form class="pp-form st-form" data-form="sending">
          ${field("Brand / product name", "brandName", sd.brandName || c.tradingName || "", "text", 'placeholder="Acme Mail"')}
          ${field("Default From", "defaultFrom", sd.defaultFrom || "", "email", 'placeholder="hello@yourdomain.com"')}
          ${field("Default Reply-To", "defaultReplyTo", sd.defaultReplyTo || "", "email", 'placeholder="support@yourdomain.com"')}
          ${field(
            "Default stream",
            "defaultStream",
            ["Transactional", "OTP", "Marketing", "Automations"].map((x) => opt(x, sd.defaultStream || "Transactional")).join(""),
            "select"
          )}
          ${field("Default footer text", "footerText", sd.footerText || "", "textarea", 'placeholder="You received this because…"')}
        </form>
        <div class="st-toggles">
          ${switchRow("trackingDefault", "Enable tracking by default", "Open/click tracking on new messages (respect preference center)", sd.trackingDefault !== false)}
          ${switchRow("openTracking", "Open tracking", "Pixel-based opens when tracking is on", sd.openTracking !== false)}
          ${switchRow("clickTracking", "Click tracking", "Rewritten tracked links when tracking is on", sd.clickTracking !== false)}
          ${switchRow("sandboxDefault", "Sandbox mode by default", "Safer for development; disable for production sends", sd.sandboxDefault !== false)}
        </div>
        <div class="pp-actions st-actions"><button type="button" class="pp-btn primary" data-save="sending">Save sending defaults</button></div>`
      );
    }

    if (tab === "Email law") {
      const score = complianceScore(c);
      return section(
        "Email law & marketing rules",
        "Controls aligned with major commercial email requirements worldwide. This is an operational checklist — not legal advice. Engage counsel for your jurisdictions.",
        `${callout(
          `Compliance readiness · ${score.pct}% (${score.label})`,
          `${score.ok}/${score.total} required operational fields/controls are complete. Fill legal identity, address, unsubscribe, and consent settings below.`,
          score.pct >= 70 ? "ok" : "warn"
        )}
        ${callout(
          "Global commercial email norms",
          "Most regimes require: (1) accurate sender identity, (2) a working unsubscribe for marketing, (3) a valid physical/registered address for commercial mail (US CAN-SPAM), (4) no deceptive subjects/headers, (5) honoring opt-outs promptly, and (6) a lawful basis / consent where GDPR, UK GDPR, CASL, or similar apply.",
          "info"
        )}
        <h3 class="st-h3">Legal sender identity</h3>
        <form class="pp-form st-form" data-form="email-law">
          ${field("Legal company name", "companyLegalName", c.companyLegalName, "text", 'placeholder="Acme Ltd" required')}
          ${field("Trading / brand name", "tradingName", c.tradingName, "text")}
          ${field("Company / registration number", "companyNumber", c.companyNumber, "text")}
          ${field("VAT / tax ID", "vatTaxId", c.vatTaxId, "text")}
          ${field("Support contact email", "supportEmail", c.supportEmail, "email", 'placeholder="privacy@company.com"')}
          ${field("Street address (physical / registered)", "physicalAddress", c.physicalAddress, "textarea", 'placeholder="123 Market Street, Suite 4"')}
          ${field("City", "city", c.city)}
          ${field("State / region", "regionState", c.regionState)}
          ${field("Postal code", "postalCode", c.postalCode)}
          ${field("Country", "country", c.country, "text", 'placeholder="United States / Germany / …"')}
        </form>
        <h3 class="st-h3">Required commercial email controls</h3>
        <div class="st-toggles" data-group="email-law-toggles">
          ${switchRow("includePhysicalAddress", "Include physical / registered address in commercial mail", "Required under US CAN-SPAM for commercial messages; good practice globally", c.includePhysicalAddress !== false, { law: "US CAN-SPAM · best practice worldwide" })}
          ${switchRow("includeUnsubscribe", "Visible unsubscribe for marketing", "Clear opt-out in every commercial/marketing message", c.includeUnsubscribe !== false, { law: "CAN-SPAM · CASL · GDPR/PECR · CASL" })}
          ${switchRow("listUnsubscribeHeader", "List-Unsubscribe headers", "RFC 2369 / List-Unsubscribe (+ One-Click where supported)", c.listUnsubscribeHeader !== false, { law: "RFC 8058 · Gmail/Yahoo sender requirements" })}
          ${switchRow("oneClickUnsubscribe", "One-click unsubscribe", "Support one-click marketing opt-out", c.oneClickUnsubscribe !== false, { law: "RFC 8058 · major mailbox providers" })}
          ${switchRow("identifySender", "Accurate From / sender identification", "No spoofed or misleading From names", c.identifySender !== false, { law: "CAN-SPAM · CASL · unfair commercial practices" })}
          ${switchRow("noDeceptiveSubjects", "No deceptive subject lines", "Subject must reflect message content", c.noDeceptiveSubjects !== false, { law: "CAN-SPAM · consumer protection laws" })}
          ${switchRow("commercialVsTransactional", "Label commercial vs transactional streams", "Keep OTP/receipts separate from marketing consent rules", c.commercialVsTransactional !== false, { law: "Consent scope · PECR · CASL" })}
          ${switchRow("honorGlobalUnsub", "Honor global suppressions / unsubscribes", "Never re-mail suppressed addresses without new consent", c.honorGlobalUnsub !== false)}
          ${switchRow("suppressionsForever", "Keep suppressions indefinitely", "Retain bounce/complaint/unsub until lawful re-permission", c.suppressionsForever !== false)}
        </div>
        <h3 class="st-h3">Jurisdictions this workspace targets</h3>
        <p class="ent-muted">Enable frameworks that apply to your recipients or establishment. Policies and consent UI should match the strictest applicable set.</p>
        <div class="st-toggles st-frameworks" data-group="frameworks">
          ${switchRow("canSpam", "United States — CAN-SPAM", "Commercial email: identity, address, opt-out, no deception", fw.canSpam !== false)}
          ${switchRow("casl", "Canada — CASL", "Express/implied consent + identification + unsubscribe", fw.casl !== false)}
          ${switchRow("gdpr", "EU — GDPR", "Lawful basis, transparency, DSAR, DPIA where needed", fw.gdpr !== false)}
          ${switchRow("ukGdpr", "United Kingdom — UK GDPR + PECR", "UK data protection and electronic marketing rules", fw.ukGdpr !== false)}
          ${switchRow("peCr", "EU/UK — PECR / ePrivacy marketing", "Rules for electronic marketing communications", fw.peCr !== false)}
          ${switchRow("ccpa", "California — CCPA/CPRA", "Privacy rights, opt-outs, service provider terms", fw.ccpa !== false)}
          ${switchRow("lgpd", "Brazil — LGPD", "Brazilian data protection principles and rights", !!fw.lgpd)}
          ${switchRow("pipeda", "Canada — PIPEDA", "Federal privacy for commercial activity", !!fw.pipeda)}
          ${switchRow("appAu", "Australia — Privacy Act / APPs", "Australian Privacy Principles", !!fw.appAu)}
          ${switchRow("pdpaSg", "Singapore — PDPA", "Personal data protection obligations", !!fw.pdpaSg)}
          ${switchRow("popia", "South Africa — POPIA", "Protection of Personal Information Act", !!fw.popia)}
        </div>
        <div class="pp-actions st-actions"><button type="button" class="pp-btn primary" data-save="email-law">Save email law settings</button></div>`
      );
    }

    if (tab === "Consent") {
      return section(
        "Consent & subscribers",
        "Capture, prove, and honor marketing permission. Critical under GDPR, UK GDPR, CASL, and PECR-style regimes.",
        `${callout(
          "Lawful basis for marketing",
          "Under GDPR/UK GDPR, marketing usually relies on consent or (narrowly) legitimate interests with a balancing test and easy opt-out. CASL generally requires express consent (or limited implied consent). Soft opt-in rules vary — configure double opt-in when in doubt.",
          "info"
        )}
        <form class="pp-form st-form" data-form="consent">
          ${field(
            "Default lawful basis (marketing)",
            "lawfulBasisDefault",
            [
              ["consent", "Consent (recommended for most marketing)"],
              ["legitimate_interest", "Legitimate interests (document LIA)"],
              ["contract", "Contract (transactional only — not bulk marketing)"],
            ]
              .map(([v, l]) => opt(v, c.lawfulBasisDefault || "consent", l))
              .join(""),
            "select"
          )}
          ${field("Preference center URL", "preferenceCenterUrl", c.preferenceCenterUrl, "url", 'placeholder="https://yourapp.com/email-preferences"')}
        </form>
        <div class="st-toggles" data-group="consent-toggles">
          ${switchRow("doubleOptIn", "Double opt-in for marketing lists", "Confirm email ownership before marketing", c.doubleOptIn !== false, { law: "Strong GDPR/CASL evidence · deliverability" })}
          ${switchRow("consentRecords", "Store consent evidence", "Who, when, how, and what text was accepted", c.consentRecords !== false, { law: "GDPR Art. 7 accountability · CASL proof" })}
          ${switchRow("caslExpressConsent", "CASL express consent workflow", "Clear affirmative opt-in language for Canada", c.caslExpressConsent !== false)}
          ${switchRow("caslImpliedConsentTracking", "Track CASL implied-consent windows", "Expiry for existing-business-relationship style consent", c.caslImpliedConsentTracking !== false)}
        </div>
        <div class="st-checklist">
          <h3 class="st-h3">Subscriber rights checklist</h3>
          <ul>
            <li>Marketing lists only include people with a valid basis</li>
            <li>Unsubscribe / preference changes apply quickly (often ≤10 business days; aim for immediate)</li>
            <li>Transactional mail (OTP, receipts) is not used to sneak marketing without a basis</li>
            <li>Suppression list is checked before every marketing send</li>
          </ul>
        </div>
        <div class="pp-actions st-actions"><button type="button" class="pp-btn primary" data-save="consent">Save consent settings</button></div>`
      );
    }

    if (tab === "Data protection") {
      return section(
        "Data protection & privacy",
        "Controller/processor posture for personal data in messages, contacts, logs, and support.",
        `${callout(
          "Roles",
          "Your organization is typically the controller of subscriber/customer data. Senditto acts as processor for email infrastructure once the backend is live. Document purposes, retention, and sub-processors in your DPA.",
          "info"
        )}
        <form class="pp-form st-form" data-form="dp">
          ${field(
            "Default data residency preference",
            "dataResidency",
            [
              ["eu-west", "EU West"],
              ["eu-central", "EU Central"],
              ["uk-south", "United Kingdom"],
              ["us-east", "US East"],
              ["us-west", "US West"],
              ["ca-central", "Canada"],
              ["ap-southeast", "Asia Pacific"],
            ]
              .map(([v, l]) => opt(v, c.dataResidency || "eu-west", l))
              .join(""),
            "select"
          )}
          ${field("Data Protection Officer name", "dpoName", c.dpoName, "text", 'placeholder="Optional where required"')}
          ${field("DPO / privacy contact email", "dpoEmail", c.dpoEmail, "email", 'placeholder="dpo@company.com"')}
          ${field("Message body retention (days)", "messageRetentionDays", c.messageRetentionDays ?? 90, "number", 'min="1" max="3650"')}
          ${field("Event / webhook retention (days)", "eventRetentionDays", c.eventRetentionDays ?? 180, "number", 'min="1" max="3650"')}
          ${field("Operational log retention (days)", "logRetentionDays", c.logRetentionDays ?? 365, "number", 'min="1" max="3650"')}
          ${field("Audit log retention (days)", "auditRetentionDays", c.auditRetentionDays ?? 730, "number", 'min="30" max="3650"')}
          ${field("Breach notification target (hours)", "breachNotifyHours", c.breachNotifyHours ?? 72, "number", 'min="1" max="168"')}
          ${field("Data-subject request SLA (days)", "dsarSlaDays", c.dsarSlaDays ?? 30, "number", 'min="1" max="90"')}
          ${field("Last compliance review (date)", "lastComplianceReview", c.lastComplianceReview, "date")}
        </form>
        <div class="st-toggles" data-group="dp-toggles">
          ${switchRow("dpaAccepted", "Data Processing Agreement (DPA) accepted", "Controller–processor terms on file", !!c.dpaAccepted, { law: "GDPR Art. 28 · similar processor contracts" })}
          ${switchRow("sccAccepted", "Standard Contractual Clauses / transfer tool", "For restricted international transfers where required", !!c.sccAccepted, { law: "GDPR Ch. V · UK IDTA/Addendum" })}
          ${switchRow("regional", "Prefer regional processing", "Keep processing in selected residency when possible", p.regional !== false)}
          ${switchRow("minimizePiiInLogs", "Minimize PII in logs", "Redact emails/bodies from diagnostic logs where possible", p.minimizePiiInLogs !== false)}
          ${switchRow("analytics", "Privacy-aware product analytics", "Aggregated product usage only", !!p.analytics)}
          ${switchRow("diagnostics", "Anonymized diagnostic reporting", "Crash/error telemetry without message content", !!p.diagnostics)}
          ${switchRow("shareSubprocessors", "Show sub-processor list to customers", "Transparency for processor chains", p.shareSubprocessors !== false)}
          ${switchRow("coppaNoChildren", "No intentional collection from children", "Do not target under-13 / under applicable age", c.coppaNoChildren !== false, { law: "COPPA · GDPR child rules · similar laws" })}
          ${switchRow("noSpecialCategoryData", "No special-category data in email content by default", "Avoid health, biometrics, etc. unless explicitly lawful", c.noSpecialCategoryData !== false, { law: "GDPR Art. 9" })}
        </div>
        <div class="st-checklist">
          <h3 class="st-h3">Data-subject rights (enable process + contacts)</h3>
          <ul>
            <li><b>Access / portability</b> — export contact + message metadata on request</li>
            <li><b>Rectification</b> — correct inaccurate personal data</li>
            <li><b>Erasure</b> — delete or suppress when required (honor legal holds)</li>
            <li><b>Restriction / objection</b> — stop marketing processing on objection</li>
            <li><b>CCPA/CPRA</b> — know, delete, correct, opt-out of sale/share (if applicable)</li>
          </ul>
        </div>
        <div class="pp-actions st-actions">
          <button type="button" class="pp-btn" data-act="export-dsar">Generate DSAR export package</button>
          <button type="button" class="pp-btn primary" data-save="data-protection">Save data protection</button>
        </div>`
      );
    }

    if (tab === "Legal docs") {
      return section(
        "Legal documents & public policies",
        "Publish URLs your recipients and customers can rely on. Link the same policies in footers and signup forms.",
        `<form class="pp-form st-form" data-form="legal">
          ${field("Privacy policy URL", "privacyPolicyUrl", c.privacyPolicyUrl, "url", 'placeholder="https://company.com/privacy"')}
          ${field("Terms of service URL", "termsUrl", c.termsUrl, "url", 'placeholder="https://company.com/terms"')}
          ${field("Cookie / tracking policy URL", "cookiePolicyUrl", c.cookiePolicyUrl, "url")}
          ${field("Imprint / legal notice URL", "imprintUrl", c.imprintUrl, "url", 'placeholder="Required in some EU jurisdictions"')}
          ${field("Accessibility statement URL", "accessibilityStatementUrl", c.accessibilityStatementUrl, "url")}
        </form>
        ${callout(
          "Not legal advice",
          "Senditto provides operational controls to help you implement common statutory requirements (CAN-SPAM, CASL, GDPR/UK GDPR, CCPA/CPRA, LGPD, PECR, and others). Your counsel should review policies, DPAs, and marketing copy for your industry and countries.",
          "warn"
        )}
        <div class="pp-actions st-actions">
          <button type="button" class="pp-btn" data-act="export-compliance">Download compliance snapshot (JSON)</button>
          <button type="button" class="pp-btn primary" data-save="legal">Save legal documents</button>
        </div>`
      );
    }

    if (tab === "Your rights") {
      const life = s.accountLifecycle || {};
      const reqs = Array.isArray(s.rightsRequests) ? s.rightsRequests.slice(0, 8) : [];
      return section(
        "Your privacy rights",
        "Tools for data subject and account-holder rights under GDPR, UK GDPR, CCPA/CPRA, LGPD, PIPEDA, and similar laws. Not legal advice — process real requests within your SLA.",
        `${callout(
          "Worldwide rights (typical)",
          "Access / portability · Rectification · Erasure (delete) · Restriction · Objection · Withdraw consent · Opt-out of sale/share (CCPA/CPRA) · Lodge a complaint with a supervisory authority. Children and special-category data need stricter handling.",
          "info"
        )}
        <div class="st-rights-grid">
          <article class="st-right-card">
            <h3>Access &amp; portability</h3>
            <p>Download a machine-readable copy of account and workspace data (GDPR Art. 15/20 · CCPA know).</p>
            <button type="button" class="pp-btn" data-act="export-dsar">Download my data</button>
          </article>
          <article class="st-right-card">
            <h3>Rectification</h3>
            <p>Correct inaccurate profile data anytime under Profile. Log formal correction requests.</p>
            <button type="button" class="pp-btn" data-act="rights-rectify">Record correction request</button>
          </article>
          <article class="st-right-card">
            <h3>Erasure / delete</h3>
            <p>Request deletion of personal data and the account (GDPR Art. 17 · CCPA delete · LGPD).</p>
            <button type="button" class="pp-btn danger" data-act="delete-account">Delete my account…</button>
          </article>
          <article class="st-right-card">
            <h3>Withdraw marketing consent</h3>
            <p>Stop marketing processing; keep transactional/OTP if still needed for contract.</p>
            <button type="button" class="pp-btn" data-act="withdraw-marketing">${life.marketingConsentWithdrawn ? "Consent already withdrawn" : "Withdraw marketing consent"}</button>
          </article>
        </div>
        <h3 class="st-h3">Ongoing privacy controls</h3>
        <div class="st-toggles" data-group="rights-toggles">
          ${switchRow("doNotSellShare", "Do not sell or share my personal information", "CCPA/CPRA opt-out of sale/share (and similar US state laws)", !!life.doNotSellShare, { law: "CCPA/CPRA · US state privacy acts" })}
          ${switchRow("restrictProcessing", "Restrict processing", "Limit processing while a dispute or request is pending", !!life.restrictProcessing, { law: "GDPR Art. 18" })}
          ${switchRow("objectToProcessing", "Object to processing", "Object to processing based on legitimate interests / direct marketing", !!life.objectToProcessing, { law: "GDPR Art. 21 · PECR" })}
          ${switchRow("legalHold", "Legal hold (prevent deletion)", "Retain data required for legal claims, tax, or regulatory holds", !!life.legalHold, { law: "Lawful retention exceptions" })}
        </div>
        <div class="pp-actions st-actions">
          <button type="button" class="pp-btn primary" data-save="rights">Save privacy rights</button>
        </div>
        <h3 class="st-h3">Recent rights requests</h3>
        ${
          reqs.length
            ? `<div class="st-req-list">${reqs
                .map(
                  (r) =>
                    `<div class="st-req-row"><b>${esc(r.type)}</b><span>${esc(r.createdAt || "")}</span><em>${esc(r.status || "")}</em></div>`
                )
                .join("")}</div>`
            : `<p class="ent-muted">No rights requests recorded yet.</p>`
        }
        ${
          life.status === "pending_deletion"
            ? callout(
                "Account deletion scheduled",
                `Scheduled for <b>${esc(life.deletionScheduledFor || "—")}</b>. Reason: ${esc(life.deletionReason || "—")}. You can cancel below before the grace period ends.`,
                "danger"
              ) +
              `<div class="pp-actions st-actions"><button type="button" class="pp-btn" data-act="cancel-deletion">Cancel scheduled deletion</button><button type="button" class="pp-btn danger" data-act="delete-now">Delete immediately</button></div>`
            : ""
        }`
      );
    }

    if (tab === "Accessibility") {
      return section(
        "Accessibility & inclusion",
        "Dashboard and email accessibility practices (WCAG-oriented). Supports equal access obligations in many jurisdictions.",
        `${callout(
          "Email accessibility",
          "Use semantic HTML, sufficient contrast, meaningful alt text, large tap targets for CTAs, and plain-text alternatives. Avoid text locked only in images.",
          "info"
        )}
        <div class="st-checklist">
          <ul>
            <li>Prefer HTML + plain-text multipart messages</li>
            <li>Descriptive link text (not “click here” only)</li>
            <li>Language attribute set on templates</li>
            <li>Dashboard supports keyboard navigation for primary actions</li>
            <li>Link an accessibility statement under Legal docs when published</li>
          </ul>
        </div>
        <form class="pp-form st-form" data-form="a11y">
          ${field("Accessibility statement URL", "accessibilityStatementUrl", c.accessibilityStatementUrl, "url")}
        </form>
        <div class="pp-actions st-actions"><button type="button" class="pp-btn primary" data-save="a11y">Save accessibility</button></div>`
      );
    }

    // Danger zone — account deletion & full erase (required by privacy laws)
    const life = s.accountLifecycle || {};
    return section(
      "Danger zone — delete account & erase data",
      "Privacy laws worldwide require a clear way to erase personal data and close an account (e.g. GDPR Art. 17 erasure, CCPA/CPRA deletion, LGPD, UK GDPR). Use the options below. Export first if you need a copy.",
      `${callout(
        "Your right to delete",
        "You can request deletion of your account and associated personal data. Some records may be retained where the law requires (tax, fraud, legal claims, suppressions needed to honor opt-outs). A legal hold blocks erasure until released.",
        "danger"
      )}
      ${
        life.legalHold
          ? callout(
              "Legal hold is ON",
              "Erasure is blocked while legal hold is enabled. Turn it off under Your rights if no longer required.",
              "warn"
            )
          : ""
      }
      ${
        life.status === "pending_deletion"
          ? callout(
              "Deletion already scheduled",
              `This account is set to be erased on <b>${esc(life.deletionScheduledFor || "—")}</b>. Cancel under Your rights, or delete immediately below.`,
              "warn"
            )
          : ""
      }

      <div class="st-danger-block">
        <h3 class="st-h3">1. Export a copy (portability)</h3>
        <p class="ent-muted">Recommended before deletion. Includes local control-plane data (settings, logs, keys metadata, messages stored here).</p>
        <div class="pp-actions st-actions">
          <button type="button" class="pp-btn" data-act="export-all">Export all data</button>
          <button type="button" class="pp-btn" data-act="export-dsar">Export DSAR package</button>
          <button type="button" class="pp-btn" data-act="export-compliance">Export compliance snapshot</button>
        </div>
      </div>

      <div class="st-danger-block">
        <h3 class="st-h3">2. Schedule account deletion (grace period)</h3>
        <p class="ent-muted">Starts a timed erasure (default 30 days). You can cancel during the window. Aligns with common consumer deletion practices.</p>
        <button type="button" class="pp-btn danger" data-act="delete-account">Schedule delete account…</button>
      </div>

      <div class="st-danger-block">
        <h3 class="st-h3">3. Delete account immediately</h3>
        <p class="ent-muted">Immediately wipe all local account and workspace data in this browser (full erase). Production will also call the API when connected.</p>
        <button type="button" class="pp-btn danger" data-act="delete-now">Delete account &amp; erase everything now…</button>
      </div>

      <div class="st-danger-block">
        <h3 class="st-h3">4. Clear local platform data only</h3>
        <p class="ent-muted">Wipes this browser’s Senditto control-plane store without the formal “delete account” confirmation flow. Same end state for local data.</p>
        <button type="button" class="pp-btn danger" data-act="clear-local">Clear all local platform data…</button>
      </div>

      <div class="st-checklist">
        <h3 class="st-h3">What erasure covers (local control plane)</h3>
        <ul>
          <li>Profile, settings, compliance configuration</li>
          <li>API keys, domains, webhooks, senders, SMTP credentials</li>
          <li>Messages, logs, contacts, campaigns, templates stored locally</li>
          <li>Team invites, audit trail, rights-request history</li>
        </ul>
        <h3 class="st-h3">What may be retained when production is live</h3>
        <ul>
          <li>Suppressions needed to honor prior opt-outs (so you are not re-mailed)</li>
          <li>Records required by tax, accounting, or legal claims (limited fields)</li>
          <li>Security logs for fraud prevention for a defined retention period</li>
        </ul>
      </div>`
    );
  }

  function readToggles(root, keys) {
    const out = {};
    (keys || []).forEach((k) => {
      const el = root.querySelector(`[data-sw="${k}"]`);
      if (el) out[k] = el.classList.contains("on");
    });
    // also any toggle under root
    if (!keys) {
      root.querySelectorAll("[data-sw]").forEach((el) => {
        out[el.dataset.sw] = el.classList.contains("on");
      });
    }
    return out;
  }

  function formData(root, sel) {
    const f = root.querySelector(sel);
    if (!f) return {};
    return Object.fromEntries(new FormData(f));
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function bindPanel(root) {
    root.querySelectorAll("[data-sw]").forEach((b) => {
      if (b.dataset.locked === "1") return;
      b.onclick = () => b.classList.toggle("on");
    });

    root.querySelectorAll("[data-save]").forEach((btn) => {
      btn.onclick = () => save(btn.dataset.save, root);
    });

    root.querySelectorAll("[data-act]").forEach((btn) => {
      btn.onclick = () => act(btn.dataset.act, root);
    });
  }

  function save(kind, root) {
    const store = S();
    if (!store) return toast("Store not ready");

    if (kind === "profile") {
      const d = formData(root, '[data-form="profile"]');
      store.setSettings({
        displayName: d.displayName || "",
        email: d.email || "",
        jobTitle: d.jobTitle || "",
        phone: d.phone || "",
        language: d.language || "English",
        timezone: d.timezone || "",
        dateFormat: d.dateFormat || "YYYY-MM-DD",
      });
      store.logEvent?.("info", "settings.profile", "Profile updated");
      return toast("Profile saved");
    }

    if (kind === "security") {
      const ws = workspace();
      if (!ws) return toast("No workspace");
      const toggles = readToggles(root);
      const meta = formData(root, '[data-form="security-meta"]');
      store.updateWorkspace(ws.id, {
        security: {
          ...(ws.security || {}),
          mfa: !!toggles.mfa,
          newDevice: !!toggles.newDevice,
          sensitive: !!toggles.sensitive,
          sso: !!toggles.sso,
          ipAllowlist: !!toggles.ipAllowlist,
          domainLock: !!toggles.domainLock,
          approvals: !!toggles.approvals,
          audit: !!toggles.audit,
          sessionTimeoutMin: num(meta.sessionTimeoutMin, 480),
          apiKeyRotationDays: num(meta.apiKeyRotationDays, 90),
        },
      });
      store.setSettings({
        securityPrefs: {
          ...(settings().securityPrefs || {}),
          mfa: !!toggles.mfa,
          newDevice: !!toggles.newDevice,
          sensitive: !!toggles.sensitive,
          loginAlerts: !!toggles.loginAlerts,
        },
      });
      store.logEvent?.("info", "settings.security", "Security settings updated");
      return toast("Security saved");
    }

    if (kind === "notifications") {
      const toggles = readToggles(root);
      const meta = formData(root, '[data-form="notes-meta"]');
      store.setSettings({
        notifications: {
          ...(settings().notifications || {}),
          ...toggles,
          digestChannel: meta.digestChannel || "email",
        },
      });
      return toast("Notifications saved");
    }

    if (kind === "workspace") {
      const ws = workspace();
      const d = formData(root, '[data-form="workspace"]');
      if (!ws) return toast("No workspace");
      store.updateWorkspace(ws.id, {
        name: d.name || ws.name,
        type: d.type || ws.type,
        region: d.region || "",
        timezone: d.timezone || "",
      });
      return toast("Workspace saved");
    }

    if (kind === "sending") {
      const d = formData(root, '[data-form="sending"]');
      const toggles = readToggles(root);
      store.setSettings({
        sendingDefaults: {
          ...(settings().sendingDefaults || {}),
          brandName: d.brandName || "",
          defaultFrom: d.defaultFrom || "",
          defaultReplyTo: d.defaultReplyTo || "",
          defaultStream: d.defaultStream || "Transactional",
          footerText: d.footerText || "",
          trackingDefault: !!toggles.trackingDefault,
          openTracking: !!toggles.openTracking,
          clickTracking: !!toggles.clickTracking,
          sandboxDefault: !!toggles.sandboxDefault,
        },
      });
      return toast("Sending defaults saved");
    }

    if (kind === "email-law") {
      const d = formData(root, '[data-form="email-law"]');
      const lawToggles = {};
      root.querySelectorAll('[data-group="email-law-toggles"] [data-sw]').forEach((el) => {
        lawToggles[el.dataset.sw] = el.classList.contains("on");
      });
      const frameworks = {};
      root.querySelectorAll('[data-group="frameworks"] [data-sw]').forEach((el) => {
        frameworks[el.dataset.sw] = el.classList.contains("on");
      });
      store.setSettings({
        compliance: {
          ...(settings().compliance || {}),
          companyLegalName: d.companyLegalName || "",
          tradingName: d.tradingName || "",
          companyNumber: d.companyNumber || "",
          vatTaxId: d.vatTaxId || "",
          supportEmail: d.supportEmail || "",
          physicalAddress: d.physicalAddress || "",
          city: d.city || "",
          regionState: d.regionState || "",
          postalCode: d.postalCode || "",
          country: d.country || "",
          ...lawToggles,
          frameworks: { ...(settings().compliance?.frameworks || {}), ...frameworks },
        },
      });
      store.logEvent?.("info", "settings.compliance", "Email law settings updated");
      toast("Email law settings saved");
      return render(); // refresh score
    }

    if (kind === "consent") {
      const d = formData(root, '[data-form="consent"]');
      const toggles = {};
      root.querySelectorAll('[data-group="consent-toggles"] [data-sw]').forEach((el) => {
        toggles[el.dataset.sw] = el.classList.contains("on");
      });
      store.setSettings({
        compliance: {
          ...(settings().compliance || {}),
          lawfulBasisDefault: d.lawfulBasisDefault || "consent",
          preferenceCenterUrl: d.preferenceCenterUrl || "",
          ...toggles,
        },
      });
      return toast("Consent settings saved");
    }

    if (kind === "data-protection") {
      const d = formData(root, '[data-form="dp"]');
      const toggles = {};
      root.querySelectorAll('[data-group="dp-toggles"] [data-sw]').forEach((el) => {
        toggles[el.dataset.sw] = el.classList.contains("on");
      });
      const privacyKeys = ["regional", "minimizePiiInLogs", "analytics", "diagnostics", "shareSubprocessors"];
      const privacy = { ...(settings().privacy || {}) };
      const compliance = { ...(settings().compliance || {}) };
      privacyKeys.forEach((k) => {
        if (k in toggles) privacy[k] = toggles[k];
      });
      Object.keys(toggles).forEach((k) => {
        if (!privacyKeys.includes(k)) compliance[k] = toggles[k];
      });
      store.setSettings({
        privacy,
        compliance: {
          ...compliance,
          dataResidency: d.dataResidency || "eu-west",
          dpoName: d.dpoName || "",
          dpoEmail: d.dpoEmail || "",
          messageRetentionDays: num(d.messageRetentionDays, 90),
          eventRetentionDays: num(d.eventRetentionDays, 180),
          logRetentionDays: num(d.logRetentionDays, 365),
          auditRetentionDays: num(d.auditRetentionDays, 730),
          breachNotifyHours: num(d.breachNotifyHours, 72),
          dsarSlaDays: num(d.dsarSlaDays, 30),
          lastComplianceReview: d.lastComplianceReview || "",
        },
      });
      store.logEvent?.("info", "settings.data_protection", "Data protection settings updated");
      return toast("Data protection saved");
    }

    if (kind === "legal" || kind === "a11y") {
      const sel = kind === "legal" ? '[data-form="legal"]' : '[data-form="a11y"]';
      const d = formData(root, sel);
      store.setSettings({
        compliance: {
          ...(settings().compliance || {}),
          privacyPolicyUrl: d.privacyPolicyUrl ?? settings().compliance?.privacyPolicyUrl ?? "",
          termsUrl: d.termsUrl ?? settings().compliance?.termsUrl ?? "",
          cookiePolicyUrl: d.cookiePolicyUrl ?? settings().compliance?.cookiePolicyUrl ?? "",
          imprintUrl: d.imprintUrl ?? settings().compliance?.imprintUrl ?? "",
          accessibilityStatementUrl:
            d.accessibilityStatementUrl ?? settings().compliance?.accessibilityStatementUrl ?? "",
        },
      });
      return toast(kind === "legal" ? "Legal documents saved" : "Accessibility saved");
    }

    if (kind === "rights") {
      const toggles = {};
      root.querySelectorAll('[data-group="rights-toggles"] [data-sw]').forEach((el) => {
        toggles[el.dataset.sw] = el.classList.contains("on");
      });
      store.setSettings({
        accountLifecycle: {
          ...(settings().accountLifecycle || {}),
          doNotSellShare: !!toggles.doNotSellShare,
          restrictProcessing: !!toggles.restrictProcessing,
          objectToProcessing: !!toggles.objectToProcessing,
          legalHold: !!toggles.legalHold,
        },
      });
      store.logRightsRequest?.("privacy_controls_updated", toggles);
      return toast("Privacy rights saved");
    }
  }

  function act(name) {
    const store = S();
    if (!store) return;

    if (name === "export-all" || name === "export-dsar" || name === "export-compliance") {
      const payload =
        name === "export-compliance"
          ? JSON.stringify(
              {
                exportedAt: new Date().toISOString(),
                type: "senditto-compliance-snapshot",
                settings: settings(),
                workspace: workspace(),
                score: complianceScore(settings().compliance || {}),
              },
              null,
              2
            )
          : store.exportJson();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
      a.download =
        name === "export-compliance"
          ? "senditto-compliance-snapshot.json"
          : name === "export-dsar"
            ? "senditto-dsar-export.json"
            : "senditto-platform-export.json";
      a.click();
      URL.revokeObjectURL(a.href);
      return toast("Export downloaded");
    }

    if (name === "sessions") {
      document.querySelector(".st-modal")?.remove();
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div class="pp-modal st-modal"><button class="pp-backdrop" data-x type="button"></button>
        <section class="pp-dialog"><button class="pp-close" data-x type="button">✕</button>
        <h2>Active sessions</h2>
        <p class="ent-muted">Auth service not connected yet — this browser is the only local session.</p>
        <div class="pp-detail">
          <div class="pp-detail-row"><span>Device</span><b>This browser</b></div>
          <div class="pp-detail-row"><span>Status</span><b style="color:#14966b">Current</b></div>
          <div class="pp-detail-row"><span>Started</span><b>${esc(new Date().toLocaleString())}</b></div>
        </div>
        <div class="pp-modal-actions"><button class="pp-btn primary" data-x type="button">Done</button></div>
        </section></div>`
      );
      document.querySelectorAll(".st-modal [data-x]").forEach((b) => (b.onclick = () => document.querySelector(".st-modal")?.remove()));
      return;
    }

    if (name === "password") {
      document.querySelector(".st-modal")?.remove();
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div class="pp-modal st-modal"><button class="pp-backdrop" data-x type="button"></button>
        <section class="pp-dialog"><button class="pp-close" data-x type="button">✕</button>
        <h2>Change password</h2>
        <p class="ent-muted">Password changes activate when authentication is connected to the backend.</p>
        <form class="pp-form st-form" data-pw>
          <label class="full"><span class="pp-label-text">Current password</span><input class="pp-input" type="password" name="cur" required></label>
          <label class="full"><span class="pp-label-text">New password</span><input class="pp-input" type="password" name="n1" minlength="12" required></label>
          <label class="full"><span class="pp-label-text">Confirm new password</span><input class="pp-input" type="password" name="n2" minlength="12" required></label>
        </form>
        <div class="pp-modal-actions">
          <button class="pp-btn" data-x type="button">Cancel</button>
          <button class="pp-btn primary" data-pw-save type="button">Update password</button>
        </div></section></div>`
      );
      const m = document.querySelector(".st-modal");
      m.querySelectorAll("[data-x]").forEach((b) => (b.onclick = () => m.remove()));
      m.querySelector("[data-pw-save]").onclick = () => {
        const f = m.querySelector("[data-pw]");
        if (!f.reportValidity()) return;
        const d = Object.fromEntries(new FormData(f));
        if (d.n1 !== d.n2) return toast("Passwords do not match");
        m.remove();
        toast("Password update queued (auth pending)");
      };
      return;
    }

    if (name === "clear-local") {
      openDeleteModal({
        mode: "clear",
        title: "Clear all local platform data",
        lead: "This erases the Senditto control-plane data stored in this browser. Export first if you need a copy. This cannot be undone.",
      });
      return;
    }

    if (name === "delete-account") {
      openDeleteModal({
        mode: "schedule",
        title: "Delete my account",
        lead: "Schedule permanent deletion of your account and personal data. Default grace period is 30 days (you can cancel). Required under GDPR erasure, CCPA/CPRA delete, LGPD, and similar laws.",
      });
      return;
    }

    if (name === "delete-now") {
      openDeleteModal({
        mode: "immediate",
        title: "Delete account immediately",
        lead: "Immediately erase your account and all local platform data. Type DELETE to confirm. Legal holds must be off.",
      });
      return;
    }

    if (name === "cancel-deletion") {
      store.cancelAccountDeletion?.();
      toast("Scheduled deletion cancelled");
      return render();
    }

    if (name === "withdraw-marketing") {
      store.setSettings({
        accountLifecycle: {
          ...(settings().accountLifecycle || {}),
          marketingConsentWithdrawn: true,
        },
      });
      store.logRightsRequest?.("marketing_consent_withdrawn", {});
      store.setSettings({
        compliance: {
          ...(settings().compliance || {}),
          // keep records but flag withdrawal
        },
      });
      toast("Marketing consent withdrawn");
      return render();
    }

    if (name === "rights-rectify") {
      store.logRightsRequest?.("rectification", { note: "User requested profile correction" });
      activeTab = "Profile";
      toast("Correction request recorded — update Profile fields");
      return render();
    }
  }

  function openDeleteModal({ mode, title, lead }) {
    const store = S();
    if (!store) return;
    const life = settings().accountLifecycle || {};
    if (life.legalHold && mode !== "clear") {
      return toast("Legal hold is ON — turn it off under Your rights before deletion");
    }

    document.querySelector(".st-modal")?.remove();
    const showGrace = mode === "schedule";
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="pp-modal st-modal st-delete-modal"><button class="pp-backdrop" data-x type="button"></button>
      <section class="pp-dialog wide">
        <button class="pp-close" data-x type="button">✕</button>
        <h2>${esc(title)}</h2>
        <p class="ent-muted">${esc(lead)}</p>
        ${callout(
          "Legal notice",
          "Erasure covers personal data we process for your account. Limited data may be retained where the law requires (fraud, tax, legal claims, or suppressions needed to honor prior opt-outs). This control plane currently erases local data; the production API will complete multi-region deletion when connected.",
          "warn"
        )}
        <form class="pp-form st-form" data-del-form>
          <label class="full"><span class="pp-label-text">Reason (optional)</span>
            <select class="pp-input" name="reason">
              <option value="privacy">Privacy / no longer need the service</option>
              <option value="erasure_request">Formal erasure / DSAR request</option>
              <option value="ccpa_delete">CCPA/CPRA deletion request</option>
              <option value="security">Security concern</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label class="full"><span class="pp-label-text">Confirm account email</span>
            <input class="pp-input" type="email" name="email" value="${esc(settings().email || "you@example.com")}" placeholder="you@company.com" required>
          </label>
          ${
            showGrace
              ? `<label><span class="pp-label-text">Grace period (days)</span>
                  <input class="pp-input" type="number" name="graceDays" value="30" min="0" max="90">
                </label>`
              : ""
          }
          <label class="full"><span class="pp-label-text">Type <b>DELETE</b> to confirm</span>
            <input class="pp-input" name="confirm" placeholder="DELETE" autocomplete="off" required>
          </label>
          <label class="full st-check">
            <input type="checkbox" name="exportDone" value="1">
            <span>I understand this removes my account data and I have exported anything I need (or choose not to).</span>
          </label>
          <label class="full st-check">
            <input type="checkbox" name="lawAck" value="1" required>
            <span>I understand residual retention may apply where required by law (tax, legal claims, opt-out suppressions).</span>
          </label>
        </form>
        <div class="pp-modal-actions">
          <button class="pp-btn" data-x type="button">Cancel</button>
          <button class="pp-btn" data-del-export type="button">Export data first</button>
          <button class="pp-btn danger" data-del-go type="button">${
            mode === "schedule" ? "Schedule deletion" : mode === "immediate" ? "Delete everything now" : "Clear all data"
          }</button>
        </div>
      </section></div>`
    );
    const m = document.querySelector(".st-modal");
    m.querySelectorAll("[data-x]").forEach((b) => (b.onclick = () => m.remove()));
    m.querySelector("[data-del-export]").onclick = () => {
      act("export-all");
    };
    m.querySelector("[data-del-go]").onclick = () => {
      try {
        const f = m.querySelector("[data-del-form]");
        if (!f.reportValidity()) return;
        const d = Object.fromEntries(new FormData(f));
        if (String(d.confirm || "").trim().toUpperCase() !== "DELETE") {
          return toast("Type DELETE in capitals to confirm");
        }
        if (!d.lawAck) return toast("Please acknowledge lawful residual retention");

        if (mode === "schedule") {
          if (typeof store.requestAccountDeletion !== "function") {
            return toast("Deletion API not loaded — hard refresh the page");
          }
          store.requestAccountDeletion({
            reason: d.reason || "",
            email: d.email || "",
            graceDays: Number(d.graceDays) || 30,
          });
          m.remove();
          toast("Account deletion scheduled");
          activeTab = "Your rights";
          return render();
        }

        // immediate or clear — full erase
        if (typeof store.deleteAccountNow === "function") {
          store.deleteAccountNow({ reason: d.reason || mode });
        } else {
          store.resetAll();
        }
        m.remove();
        toast("Account deleted — all local data erased");
        activeTab = "Profile";
        return render();
      } catch (err) {
        console.error(err);
        toast(err.message || "Deletion failed");
      }
    };
  }

  function render() {
    const h = host();
    if (!h || !S()) return;
    const s = settings();
    const score = complianceScore(s.compliance || {});
    const life = s.accountLifecycle || {};
    const pending = life.status === "pending_deletion";

    h.innerHTML = `<div class="pp-page pro-page ent-page st-page">
      <div class="st-page-chrome">
        <div class="pp-head st-head">
          <div>
            <small class="pp-kicker">ACCOUNT &amp; COMPLIANCE</small>
            <h1>Settings</h1>
            <p>Configure operator profile, security, sending, and global privacy/email law controls. Delete account and data-subject rights are available under Your rights and Danger zone.</p>
          </div>
          <div class="pp-head-actions">
            <span class="st-score-pill" title="Operational compliance checklist">${score.pct}% ready · ${esc(score.label)}</span>
            ${pending ? `<span class="st-score-pill st-score-danger">Deletion scheduled</span>` : ""}
            <button type="button" class="pp-btn" data-act-top="export-compliance">Export compliance</button>
            <button type="button" class="pp-btn" data-act-top="export-all">Export all data</button>
            <button type="button" class="pp-btn danger" data-act-top="delete-account">Delete account</button>
          </div>
        </div>
      </div>
      <div class="ent-settings st-layout">
        <aside class="pp-card ent-settings-nav st-nav" data-st-nav>
          ${TABS.map(
            ([t, sub]) =>
              `<button type="button" class="${t === activeTab ? "active" : ""}" data-st-tab="${esc(t)}">
                <span>${esc(t)}</span><small>${esc(sub)}</small>
              </button>`
          ).join("")}
        </aside>
        <main class="pp-card ent-settings-main st-main" data-st-panel>
          <div class="st-main-scroll">
            ${panelHtml(activeTab)}
          </div>
        </main>
      </div>
    </div>`;

    const panel = h.querySelector("[data-st-panel]");
    const scroll = h.querySelector(".st-main-scroll");
    h.querySelectorAll("[data-st-tab]").forEach((b) => {
      b.onclick = () => {
        activeTab = b.dataset.stTab;
        render();
        // keep settings nav position; scroll only the content pane to top
        requestAnimationFrame(() => {
          const sc = host()?.querySelector(".st-main-scroll");
          if (sc) sc.scrollTop = 0;
        });
      };
    });
    h.querySelectorAll("[data-act-top]").forEach((b) => {
      b.onclick = () => act(b.dataset.actTop);
    });
    bindPanel(panel || scroll);
  }

  // Public API — overrides thinner settings pages
  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.settings = render;

  // Ensure Settings nav always hits this page
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("button,a");
      if (!btn || !document.querySelector(".dashboard-shell")) return;
      const text = (btn.querySelector("span")?.textContent || btn.textContent || "").replace(/\s+/g, " ").trim();
      if (text === "Settings" || text === "Workspace settings") {
        setTimeout(() => {
          activeTab = "Profile";
          render();
        }, 40);
      }
    },
    true
  );
})();
