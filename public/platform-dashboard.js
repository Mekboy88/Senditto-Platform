/**
 * Overview dashboard v3 — command-center workspace home.
 *
 * Design language: deep gradient hero band with glass insight strips and the
 * KPI card row overlapping its lower edge; smooth bezier charts with gradient
 * fills and a live crosshair tooltip; terminal-style API quick-start; refined
 * checklist, usage gauge and workspace status. Two deliberate states (empty
 * onboarding vs active) share the same visual system. Inline SVG only.
 */
(() => {
  const S = () => window.SendittoStore;
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  let range = 14; // chart window (days)
  let chartMode = "volume"; // volume | engagement
  let codeTab = "curl";

  const icon = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
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
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        gauge: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M12 3a9 9 0 1 0 9 9"/><path d="M21 3v5h-5"/>',
      }[n] || ""
    }</svg>`;

  /* ================= data helpers ================= */

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
      const b = map[(m.createdAt || "").slice(0, 10)];
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

  function fmtCompact(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
    if (n >= 10_000) return `${Math.round(n / 1000)}k`;
    return Number(n).toLocaleString();
  }

  /* ================= svg helpers ================= */

  // Catmull-Rom → cubic bezier, y clamped into [minY, maxY]
  function smoothPath(pts, minY, maxY) {
    if (!pts.length) return "";
    if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
    const cl = (y) => Math.max(minY, Math.min(maxY, y));
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = cl(p1[1] + (p2[1] - p0[1]) / 6);
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = cl(p2[1] - (p3[1] - p1[1]) / 6);
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }

  let gradSeq = 0;

  function sparkline(values, color, w = 130, h = 40) {
    const id = `sdg${++gradSeq}`;
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? w / (values.length - 1) : w;
    const pts = values.map((v, i) => [i * step, h - 4 - (v / max) * (h - 10)]);
    const line = smoothPath(pts, 2, h - 2);
    const area = `${line} L${w},${h} L0,${h} Z`;
    return `<svg class="sd-spark" style="width:100%;height:${h}px;display:block;background:transparent" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#${id})" stroke="none"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  function bigChart(series, days) {
    const w = 780;
    const h = 260;
    const padL = 40;
    const padR = 14;
    const padT = 16;
    const padB = 30;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const rawMax = Math.max(...series.map((s) => Math.max(...s.values)), 4);
    const max = Math.ceil(rawMax / 5) * 5;
    const step = days.length > 1 ? innerW / (days.length - 1) : innerW;
    const x = (i) => padL + i * step;
    const y = (v) => padT + innerH - (v / max) * innerH;

    const grid = [0.25, 0.5, 0.75, 1]
      .map((f) => {
        const yy = padT + innerH - f * innerH;
        return `<line x1="${padL}" x2="${w - padR}" y1="${yy}" y2="${yy}" class="sd-gridline"/>
          <text x="${padL - 8}" y="${yy + 3.5}" class="sd-axis" text-anchor="end">${Math.round(f * max)}</text>`;
      })
      .join("");
    const base = `<line x1="${padL}" x2="${w - padR}" y1="${padT + innerH}" y2="${padT + innerH}" class="sd-baseline"/>`;

    const labelEvery = Math.max(1, Math.round(days.length / 7));
    const xLabels = days
      .map((d, i) =>
        i % labelEvery === 0
          ? `<text x="${x(i)}" y="${h - 9}" class="sd-axis" text-anchor="middle">${Number(d.slice(8, 10))} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(d.slice(5, 7)) - 1]}</text>`
          : ""
      )
      .join("");

    const defs = [];
    const paths = series
      .map((s) => {
        const id = `sdg${++gradSeq}`;
        defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${s.color}" stop-opacity="0.20"/>
          <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>
        </linearGradient>`);
        const pts = s.values.map((v, i) => [x(i), y(v)]);
        const line = smoothPath(pts, padT, padT + innerH);
        const area = `${line} L${x(s.values.length - 1)},${padT + innerH} L${x(0)},${padT + innerH} Z`;
        const last = pts[pts.length - 1];
        return `${s.fill === false ? "" : `<path d="${area}" fill="url(#${id})" stroke="none"/>`}
          <path d="${line}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${s.color}" class="sd-lastdot"/>
          <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${s.color}" opacity="0.25" class="sd-pulse"/>`;
      })
      .join("");

    return `<svg class="sd-chart" style="width:100%;height:auto;aspect-ratio:${w}/${h};display:block" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Email activity chart">
      <defs>${defs.join("")}</defs>
      ${grid}${base}${paths}${xLabels}
    </svg>`;
  }

  function usageGauge(pct, size = 74) {
    const r = (size - 10) / 2;
    const c = 2 * Math.PI * r;
    const shown = Math.max(pct, 0.5);
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="sd-gauge" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#edf1f8" stroke-width="8"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#sdGaugeGrad)" stroke-width="8"
        stroke-linecap="round" stroke-dasharray="${((shown / 100) * c).toFixed(1)} ${c.toFixed(1)}"
        transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <defs><linearGradient id="sdGaugeGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4a8bf7"/><stop offset="100%" stop-color="#16a34a"/>
      </linearGradient></defs>
      <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" class="sd-gauge-txt">${pct > 0 && pct < 1 ? "<1" : Math.round(pct)}%</text>
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
    return `<span class="sd-chip ${tone}"><i></i>${esc(status || "—")}</span>`;
  }

  function initials(email) {
    const src = String(email || "?");
    const parts = src.split(/[@._-]/).filter(Boolean);
    return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
  }

  /* ================= code samples ================= */

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

  function highlight(code) {
    let s = esc(code);
    s = s.replaceAll(/(&quot;.*?&quot;|&#39;)/g, (m) => m); // noop guard
    s = s.replace(/(&quot;[^&]*?&quot;)/g, '<i class="tk-str">$1</i>');
    s = s.replace(/^(curl|import|from|const|await|client)(?=[ .])/gm, '<i class="tk-kw">$1</i>');
    s = s.replace(/(-X POST|-H|-d)(?= )/g, '<i class="tk-flag">$1</i>');
    return s;
  }

  /* ================= render ================= */

  function render(root) {
    const s = S();
    if (!s) throw new Error("Platform store is still loading. Click Try again.");
    root.dataset.platformPage = "dashboard";
    gradSeq = 0;

    const m = s.metrics();
    const ws = s.currentWorkspace?.() || s.list("workspaces")[0] || { name: "Workspace" };
    const messages = s.list("messages");
    const days = lastDays(range);
    const buckets = bucket(messages, days);
    const arr = (k) => buckets.map((b) => b[k]);

    const half = Math.floor(buckets.length / 2);
    const totals = arr("total");
    const curHalf = totals.slice(half).reduce((a, b) => a + b, 0);
    const prevHalf = totals.slice(0, half).reduce((a, b) => a + b, 0);
    const deltaPct = prevHalf ? Math.round(((curHalf - prevHalf) / prevHalf) * 100) : null;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    const hasKey = m.activeKeys > 0;
    const hasDomain = m.verifiedDomains > 0;
    const hasSent = m.sent > 0;
    const hasTeam = (s.list("teamInvites") || []).length > 0 || (ws.members || []).length > 1;
    const setup = [
      { done: hasKey, label: "Create an API key", desc: "Scoped credentials for your app", route: "api", icon: "key" },
      { done: hasDomain, label: "Verify a sending domain", desc: "SPF, DKIM and DMARC records", route: "domains", icon: "globe" },
      { done: hasSent, label: "Send your first email", desc: "A real message through the API", route: "send", icon: "send" },
      { done: hasTeam, label: "Invite your team", desc: "Roles for devs and marketers", route: "team", icon: "users" },
    ];
    const doneCount = setup.filter((x) => x.done).length;
    const isEmpty = !hasSent && !hasKey && m.contacts === 0;
    const seeded = window.SendittoDemo?.isSeeded?.() || false;

    const firstKey = s.list("keys").find((k) => /active/i.test(k.status || ""));
    const samples = codeSamples(firstKey?.masked);

    const bounceRate = m.sent ? (m.bounced / m.sent) * 100 : 0;
    const pendingDomains = m.domains - m.verifiedDomains;

    /* ---------- hero band ---------- */

    const insights = [];
    if (!isEmpty && bounceRate > 4 && m.sent >= 20)
      insights.push({ tone: "bad", icon: "alert", html: `Bounce rate <b>${bounceRate.toFixed(1)}%</b> is above the 4% healthy line — clean lists and review blocks.`, route: "suppressions", cta: "Review" });
    if (!isEmpty && pendingDomains > 0)
      insights.push({ tone: "warn", icon: "globe", html: `<b>${pendingDomains} domain${pendingDomains === 1 ? "" : "s"}</b> waiting for DNS verification — that mail can't go out yet.`, route: "domains", cta: "Verify" });

    const heroActions = `
      <div class="sd-hero-actions-row">
        ${seeded
          ? `<button class="sd-hbtn ghost" data-act="clear-demo">${icon("trash")} Remove sample data</button>`
          : isEmpty
            ? ""
            : `<button class="sd-hbtn ghost" data-act="seed-demo">${icon("spark")} Sample data</button>`}
        ${isEmpty ? "" : `<button class="sd-hbtn ghost" data-nav="analytics">${icon("gauge")} Analytics</button>`}
        <button class="sd-hbtn solid" data-nav="send">${icon("send")} Send email</button>
      </div>`;

    const hero = `
      <section class="sd-hero3 ${isEmpty ? "tall" : ""}">
        <div class="sd-hero3-glow" aria-hidden="true"></div>
        <div class="sd-hero3-top">
          <div class="sd-hero3-meta">
            <span class="sd-date-chip">${esc(today)}</span>
            <span class="sd-live"><i></i>Live</span>
          </div>
          ${heroActions}
        </div>
        <h1 class="sd-hero3-title">${esc(greeting)}<span class="sd-wave">${isEmpty ? " 👋" : ""}</span></h1>
        <p class="sd-hero3-sub">${isEmpty
          ? `Let's get <b>${esc(ws.name || "your workspace")}</b> sending its first email — it takes minutes.`
          : `<b>${esc(ws.name || "Workspace")}</b> · everything sent, delivered and earned, live.`}</p>
        ${isEmpty
          ? `
          <div class="sd-hero3-features">
            <div class="sd-feature">${icon("send")}<div><b>Transactional</b><span>Receipts, resets, alerts — in seconds.</span></div></div>
            <div class="sd-feature">${icon("shield")}<div><b>OTP & 2-step auth</b><span>One-time codes with one call.</span></div></div>
            <div class="sd-feature">${icon("mail")}<div><b>Campaigns</b><span>Newsletters with open & click tracking.</span></div></div>
            <div class="sd-feature">${icon("hook")}<div><b>Webhooks</b><span>Every event, pushed to your app.</span></div></div>
          </div>
          <div class="sd-hero3-cta">
            <button class="sd-hbtn solid lg" data-nav="send">${icon("send")} Send a test email</button>
            <button class="sd-hbtn ghost lg" data-nav="api">${icon("key")} Create API key</button>
            <button class="sd-hbtn ghost lg" data-act="seed-demo">${icon("spark")} Explore with sample data</button>
          </div>`
          : insights.length
            ? `<div class="sd-hero3-insights">
                ${insights.slice(0, 2).map((i) => `
                  <div class="sd-hinsight ${i.tone}">
                    ${icon(i.icon)}<p>${i.html}</p>
                    <button class="sd-hbtn mini" data-nav="${i.route}">${esc(i.cta)} ${icon("arrow")}</button>
                  </div>`).join("")}
              </div>`
            : ""}
      </section>`;

    /* ---------- KPI row ---------- */

    const kpiDefs = [
      { label: "Emails sent", value: fmtCompact(m.sent), series: totals, color: "#367ef5", sub: "last " + range + " days", delta: deltaPct },
      { label: "Delivery rate", value: m.deliveryRate, series: arr("delivered"), color: "#16a34a", sub: `${fmtCompact(m.delivered)} delivered` },
      { label: "Open rate", value: m.openRate, series: arr("opened"), color: "#7c5cf5", sub: `${fmtCompact(m.opened)} opened` },
      { label: "Click rate", value: m.clickRate, series: arr("clicked"), color: "#0ea5e9", sub: `${fmtCompact(m.clicked)} clicked` },
      { label: "Bounced", value: fmtCompact(m.bounced), series: arr("bounced"), color: "#dc2626", sub: m.sent ? `${bounceRate.toFixed(1)}% of sent` : "—", warn: bounceRate > 4 },
    ];
    const kpis = `
      <div class="sd-kpis3">
        ${kpiDefs.map((k) => `
          <div class="sd-kpi3 ${k.warn ? "warn" : ""}">
            <div class="sd-kpi3-top">
              <span>${esc(k.label)}</span>
              ${k.delta != null ? `<b class="sd-delta-pill ${k.delta >= 0 ? "up" : "down"}">${k.delta >= 0 ? "▲" : "▼"} ${Math.abs(k.delta)}%</b>` : ""}
            </div>
            <div class="sd-kpi3-value" style="--kc:${k.color}">${esc(String(k.value))}</div>
            <div class="sd-kpi3-sub">${esc(k.sub)}</div>
            <div class="sd-kpi3-spark">${sparkline(k.series, k.color)}</div>
          </div>`).join("")}
      </div>`;

    /* ---------- chart card ---------- */

    const volumeSeries = [
      { name: "Sent", color: "#367ef5", values: totals },
      { name: "Delivered", color: "#16a34a", values: arr("delivered") },
      { name: "Failed", color: "#dc2626", values: arr("failed"), fill: false },
    ];
    const engagementSeries = [
      { name: "Opened", color: "#7c5cf5", values: arr("opened") },
      { name: "Clicked", color: "#0ea5e9", values: arr("clicked") },
    ];
    const activeSeries = chartMode === "volume" ? volumeSeries : engagementSeries;

    const streamCounts = {};
    for (const msg of messages) streamCounts[msg.stream || "Other"] = (streamCounts[msg.stream || "Other"] || 0) + 1;
    const streamMix = Object.entries(streamCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `<span class="sd-mix"><b>${esc(name)}</b>${m.sent ? Math.round((n / m.sent) * 100) : 0}%</span>`)
      .join("");

    const chartCard = `
      <section class="sd-card3">
        <div class="sd-card3-head">
          <div>
            <h3>Email activity</h3>
            <p>${chartMode === "volume" ? "Sent, delivered and failed per day" : "Opens and clicks per day"}</p>
          </div>
          <div class="sd-card3-tools">
            <div class="sd-seg">
              <button class="sd-seg-btn ${chartMode === "volume" ? "active" : ""}" data-mode="volume">Volume</button>
              <button class="sd-seg-btn ${chartMode === "engagement" ? "active" : ""}" data-mode="engagement">Engagement</button>
            </div>
            <div class="sd-seg">
              ${[7, 14, 30].map((r) => `<button class="sd-seg-btn ${range === r ? "active" : ""}" data-range="${r}">${r}d</button>`).join("")}
            </div>
          </div>
        </div>
        ${m.sent === 0
          ? `<div class="sd-empty3">${icon("send")}<h4>Your delivery graph lives here</h4><p>Send the first email and watch per-day volume arrive in real time.</p></div>`
          : `<div class="sd-chart-wrap" data-chart>
              ${bigChart(activeSeries, days)}
              <div class="sd-guide" hidden></div>
              <div class="sd-tip" hidden></div>
            </div>`}
        <div class="sd-chart-foot">
          <div class="sd-legend">
            ${activeSeries.map((sr) => `<span><i style="background:${sr.color}"></i>${sr.name}</span>`).join("")}
          </div>
          ${m.sent ? `<div class="sd-mixes">${streamMix}</div>` : ""}
        </div>
      </section>`;

    /* ---------- recent messages ---------- */

    const recent = messages.slice(0, 7);
    const recentCard = isEmpty ? "" : `
      <section class="sd-card3">
        <div class="sd-card3-head">
          <div><h3>Recent messages</h3><p>The last ${recent.length} requests through your workspace</p></div>
          <button class="sd-btn3 sm" data-nav="activity">View all ${icon("arrow")}</button>
        </div>
        <div class="sd-rows">
          ${recent.map((msg) => `
            <button class="sd-row" data-nav="activity">
              <span class="sd-row-av">${esc(initials(Array.isArray(msg.to) ? msg.to[0] : msg.to))}</span>
              <span class="sd-row-main">
                <b>${esc(msg.subject || msg.name || "—")}</b>
                <small>${esc(Array.isArray(msg.to) ? msg.to[0] || "—" : msg.to || "—")}</small>
              </span>
              <span class="sd-stream3">${esc(msg.stream || "—")}</span>
              ${statusChip(msg.status)}
              <time>${esc(s.formatRelative?.(msg.createdAt) || "")}</time>
              <span class="sd-row-arrow">${icon("arrow")}</span>
            </button>`).join("")}
        </div>
      </section>`;

    /* ---------- side column ---------- */

    const checklistCard = `
      <section class="sd-card3">
        <div class="sd-card3-head">
          <div><h3>Get set up</h3><p>${doneCount} of ${setup.length} complete</p></div>
          <span class="sd-ring">${usageGauge((doneCount / setup.length) * 100, 46)}</span>
        </div>
        <div class="sd-steps">
          ${setup.map((x) => `
            <button class="sd-step ${x.done ? "done" : ""}" data-nav="${x.route}">
              <span class="sd-step-mark">${x.done ? icon("check") : ""}</span>
              <span class="sd-step-body"><b>${esc(x.label)}</b><small>${esc(x.desc)}</small></span>
              ${icon("arrow")}
            </button>`).join("")}
        </div>
      </section>`;

    const codeCard = `
      <section class="sd-term">
        <div class="sd-term-bar">
          <span class="sd-dots"><i></i><i></i><i></i></span>
          <small>senditto — api</small>
          <button class="sd-term-copy" data-act="copy-code" title="Copy">${icon("copy")}</button>
        </div>
        <div class="sd-term-tabs">
          ${["curl", "node", "python"].map((t) => `<button class="sd-term-tab ${codeTab === t ? "active" : ""}" data-codetab="${t}">${t === "curl" ? "cURL" : t === "node" ? "Node.js" : "Python"}</button>`).join("")}
        </div>
        <pre class="sd-term-code" data-code></pre>
        <button class="sd-term-docs" data-nav="help">${icon("book")} Documentation &amp; guides ${icon("arrow")}</button>
      </section>`;

    const cap = s.snapshot?.()?.capacity || {};
    const quota = Number(cap.monthlyQuota) || 0;
    const monthKey = new Date().toISOString().slice(0, 7);
    const sentThisMonth = messages.filter((msg) => (msg.createdAt || "").slice(0, 7) === monthKey).length;
    const usagePct = quota ? Math.min(100, (sentThisMonth / quota) * 100) : 0;

    const workspaceCard = isEmpty ? "" : `
      <section class="sd-card3">
        <div class="sd-card3-head"><div><h3>Workspace</h3><p>Plan usage &amp; quick status</p></div></div>
        ${quota ? `
        <div class="sd-usage3">
          ${usageGauge(usagePct)}
          <div>
            <b>${fmtCompact(sentThisMonth)} <span>/ ${fmtCompact(quota)} emails</span></b>
            <small>this month · resets ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</small>
          </div>
        </div>` : ""}
        <div class="sd-facts3">
          <button class="sd-fact3" data-nav="domains"><span>Domains</span><b>${m.verifiedDomains}/${m.domains}</b><small>verified</small></button>
          <button class="sd-fact3" data-nav="api"><span>API keys</span><b>${m.activeKeys}</b><small>active</small></button>
          <button class="sd-fact3" data-nav="contacts"><span>Contacts</span><b>${fmtCompact(m.contacts)}</b><small>audience</small></button>
          <button class="sd-fact3" data-nav="suppressions"><span>Blocked</span><b>${fmtCompact(s.list("suppressions").length)}</b><small>suppressed</small></button>
        </div>
        <div class="sd-status3"><i></i>Sending infrastructure operational</div>
      </section>`;

    /* ---------- assemble ---------- */

    root.innerHTML = `
      <div class="sd-page3">
        ${hero}
        ${isEmpty ? "" : kpis}
        <div class="sd-grid3">
          <div class="sd-colmain">${chartCard}${recentCard}</div>
          <div class="sd-colside">${checklistCard}${codeCard}${workspaceCard}</div>
        </div>
      </div>`;

    /* ---------- wiring ---------- */

    const codeEl = root.querySelector("[data-code]");
    const setCode = () => {
      if (codeEl) codeEl.innerHTML = highlight(samples[codeTab]);
    };
    setCode();

    root.querySelectorAll("[data-nav]").forEach((el) =>
      el.addEventListener("click", () => window.SendittoNavigate?.(el.dataset.nav))
    );
    root.querySelectorAll("[data-range]").forEach((el) =>
      el.addEventListener("click", () => {
        range = Number(el.dataset.range) || 14;
        render(root);
      })
    );
    root.querySelectorAll("[data-mode]").forEach((el) =>
      el.addEventListener("click", () => {
        chartMode = el.dataset.mode;
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
      e.currentTarget.classList.add("copied");
      setTimeout(() => root.querySelector('[data-act="copy-code"]')?.classList.remove("copied"), 900);
    });
    root.querySelector('[data-act="seed-demo"]')?.addEventListener("click", () => window.SendittoDemo?.seed());
    root.querySelector('[data-act="clear-demo"]')?.addEventListener("click", () => window.SendittoDemo?.clear());

    // Crosshair tooltip
    const wrap = root.querySelector("[data-chart]");
    if (wrap) {
      const tip = wrap.querySelector(".sd-tip");
      const guide = wrap.querySelector(".sd-guide");
      const padLf = 40 / 780;
      const padRf = 14 / 780;
      wrap.addEventListener("mousemove", (ev) => {
        const r = wrap.getBoundingClientRect();
        const frac = (ev.clientX - r.left) / r.width;
        const inner = (frac - padLf) / (1 - padLf - padRf);
        const idx = Math.round(Math.min(1, Math.max(0, inner)) * (days.length - 1));
        const b = buckets[idx];
        if (!b) return;
        const px = (padLf + (idx / (days.length - 1)) * (1 - padLf - padRf)) * r.width;
        guide.hidden = false;
        guide.style.left = `${px}px`;
        tip.hidden = false;
        const date = new Date(b.day + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
        tip.innerHTML = `<b>${esc(date)}</b>${activeSeries
          .map((sr) => `<span><i style="background:${sr.color}"></i>${sr.name}<em>${sr.values[idx]}</em></span>`)
          .join("")}`;
        const tw = tip.offsetWidth || 150;
        tip.style.left = `${Math.min(Math.max(px - tw / 2, 6), r.width - tw - 6)}px`;
      });
      wrap.addEventListener("mouseleave", () => {
        tip.hidden = true;
        guide.hidden = true;
      });
    }
  }

  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.overview = render;
})();
