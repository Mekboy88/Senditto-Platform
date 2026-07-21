/**
 * Overview dashboard v2 — premium workspace home.
 * Loads after overview-realtime.js and takes over the "overview" route.
 *
 * Two deliberate states:
 *  - Empty workspace  → welcome hero + setup checklist + API quick-start.
 *    No zero-value KPI noise, no empty tables.
 *  - Active workspace → KPI cards with true per-day sparklines, activity
 *    chart, actionable insights (pending domains / elevated bounces),
 *    stream mix, recent messages, usage meter and workspace quick-stats.
 * All charts are dependency-free inline SVG. No demo content unless the
 * user loads the clearly-labelled sample dataset.
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  let range = 14; // days shown in the activity chart

  const icon = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
      {
        send: '<path d="m4 4 16 8-16 8 4-8Z"/><path d="M8 12h6"/>',
        key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-3 3 3 3m-6 0 3 3"/>',
        globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
        check: '<path d="m20 6-11 11-5-5"/>',
        copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
        spark: '<path d="m12 3 1.4 4.1L18 9l-4.6 1.9L12 15l-1.4-4.1L6 9l4.6-1.9ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
        arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
        book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Z"/><path d="M4 21V5"/><path d="M9 7h6"/>',
        hook: '<path d="M18 16.5a4 4 0 1 1-3.5-6.5V6a3 3 0 1 0-3-3"/><path d="m14 7 2 3 3-2"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9.5 11.5 11 13l3.5-3.5"/>',
        trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
        alert: '<path d="M12 9v4m0 4h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
        wave: '<path d="M3 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 3 2"/>',
      }[n] || ""
    }</svg>`;

  /* ---------- data helpers ---------- */

  function lastDays(n) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  function bucket(messages, days) {
    const map = Object.fromEntries(
      days.map((d) => [d, { total: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 }])
    );
    for (const m of messages) {
      const k = (m.createdAt || "").slice(0, 10);
      const b = map[k];
      if (!b) continue;
      const st = String(m.status || "");
      b.total += 1;
      if (/delivered|opened|clicked/i.test(st)) b.delivered += 1;
      if (/opened|clicked/i.test(st)) b.opened += 1;
      if (/clicked/i.test(st)) b.clicked += 1;
      if (/bounce/i.test(st)) b.bounced += 1;
      if (/bounce|failed/i.test(st)) b.failed += 1;
    }
    return days.map((d) => ({ day: d, ...map[d] }));
  }

  function sparkline(values, tone = "blue", w = 120, h = 34) {
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? w / (values.length - 1) : w;
    const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - (v / max) * (h - 8)).toFixed(1)}`);
    const area = `M0,${h} L${pts.join(" L")} L${w},${h} Z`;
    return `<svg class="sd-spark sd-tone-${tone}" style="width:100%;height:${h}px;display:block;background:transparent" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <path class="sd-spark-area" d="${area}"/>
      <polyline class="sd-spark-line" points="${pts.join(" ")}"/>
    </svg>`;
  }

  function areaChart(series, days) {
    const w = 760;
    const h = 240;
    const padL = 34;
    const padB = 26;
    const padT = 14;
    const innerW = w - padL - 10;
    const innerH = h - padT - padB;
    const max = Math.max(4, ...series.map((s) => Math.max(...s.values)));
    const step = days.length > 1 ? innerW / (days.length - 1) : innerW;
    const y = (v) => padT + innerH - (v / max) * innerH;
    const x = (i) => padL + i * step;

    const gridLines = [0, 0.25, 0.5, 0.75, 1]
      .map((f) => {
        const yy = padT + innerH - f * innerH;
        return `<line x1="${padL}" x2="${w - 8}" y1="${yy}" y2="${yy}" class="sd-grid"/>
          <text x="${padL - 6}" y="${yy + 3}" class="sd-axis" text-anchor="end">${Math.round(f * max)}</text>`;
      })
      .join("");

    const labelEvery = Math.max(1, Math.round(days.length / 7));
    const xLabels = days
      .map((d, i) =>
        i % labelEvery === 0
          ? `<text x="${x(i)}" y="${h - 8}" class="sd-axis" text-anchor="middle">${d.slice(5).replace("-", "/")}</text>`
          : ""
      )
      .join("");

    const paths = series
      .map((s) => {
        const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
        const area = `M${x(0)},${padT + innerH} L${pts.join(" L")} L${x(s.values.length - 1)},${padT + innerH} Z`;
        return `<path d="${area}" fill="${s.color}" opacity="0.10"/>
          <polyline points="${pts.join(" ")}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      })
      .join("");

    const dots = series
      .map((s) => {
        const i = s.values.length - 1;
        return `<circle cx="${x(i)}" cy="${y(s.values[i])}" r="3.4" fill="${s.color}"/>`;
      })
      .join("");

    return `<svg class="sd-chart" style="width:100%;height:auto;aspect-ratio:${w}/${h};display:block" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Email activity chart">
      ${gridLines}${paths}${dots}${xLabels}
    </svg>`;
  }

  function statusChip(status) {
    const s = String(status || "").toLowerCase();
    const tone = /delivered|opened|clicked|verified|active|live|sent|completed/.test(s)
      ? "ok"
      : /queued|pending|scheduled|processing|draft/.test(s)
        ? "wait"
        : /bounce|fail|error|revoked|complaint/.test(s)
          ? "bad"
          : "mut";
    return `<span class="sd-chip ${tone}">${esc(status || "—")}</span>`;
  }

  function fmtCompact(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
    if (n >= 10_000) return `${Math.round(n / 1000)}k`;
    return Number(n).toLocaleString();
  }

  function codeSamples(apiKeyMasked) {
    const key = apiKeyMasked || "sk_live_xxxxxxxxxxxx";
    return {
      curl: `curl -X POST https://api.senditto.com/v1/emails \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "you@yourdomain.com",
    "to": ["user@example.com"],
    "subject": "Hello from Senditto",
    "html": "<p>It works!</p>"
  }'`,
      node: `import { Senditto } from "senditto";

const senditto = new Senditto("${key}");

await senditto.emails.send({
  from: "you@yourdomain.com",
  to: ["user@example.com"],
  subject: "Hello from Senditto",
  html: "<p>It works!</p>",
});`,
      python: `from senditto import Senditto

client = Senditto("${key}")

client.emails.send(
    from_="you@yourdomain.com",
    to=["user@example.com"],
    subject="Hello from Senditto",
    html="<p>It works!</p>",
)`,
    };
  }

  let codeTab = "curl";

  /* ---------- render ---------- */

  function render(root) {
    const s = S();
    if (!s) throw new Error("Platform store is still loading. Click Try again.");
    root.dataset.platformPage = "dashboard";

    const m = s.metrics();
    const ws = s.currentWorkspace?.() || s.list("workspaces")[0] || { name: "Workspace" };
    const messages = s.list("messages");
    const days = lastDays(range);
    const buckets = bucket(messages, days);
    const totals = buckets.map((b) => b.total);
    const delivered = buckets.map((b) => b.delivered);
    const opened = buckets.map((b) => b.opened);
    const clicked = buckets.map((b) => b.clicked);
    const bounced = buckets.map((b) => b.bounced);
    const failed = buckets.map((b) => b.failed);

    const half = Math.floor(buckets.length / 2);
    const curHalf = totals.slice(half).reduce((a, b) => a + b, 0);
    const prevHalf = totals.slice(0, half).reduce((a, b) => a + b, 0);
    const deltaTxt = prevHalf
      ? `${curHalf >= prevHalf ? "+" : ""}${(((curHalf - prevHalf) / prevHalf) * 100).toFixed(0)}% vs previous ${half}d`
      : curHalf
        ? "first sends this period"
        : "—";
    const deltaUp = prevHalf ? curHalf >= prevHalf : null;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    const hasKey = m.activeKeys > 0;
    const hasDomain = m.verifiedDomains > 0;
    const hasSent = m.sent > 0;
    const hasTeam = (s.list("teamInvites") || []).length > 0 || ((ws.members || []).length > 1);
    const setup = [
      { done: hasKey, label: "Create an API key", route: "api", icon: "key" },
      { done: hasDomain, label: "Verify a sending domain", route: "domains", icon: "globe" },
      { done: hasSent, label: "Send your first email", route: "send", icon: "send" },
      { done: hasTeam, label: "Invite your team", route: "team", icon: "users" },
    ];
    const doneCount = setup.filter((x) => x.done).length;
    const isEmpty = !hasSent && !hasKey && m.contacts === 0;
    const seeded = window.SendittoDemo?.isSeeded?.() || false;

    const firstKey = s.list("keys").find((k) => /active/i.test(k.status || ""));
    const samples = codeSamples(firstKey?.masked);

    /* ----- building blocks ----- */

    const headHtml = `
      <div class="sd-head">
        <div>
          <small class="pp-kicker">${esc(today.toUpperCase())}</small>
          <h1>${esc(greeting)}${isEmpty ? " 👋" : ""}</h1>
          <p>${isEmpty
            ? `Let's get <b>${esc(ws.name || "your workspace")}</b> sending its first email.`
            : `Everything <b>${esc(ws.name || "your workspace")}</b> sent, delivered and earned — live.`}</p>
        </div>
        <div class="sd-head-actions">
          ${seeded
            ? `<button class="sd-btn ghost" data-act="clear-demo">${icon("trash")} Remove sample data</button>`
            : isEmpty
              ? ""
              : `<button class="sd-btn ghost" data-act="seed-demo">${icon("spark")} Load sample data</button>`}
          ${isEmpty ? "" : `<button class="sd-btn" data-nav="analytics">Open analytics</button>`}
          <button class="sd-btn primary" data-nav="send">${icon("send")} Send email</button>
        </div>
      </div>`;

    const heroHtml = `
      <div class="sd-hero">
        <div class="sd-hero-copy">
          <span class="sd-hero-badge">${icon("spark")} Welcome to Senditto</span>
          <h2>Email infrastructure for every message</h2>
          <p>Transactional email, OTP verification codes, marketing campaigns and inbound —
             one clean API. Wire up a key, verify your domain and your first email is minutes away.</p>
          <div class="sd-hero-actions">
            <button class="sd-btn primary" data-nav="send">${icon("send")} Send a test email</button>
            <button class="sd-btn" data-nav="api">${icon("key")} Create API key</button>
            <button class="sd-btn ghost" data-act="seed-demo">${icon("spark")} Explore with sample data</button>
          </div>
        </div>
        <div class="sd-hero-panel">
          <div class="sd-hero-row">${icon("send")}<div><b>Transactional</b><span>Receipts, resets, alerts — delivered in seconds.</span></div></div>
          <div class="sd-hero-row">${icon("shield")}<div><b>OTP & verification</b><span>One-time codes for sign-in and 2-step auth.</span></div></div>
          <div class="sd-hero-row">${icon("users")}<div><b>Campaigns</b><span>Newsletters and product updates with tracking.</span></div></div>
          <div class="sd-hero-row">${icon("hook")}<div><b>Webhooks</b><span>Delivery, opens, clicks and bounces to your app.</span></div></div>
        </div>
      </div>`;

    // Actionable insights — only for workspaces with data, max two, each with a fix.
    const insights = [];
    const pendingDomains = m.domains - m.verifiedDomains;
    const bounceRate = m.sent ? (m.bounced / m.sent) * 100 : 0;
    if (!isEmpty && bounceRate > 4 && m.sent >= 20) {
      insights.push({
        tone: "bad",
        icon: "alert",
        text: `Bounce rate is <b>${bounceRate.toFixed(1)}%</b> — above the 4% healthy line. Clean your lists and review blocked addresses.`,
        action: ["suppressions", "Review suppressions"],
      });
    }
    if (!isEmpty && pendingDomains > 0) {
      insights.push({
        tone: "warn",
        icon: "globe",
        text: `<b>${pendingDomains} sending domain${pendingDomains === 1 ? "" : "s"}</b> still waiting for DNS verification — mail from ${pendingDomains === 1 ? "it" : "them"} can't go out yet.`,
        action: ["domains", "Finish verification"],
      });
    }
    const insightsHtml = insights
      .slice(0, 2)
      .map(
        (i) => `
        <div class="sd-insight ${i.tone}">
          ${icon(i.icon)}
          <p>${i.text}</p>
          <button class="sd-btn sm" data-nav="${i.action[0]}">${esc(i.action[1])} ${icon("arrow")}</button>
        </div>`
      )
      .join("");

    const kpis = [
      { label: "Emails sent", value: fmtCompact(m.sent), spark: totals, tone: "blue", sub: deltaTxt, up: deltaUp },
      { label: "Delivery rate", value: m.deliveryRate, spark: delivered, tone: "green", sub: `${fmtCompact(m.delivered)} delivered` },
      { label: "Open rate", value: m.openRate, spark: opened, tone: "blue", sub: `${fmtCompact(m.opened)} opened` },
      { label: "Click rate", value: m.clickRate, spark: clicked, tone: "blue", sub: `${fmtCompact(m.clicked)} clicked` },
      { label: "Bounced", value: fmtCompact(m.bounced), spark: bounced, tone: "red", cls: m.bounced ? "bad" : "", sub: m.sent ? `${bounceRate.toFixed(1)}% of sent` : "—" },
    ];
    const kpisHtml = `
      <div class="sd-kpis">
        ${kpis
          .map(
            (k) => `
          <div class="sd-kpi ${k.cls || ""}">
            <div class="sd-kpi-top">
              <span>${esc(k.label)}</span>
              ${k.up === true ? '<b class="sd-delta up">▲</b>' : k.up === false ? '<b class="sd-delta down">▼</b>' : ""}
            </div>
            <div class="sd-kpi-value">${esc(String(k.value))}</div>
            ${sparkline(k.spark, k.tone)}
            <div class="sd-kpi-sub">${esc(k.sub)}</div>
          </div>`
          )
          .join("")}
      </div>`;

    // Stream mix for the chart footer
    const streamCounts = {};
    for (const msg of messages) {
      const st = msg.stream || "Other";
      streamCounts[st] = (streamCounts[st] || 0) + 1;
    }
    const streamMix = Object.entries(streamCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `<span class="sd-mix"><b>${esc(name)}</b> ${m.sent ? Math.round((n / m.sent) * 100) : 0}%</span>`)
      .join("");

    const chartCard = `
      <section class="sd-card">
        <div class="sd-card-head">
          <div><h3>Email activity</h3><p>Sent vs delivered vs failed, per day</p></div>
          <div class="sd-range">
            ${[7, 14, 30].map((r) => `<button class="sd-range-btn ${range === r ? "active" : ""}" data-range="${r}">${r}d</button>`).join("")}
          </div>
        </div>
        ${m.sent === 0
          ? `<div class="sd-empty">${icon("wave")}<h4>Your delivery graph lives here</h4><p>Send the first email and watch sent, delivered and failed counts arrive per day.</p></div>`
          : areaChart(
              [
                { name: "Sent", color: "#367ef5", values: totals },
                { name: "Delivered", color: "#16a34a", values: delivered },
                { name: "Failed", color: "#dc2626", values: failed },
              ],
              days
            )}
        <div class="sd-chart-foot">
          <div class="sd-legend">
            <span><i style="background:#367ef5"></i>Sent</span>
            <span><i style="background:#16a34a"></i>Delivered</span>
            <span><i style="background:#dc2626"></i>Failed</span>
          </div>
          ${m.sent ? `<div class="sd-mixes">${streamMix}</div>` : ""}
        </div>
      </section>`;

    const recent = messages.slice(0, 8);
    const recentCard = `
      <section class="sd-card">
        <div class="sd-card-head">
          <div><h3>Recent messages</h3><p>The last ${recent.length} requests through your workspace</p></div>
          <button class="sd-btn sm" data-nav="activity">View all ${icon("arrow")}</button>
        </div>
        <div class="sd-table-wrap">
          <table class="sd-table">
            <thead><tr><th>Message</th><th>To</th><th>Stream</th><th>Status</th><th>When</th></tr></thead>
            <tbody>
              ${recent
                .map(
                  (msg) => `
                <tr data-nav="activity" role="link" tabindex="0">
                  <td class="sd-strong">${esc(msg.subject || msg.name || "—")}</td>
                  <td class="sd-mut">${esc(Array.isArray(msg.to) ? msg.to[0] || "—" : msg.to || "—")}</td>
                  <td><span class="sd-stream">${esc(msg.stream || "—")}</span></td>
                  <td>${statusChip(msg.status)}</td>
                  <td class="sd-mut">${esc(s.formatRelative?.(msg.createdAt) || "")}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>`;

    const checklistCard = `
      <section class="sd-card">
        <div class="sd-card-head">
          <div><h3>Get set up</h3><p>${doneCount}/${setup.length} complete</p></div>
        </div>
        <div class="sd-progress"><i style="width:${(doneCount / setup.length) * 100}%"></i></div>
        <div class="sd-checklist">
          ${setup
            .map(
              (x) => `
            <button class="sd-check ${x.done ? "done" : ""}" data-nav="${x.route}">
              <span class="sd-check-mark">${x.done ? icon("check") : ""}</span>
              <span class="sd-check-ic">${icon(x.icon)}</span>
              <span>${esc(x.label)}</span>
              ${icon("arrow")}
            </button>`
            )
            .join("")}
        </div>
      </section>`;

    const codeCard = `
      <section class="sd-card sd-code-card">
        <div class="sd-card-head">
          <div><h3>Send with the API</h3><p>Drop-in from any stack</p></div>
        </div>
        <div class="sd-code-tabs">
          ${["curl", "node", "python"].map((t) => `<button class="sd-code-tab ${codeTab === t ? "active" : ""}" data-codetab="${t}">${t === "curl" ? "cURL" : t === "node" ? "Node.js" : "Python"}</button>`).join("")}
          <button class="sd-code-copy" data-act="copy-code" title="Copy">${icon("copy")}</button>
        </div>
        <pre class="sd-code" data-code></pre>
        <button class="sd-btn ghost full" data-nav="help">${icon("book")} Documentation & guides</button>
      </section>`;

    // Monthly usage vs plan quota
    const cap = s.snapshot?.()?.capacity || {};
    const quota = Number(cap.monthlyQuota) || 0;
    const monthKey = new Date().toISOString().slice(0, 7);
    const sentThisMonth = messages.filter((msg) => (msg.createdAt || "").slice(0, 7) === monthKey).length;
    const usagePct = quota ? Math.min(100, (sentThisMonth / quota) * 100) : 0;
    const usageHtml = quota
      ? `
        <div class="sd-usage">
          <div class="sd-usage-top"><span>Monthly usage</span><b>${fmtCompact(sentThisMonth)} / ${fmtCompact(quota)}</b></div>
          <div class="sd-progress slim"><i style="width:${Math.max(usagePct, sentThisMonth ? 1.5 : 0)}%"></i></div>
        </div>`
      : "";

    const workspaceCard = `
      <section class="sd-card">
        <div class="sd-card-head"><div><h3>Workspace</h3><p>Quick status</p></div></div>
        ${usageHtml}
        <div class="sd-facts">
          <button class="sd-fact" data-nav="domains"><span>Domains</span><b>${m.verifiedDomains}/${m.domains} verified</b></button>
          <button class="sd-fact" data-nav="api"><span>API keys</span><b>${m.activeKeys} active</b></button>
          <button class="sd-fact" data-nav="contacts"><span>Contacts</span><b>${fmtCompact(m.contacts)}</b></button>
          <button class="sd-fact" data-nav="suppressions"><span>Suppressions</span><b>${fmtCompact(s.list("suppressions").length)}</b></button>
          <button class="sd-fact" data-nav="templates"><span>Templates</span><b>${m.templates}</b></button>
          <button class="sd-fact" data-nav="webhooks"><span>Webhooks</span><b>${m.webhooks}</b></button>
        </div>
        <div class="sd-status-line"><i></i> Sending infrastructure operational</div>
      </section>`;

    /* ----- assemble ----- */

    root.innerHTML = isEmpty
      ? `
      <div class="sd-page">
        ${headHtml}
        ${heroHtml}
        <div class="sd-grid">
          <div class="sd-col-main">${chartCard}</div>
          <div class="sd-col-side">${checklistCard}${codeCard}</div>
        </div>
      </div>`
      : `
      <div class="sd-page">
        ${headHtml}
        ${insightsHtml}
        ${kpisHtml}
        <div class="sd-grid">
          <div class="sd-col-main">${chartCard}${recentCard}</div>
          <div class="sd-col-side">${checklistCard}${codeCard}${workspaceCard}</div>
        </div>
      </div>`;

    /* ----- wiring ----- */

    const codeEl = root.querySelector("[data-code]");
    const setCode = () => {
      if (codeEl) codeEl.textContent = samples[codeTab];
    };
    setCode();

    root.querySelectorAll("[data-nav]").forEach((el) =>
      el.addEventListener("click", () => window.SendittoNavigate?.(el.dataset.nav))
    );
    root.querySelectorAll("[data-range]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        range = Number(el.dataset.range) || 14;
        render(root);
      })
    );
    root.querySelectorAll("[data-codetab]").forEach((el) =>
      el.addEventListener("click", () => {
        codeTab = el.dataset.codetab;
        root.querySelectorAll("[data-codetab]").forEach((b) => b.classList.toggle("active", b === el));
        setCode();
      })
    );
    root.querySelector('[data-act="copy-code"]')?.addEventListener("click", (e) => {
      navigator.clipboard?.writeText(samples[codeTab] || "");
      const btn = e.currentTarget;
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 900);
    });
    root.querySelector('[data-act="seed-demo"]')?.addEventListener("click", () => window.SendittoDemo?.seed());
    root.querySelector('[data-act="clear-demo"]')?.addEventListener("click", () => window.SendittoDemo?.clear());
  }

  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.overview = render;
})();
