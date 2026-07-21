/**
 * Overview dashboard v2 — premium workspace home.
 * Loads after overview-realtime.js and takes over the "overview" route with a
 * richer layout: KPI cards with sparklines, a 14-day activity chart, setup
 * checklist, quick actions, recent messages and an API quick-start card.
 * All charts are dependency-free inline SVG. Empty-by-default friendly.
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
        layers: '<path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/>',
      }[n] || ""
    }</svg>`;

  function dayKey(iso) {
    return (iso || "").slice(0, 10);
  }

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
    const map = Object.fromEntries(days.map((d) => [d, { total: 0, delivered: 0, failed: 0 }]));
    for (const m of messages) {
      const k = dayKey(m.createdAt);
      if (!map[k]) continue;
      map[k].total += 1;
      if (/delivered|opened|clicked/i.test(m.status || "")) map[k].delivered += 1;
      if (/bounce|failed/i.test(m.status || "")) map[k].failed += 1;
    }
    return days.map((d) => ({ day: d, ...map[d] }));
  }

  function sparkline(values, w = 120, h = 34) {
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? w / (values.length - 1) : w;
    const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - (v / max) * (h - 8)).toFixed(1)}`);
    const area = `M0,${h} L${pts.join(" L")} L${w},${h} Z`;
    return `<svg class="sd-spark" style="width:100%;height:${h}px;display:block" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
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

  function pctDelta(cur, prev) {
    if (!prev) return cur ? { txt: "new", up: true } : { txt: "—", up: null };
    const d = ((cur - prev) / prev) * 100;
    return { txt: `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`, up: d >= 0 };
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
    const failed = buckets.map((b) => b.failed);

    const half = Math.floor(buckets.length / 2);
    const curHalf = totals.slice(half).reduce((a, b) => a + b, 0);
    const prevHalf = totals.slice(0, half).reduce((a, b) => a + b, 0);
    const delta = pctDelta(curHalf, prevHalf);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    const hasKey = m.activeKeys > 0;
    const hasDomain = m.verifiedDomains > 0;
    const hasSent = m.sent > 0;
    const hasTeam = (s.list("teamInvites") || []).length > 0 || ((s.currentWorkspace?.()?.members || []).length > 1);
    const setup = [
      { done: hasKey, label: "Create an API key", route: "api", icon: "key" },
      { done: hasDomain, label: "Verify a sending domain", route: "domains", icon: "globe" },
      { done: hasSent, label: "Send your first email", route: "send", icon: "send" },
      { done: hasTeam, label: "Invite your team", route: "team", icon: "users" },
    ];
    const doneCount = setup.filter(x => x.done).length;
    const isEmpty = !hasSent && !hasKey && m.contacts === 0;
    const seeded = window.SendittoDemo?.isSeeded?.() || false;

    const firstKey = s.list("keys").find((k) => /active/i.test(k.status || ""));
    const samples = codeSamples(firstKey?.masked);

    const kpis = [
      { label: "Emails sent", value: m.sent, spark: totals, sub: `${delta.txt} vs previous`, up: delta.up },
      { label: "Delivery rate", value: m.deliveryRate, spark: delivered, sub: `${m.delivered} delivered` },
      { label: "Open rate", value: m.openRate, spark: delivered.map((v, i) => Math.min(v, buckets[i].delivered)), sub: `${m.opened} opened` },
      { label: "Click rate", value: m.clickRate, spark: delivered, sub: `${m.clicked} clicked` },
      { label: "Bounced", value: m.bounced, spark: failed, sub: m.sent ? `${((m.bounced / m.sent) * 100).toFixed(1)}% of sent` : "—", tone: m.bounced ? "bad" : "" },
    ];

    const recent = messages.slice(0, 8);

    root.innerHTML = `
    <div class="sd-page">
      <div class="sd-head">
        <div>
          <small class="pp-kicker">${esc(today.toUpperCase())}</small>
          <h1>${esc(greeting)}${ws?.name ? `, ${esc(ws.name)}` : ""}</h1>
          <p>Everything your workspace sent, delivered and earned — live.</p>
        </div>
        <div class="sd-head-actions">
          ${seeded
            ? `<button class="sd-btn ghost" data-act="clear-demo">${icon("trash")} Remove sample data</button>`
            : `<button class="sd-btn ghost" data-act="seed-demo">${icon("spark")} Load sample data</button>`}
          <button class="sd-btn" data-nav="analytics">Open analytics</button>
          <button class="sd-btn primary" data-nav="send">${icon("send")} Send email</button>
        </div>
      </div>

      ${isEmpty ? `
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
      </div>` : ""}

      <div class="sd-kpis">
        ${kpis.map((k) => `
          <div class="sd-kpi ${k.tone || ""}">
            <div class="sd-kpi-top">
              <span>${esc(k.label)}</span>
              ${k.up === true ? '<b class="sd-delta up">▲</b>' : k.up === false ? '<b class="sd-delta down">▼</b>' : ""}
            </div>
            <div class="sd-kpi-value">${esc(String(k.value))}</div>
            ${sparkline(k.spark)}
            <div class="sd-kpi-sub">${esc(k.sub)}</div>
          </div>`).join("")}
      </div>

      <div class="sd-grid">
        <div class="sd-col-main">
          <section class="sd-card">
            <div class="sd-card-head">
              <div><h3>Email activity</h3><p>Sent vs delivered vs failed, per day</p></div>
              <div class="sd-range">
                ${[7, 14, 30].map((r) => `<button class="sd-range-btn ${range === r ? "active" : ""}" data-range="${r}">${r}d</button>`).join("")}
              </div>
            </div>
            ${m.sent === 0
              ? `<div class="sd-empty">${icon("send")}<h4>No activity yet</h4><p>Send your first email and this chart comes alive.</p></div>`
              : areaChart([
                  { name: "Sent", color: "#367ef5", values: totals },
                  { name: "Delivered", color: "#16a34a", values: delivered },
                  { name: "Failed", color: "#dc2626", values: failed },
                ], days)}
            <div class="sd-legend">
              <span><i style="background:#367ef5"></i>Sent</span>
              <span><i style="background:#16a34a"></i>Delivered</span>
              <span><i style="background:#dc2626"></i>Failed</span>
            </div>
          </section>

          <section class="sd-card">
            <div class="sd-card-head">
              <div><h3>Recent messages</h3><p>The last ${recent.length || 0} requests through your workspace</p></div>
              <button class="sd-btn sm" data-nav="activity">View all ${icon("arrow")}</button>
            </div>
            ${recent.length === 0
              ? `<div class="sd-empty sm"><p>Messages appear here the moment you send.</p></div>`
              : `<table class="sd-table">
                  <thead><tr><th>Message</th><th>To</th><th>Stream</th><th>Status</th><th>When</th></tr></thead>
                  <tbody>
                    ${recent.map((msg) => `
                      <tr>
                        <td class="sd-strong">${esc(msg.subject || msg.name || "—")}</td>
                        <td class="sd-mut">${esc(Array.isArray(msg.to) ? msg.to[0] || "—" : msg.to || "—")}</td>
                        <td><span class="sd-stream">${esc(msg.stream || "—")}</span></td>
                        <td>${statusChip(msg.status)}</td>
                        <td class="sd-mut">${esc(s.formatRelative?.(msg.createdAt) || "")}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>`}
          </section>
        </div>

        <div class="sd-col-side">
          <section class="sd-card">
            <div class="sd-card-head">
              <div><h3>Get set up</h3><p>${doneCount}/${setup.length} complete</p></div>
            </div>
            <div class="sd-progress"><i style="width:${(doneCount / setup.length) * 100}%"></i></div>
            <div class="sd-checklist">
              ${setup.map((x) => `
                <button class="sd-check ${x.done ? "done" : ""}" data-nav="${x.route}">
                  <span class="sd-check-mark">${x.done ? icon("check") : ""}</span>
                  <span class="sd-check-ic">${icon(x.icon)}</span>
                  <span>${esc(x.label)}</span>
                  ${icon("arrow")}
                </button>`).join("")}
            </div>
          </section>

          <section class="sd-card sd-code-card">
            <div class="sd-card-head">
              <div><h3>Send with the API</h3><p>Drop-in from any stack</p></div>
            </div>
            <div class="sd-code-tabs">
              ${["curl", "node", "python"].map((t) => `<button class="sd-code-tab ${codeTab === t ? "active" : ""}" data-codetab="${t}">${t === "curl" ? "cURL" : t === "node" ? "Node.js" : "Python"}</button>`).join("")}
              <button class="sd-code-copy" data-act="copy-code" title="Copy">${icon("copy")}</button>
            </div>
            <pre class="sd-code" data-code></pre>
          </section>

          <section class="sd-card">
            <div class="sd-card-head"><div><h3>Workspace</h3><p>Quick status</p></div></div>
            <div class="sd-facts">
              <button class="sd-fact" data-nav="domains"><span>Domains</span><b>${m.verifiedDomains}/${m.domains} verified</b></button>
              <button class="sd-fact" data-nav="api"><span>API keys</span><b>${m.activeKeys} active</b></button>
              <button class="sd-fact" data-nav="contacts"><span>Contacts</span><b>${m.contacts}</b></button>
              <button class="sd-fact" data-nav="suppressions"><span>Suppressions</span><b>${s.list("suppressions").length}</b></button>
              <button class="sd-fact" data-nav="templates"><span>Templates</span><b>${m.templates}</b></button>
              <button class="sd-fact" data-nav="webhooks"><span>Webhooks</span><b>${m.webhooks}</b></button>
            </div>
            <button class="sd-btn ghost full" data-nav="help">${icon("book")} Documentation & guides</button>
          </section>
        </div>
      </div>
    </div>`;

    // ----- wiring -----
    const codeEl = root.querySelector("[data-code]");
    const setCode = () => { if (codeEl) codeEl.textContent = samples[codeTab]; };
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
    root.querySelector('[data-act="seed-demo"]')?.addEventListener("click", () => {
      window.SendittoDemo?.seed();
    });
    root.querySelector('[data-act="clear-demo"]')?.addEventListener("click", () => {
      window.SendittoDemo?.clear();
    });
  }

  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.overview = render;
})();
