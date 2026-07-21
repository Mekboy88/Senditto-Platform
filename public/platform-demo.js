/**
 * Optional sample workspace data.
 * The store stays empty-by-default. This layer lets the user load a clearly
 * labelled, deterministic sample dataset with one click (and remove it just as
 * easily) so every page can be previewed with realistic content before the
 * real database ships. Every seeded row carries demo:true.
 */
(() => {
  const S = () => window.SendittoStore;

  // Deterministic PRNG so the sample workspace always looks the same.
  function mulberry32(a) {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const FIRST = ["Ava", "Liam", "Mia", "Noah", "Zoe", "Eli", "Ivy", "Max", "Lea", "Kai", "Nora", "Ben", "Ana", "Leo", "Emma", "Jon", "Sara", "Tom", "Nina", "Alex"];
  const LAST = ["Berg", "Chen", "Diaz", "Evans", "Fox", "Gray", "Hoxha", "Ito", "Jones", "Krasniqi", "Lund", "Mori", "Novak", "Ortiz", "Patel", "Quinn", "Rossi", "Silva", "Tanaka", "Weber"];
  const COMPANIES = ["acme.dev", "northwind.io", "lumina.app", "vertex.co", "bluefin.dev"];

  function isoAgo(rand, maxDays) {
    const ms = Math.floor(rand() * maxDays * 24 * 60 * 60 * 1000);
    return new Date(Date.now() - ms).toISOString();
  }

  function pick(rand, arr) {
    return arr[Math.floor(rand() * arr.length)];
  }

  function weighted(rand, pairs) {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [v, w] of pairs) {
      r -= w;
      if (r <= 0) return v;
    }
    return pairs[0][0];
  }

  function isSeeded() {
    const s = S();
    if (!s) return false;
    return s.list("messages").some((m) => m.demo) || s.list("contacts").some((c) => c.demo);
  }

  function seed() {
    const s = S();
    if (!s) return false;
    if (isSeeded()) return true;
    const rand = mulberry32(20260721);
    const uid = s.uid;
    const row = (extra) => ({
      id: uid(),
      demo: true,
      createdAt: isoAgo(rand, 14),
      updatedAt: new Date().toISOString(),
      ...extra,
    });
    const keep = (name) => s.list(name).slice();

    // Contacts
    const contacts = keep("contacts");
    for (let i = 0; i < 36; i++) {
      const fn = pick(rand, FIRST);
      const ln = pick(rand, LAST);
      contacts.push(
        row({
          name: `${fn} ${ln}`,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${pick(rand, COMPANIES)}`,
          status: weighted(rand, [["Subscribed", 74], ["Pending", 12], ["Unsubscribed", 14]]),
          tags: weighted(rand, [[["customer"], 40], [["trial"], 25], [["newsletter"], 20], [["vip", "customer"], 15]]),
          location: pick(rand, ["Berlin", "Tirana", "London", "Oslo", "Tokyo", "Austin", "Madrid"]),
          lastActivity: isoAgo(rand, 10),
        })
      );
    }
    s.replaceAll("contacts", contacts);

    // Segments
    s.replaceAll("segments", [
      ...keep("segments"),
      row({ name: "Active customers", status: "Live", rules: [{ field: "tags", op: "contains", value: "customer" }], description: "Everyone tagged as a paying customer." }),
      row({ name: "Newsletter audience", status: "Live", rules: [{ field: "status", op: "is", value: "Subscribed" }], description: "All subscribed contacts." }),
      row({ name: "Win-back", status: "Draft", rules: [{ field: "lastActivity", op: "older_than_days", value: "30" }], description: "Contacts inactive for 30+ days." }),
    ]);

    // Domains
    s.replaceAll("domains", [
      ...keep("domains"),
      row({ name: "acme.dev", domain: "acme.dev", status: "Verified", region: "eu-west", spf: true, dkim: true, dmarc: true, defaultDomain: true }),
      row({ name: "updates.acme.dev", domain: "updates.acme.dev", status: "Pending", region: "eu-west", spf: true, dkim: false, dmarc: false }),
    ]);

    // API keys
    s.replaceAll("keys", [
      ...keep("keys"),
      row({ name: "Production backend", environment: "Live", prefix: "sk_live_", masked: "sk_live_••••••••4f2a", status: "Active", scopes: ["email:send", "email:read"], lastUsed: isoAgo(rand, 1) }),
      row({ name: "Staging", environment: "Test", prefix: "sk_test_", masked: "sk_test_••••••••91cd", status: "Active", scopes: ["email:send"], lastUsed: isoAgo(rand, 3) }),
      row({ name: "Old CLI key", environment: "Live", prefix: "sk_live_", masked: "sk_live_••••••••07be", status: "Revoked", scopes: ["email:send", "domains:read"], lastUsed: isoAgo(rand, 12) }),
    ]);

    // Webhooks
    s.replaceAll("webhooks", [
      ...keep("webhooks"),
      row({ name: "Delivery events", url: "https://api.acme.dev/hooks/senditto", events: ["email.delivered", "email.bounced", "email.complained"], status: "Active", success: 998, failed: 2 }),
      row({ name: "Marketing events", url: "https://crm.acme.dev/senditto", events: ["email.opened", "email.clicked", "contact.unsubscribed"], status: "Active", success: 412, failed: 0 }),
    ]);

    // Templates
    s.replaceAll("templates", [
      ...keep("templates"),
      row({ name: "Welcome email", category: "Onboarding", subject: "Welcome to Acme 👋", status: "Published", usage: 182 }),
      row({ name: "OTP code", category: "Security", subject: "Your Acme verification code", status: "Published", usage: 951 }),
      row({ name: "Password reset", category: "Security", subject: "Reset your password", status: "Published", usage: 77 }),
      row({ name: "July product news", category: "Newsletter", subject: "What's new in July", status: "Draft", usage: 0 }),
    ]);

    // Campaigns
    s.replaceAll("campaigns", [
      ...keep("campaigns"),
      row({ name: "Summer launch", status: "Sent", audience: "Newsletter audience", sent: 1204, opened: 611, clicked: 148, subject: "The summer release is here" }),
      row({ name: "Win-back July", status: "Scheduled", audience: "Win-back", sent: 0, opened: 0, clicked: 0, subject: "We miss you — here's 20% off" }),
    ]);

    // Automations
    s.replaceAll("automations", [
      ...keep("automations"),
      row({ name: "Welcome series", status: "Live", trigger: "contact.created", steps: 3, entered: 214, completed: 178, description: "3-step onboarding drip over the first week." }),
      row({ name: "OTP fallback resend", status: "Live", trigger: "otp.not_verified_5m", steps: 1, entered: 66, completed: 61, description: "Resend a verification code once after 5 minutes." }),
      row({ name: "Re-engagement", status: "Paused", trigger: "segment.win-back.entered", steps: 2, entered: 41, completed: 12, description: "Two win-back touches, then stop." }),
    ]);

    // Senders / SMTP / inbound / pools / integrations / batches
    s.replaceAll("senders", [
      ...keep("senders"),
      row({ name: "Acme Notifications", email: "no-reply@acme.dev", domain: "acme.dev", status: "Verified", default: true }),
      row({ name: "Acme Support", email: "support@acme.dev", domain: "acme.dev", status: "Verified" }),
      row({ name: "Acme Marketing", email: "news@updates.acme.dev", domain: "updates.acme.dev", status: "Pending" }),
    ]);
    s.replaceAll("inbound", [
      ...keep("inbound"),
      row({ name: "Support inbox", address: "support@inbound.acme.dev", forwardTo: "https://api.acme.dev/inbound", status: "Active", received: 63 }),
    ]);
    s.replaceAll("integrations", [
      ...keep("integrations"),
      row({ name: "Slack", kind: "notifications", status: "Connected", detail: "#deliverability alerts" }),
      row({ name: "Zapier", kind: "automation", status: "Connected", detail: "3 zaps active" }),
      row({ name: "Segment", kind: "data", status: "Available", detail: "Sync contacts & events" }),
    ]);
    s.replaceAll("batches", [
      ...keep("batches"),
      row({ name: "July invoices", status: "Completed", total: 820, delivered: 806, failed: 14, stream: "Transactional" }),
      row({ name: "Feature announcement", status: "Processing", total: 1200, delivered: 435, failed: 3, stream: "Marketing" }),
    ]);

    // Suppressions
    s.replaceAll("suppressions", [
      ...keep("suppressions"),
      row({ email: "bounce.test@northwind.io", reason: "Hard bounce", source: "bounce_processor" }),
      row({ email: "ex.customer@lumina.app", reason: "Unsubscribe", source: "one_click_unsubscribe" }),
      row({ email: "complaint@vertex.co", reason: "Spam complaint", source: "complaint_fbl" }),
      row({ email: "old.lead@bluefin.dev", reason: "Unsubscribe", source: "user_unsubscribe" }),
    ]);

    // Messages — 170 across the last 14 days
    const subjects = [
      ["Your Acme verification code", "Transactional"],
      ["Welcome to Acme 👋", "Transactional"],
      ["Password reset requested", "Transactional"],
      ["Invoice #INV-{n} is ready", "Transactional"],
      ["The summer release is here", "Marketing"],
      ["What's new in July", "Marketing"],
      ["We miss you — here's 20% off", "Marketing"],
      ["Day 3: getting the most from Acme", "Automations"],
    ];
    const messages = keep("messages");
    for (let i = 0; i < 170; i++) {
      const [subjRaw, stream] = weighted(rand, [
        [subjects[0], 22], [subjects[1], 12], [subjects[2], 8], [subjects[3], 10],
        [subjects[4], 16], [subjects[5], 10], [subjects[6], 8], [subjects[7], 14],
      ]);
      const to = contacts.length ? pick(rand, contacts).email : "user@example.com";
      messages.push(
        row({
          name: subjRaw.replace("{n}", String(1000 + i)),
          subject: subjRaw.replace("{n}", String(1000 + i)),
          to: [to],
          from: stream === "Marketing" ? "news@updates.acme.dev" : "no-reply@acme.dev",
          stream,
          status: weighted(rand, [["Delivered", 52], ["Opened", 24], ["Clicked", 9], ["Bounced", 4], ["Queued", 4], ["Failed", 7]]),
          latency: `${(0.4 + rand() * 1.8).toFixed(2)}s`,
        })
      );
    }
    messages.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    s.replaceAll("messages", messages);

    // A few developer log lines
    const logs = keep("logs");
    for (let i = 0; i < 26; i++) {
      const ok = rand() > 0.12;
      logs.push(
        row({
          level: ok ? "info" : "error",
          event: pick(rand, ["POST /v1/emails", "POST /v1/emails/batch", "GET /v1/messages", "POST /v1/otp/send", "POST /v1/otp/verify"]),
          message: ok ? "202 Accepted" : pick(rand, ["429 Rate limited", "422 Invalid recipient", "401 Invalid API key"]),
          detail: { requestId: `req_${uid().slice(0, 10)}`, ms: Math.round(40 + rand() * 300) },
        })
      );
    }
    logs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    s.replaceAll("logs", logs);

    s.logEvent?.("info", "sample.loaded", "Sample workspace data loaded (demo rows are removable)", {});
    return true;
  }

  function clear() {
    const s = S();
    if (!s) return;
    const names = [
      "contacts", "segments", "inbound", "domains", "keys", "webhooks", "automations",
      "templates", "campaigns", "messages", "logs", "suppressions", "senders",
      "smtpCredentials", "batches", "ipPools", "integrations", "teamInvites",
    ];
    for (const name of names) {
      const rows = s.list(name);
      if (rows.some((r) => r.demo)) s.replaceAll(name, rows.filter((r) => !r.demo));
    }
    s.logEvent?.("info", "sample.cleared", "Sample workspace data removed", {});
  }

  window.SendittoDemo = { seed, clear, isSeeded };
})();
