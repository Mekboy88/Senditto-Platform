/**
 * Make the built app's sign-in real.
 *
 * The auth screen ships as a prebuilt bundle in public/assets (no source in
 * this repo), so the three places that used to hand out access without ever
 * contacting a server are rewritten here. Re-run after replacing the bundle:
 *
 *   node scripts/patch-auth-bundle.mjs
 *
 * The script is idempotent and fails loudly if the bundle no longer matches,
 * so a silent regression to fake auth is not possible.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ASSETS = new URL("../public/assets/", import.meta.url).pathname;
const HTML = new URL("../public/senditto-preview.html", import.meta.url).pathname;

// The bundle actually referenced by the page.
const html = readFileSync(HTML, "utf8");
const ref = html.match(/\/assets\/(index-[\w-]+\.js)/);
if (!ref) throw new Error("Could not find the app bundle referenced in senditto-preview.html");
const file = join(ASSETS, ref[1]);
if (!readdirSync(ASSETS).includes(ref[1])) throw new Error(`Missing bundle ${ref[1]}`);

let src = readFileSync(file, "utf8");
const before = src;

/**
 * [description, find, replace, expectedCount, marker]
 *
 * `marker` is a short string that exists once the patch is applied. It is what
 * makes re-running safe: a later patch may rewrite an earlier patch's output,
 * so looking for the whole replacement text would wrongly report a mismatch.
 */
const patches = [
  [
    "sign-in form now verifies credentials with the server",
    "if(l(``),e===`signin`){r();return}s(!0)",
    "if(l(``),e===`signin`){window.SendittoAuth.signIn(n.get(`email`),n.get(`password`))" +
      ".then(()=>r()).catch(v=>l(v&&v.message||`Sign in failed`));return}s(!0)",
    1,
    "window.SendittoAuth.signIn",
  ],
  [
    "social buttons no longer grant access without credentials",
    "onClick:()=>e===`signin`?r():s(!0)",
    "onClick:()=>e===`signin`?l(`Sign in with your Senditto email and password.`):s(!0)",
    2,
    "Sign in with your Senditto email and password.",
  ],
  [
    // Runs after the sign-in patch above, so it matches that patch's output.
    "registration creates a real account in the database",
    "catch(v=>l(v&&v.message||`Sign in failed`));return}s(!0)",
    "catch(v=>l(v&&v.message||`Sign in failed`));return}" +
      "if(e===`register`){window.SendittoAuth.signUp({email:n.get(`email`),password:n.get(`password`)," +
      "name:n.get(`name`),company:n.get(`company`)}).then(()=>s(!0))" +
      ".catch(v=>l(v&&v.message||`Could not create your account`));return}s(!0)",
    1,
    "window.SendittoAuth.signUp",
  ],
  [
    // Without this the app always boots to the marketing site, so a refresh
    // looks exactly like being signed out even though the session is alive.
    "a refresh returns to the dashboard when a session exists",
    "[m,h]=(0,S.useState)(`marketing`)",
    "[m,h]=(0,S.useState)(()=>(window.SendittoBoot&&window.SendittoBoot.view())||`marketing`)",
    1,
    "window.SendittoBoot.view()",
  ],
  [
    // Leaving the dashboard must actually end the session, or the boot hint
    // would send the next refresh straight back in.
    // The sign-in / create-account panel is app state, so a refresh threw it
    // away and dropped you on the landing page. Remember which panel was open
    // and reopen it on the first frame; every change is recorded, so closing
    // it is remembered too.
    "a refresh reopens the auth panel you had open",
    "[f,p]=(0,S.useState)(null)",
    "[f,p$0]=(0,S.useState)(()=>(window.SendittoBoot&&window.SendittoBoot.authMode())||null)," +
      "p=v=>{window.SendittoBoot&&window.SendittoBoot.rememberAuth(v);p$0(v)}",
    1,
    "window.SendittoBoot.authMode()",
  ],
  [
    "leaving the dashboard signs out for real",
    "xt,{onExit:()=>h(`marketing`)}",
    "xt,{onExit:()=>{if(window.SendittoAuth){window.SendittoAuth.signOut();return}h(`marketing`)}}",
    1,
    "window.SendittoAuth.signOut()",
  ],
  [
    "entering the dashboard requires a verified session",
    "onContinue:()=>{p(null),h(`dashboard`)}",
    "onContinue:()=>{if(!(window.SendittoAuth&&window.SendittoAuth.isAuthenticated()))return;" +
      "p(null),h(`dashboard`)}",
    1,
    "window.SendittoAuth.isAuthenticated()",
  ],
];

let applied = 0;
for (const [what, find, replace, expected, marker] of patches) {
  const found = src.split(find).length - 1;
  if (found === 0) {
    if (src.includes(marker || replace)) {
      console.log(`  already patched — ${what}`);
      continue;
    }
    throw new Error(`Bundle does not match expected code for: ${what}`);
  }
  if (found !== expected) {
    throw new Error(`Expected ${expected} occurrence(s) for "${what}", found ${found}`);
  }
  src = src.split(find).join(replace);
  applied++;
  console.log(`  patched — ${what}`);
}

if (src !== before) {
  writeFileSync(file, src);
  console.log(`\n${applied} patch(es) written to public/assets/${ref[1]}`);
} else {
  console.log("\nBundle already up to date.");
}

/* ------------------------------------------------------------------
   Cache busting.

   The app bundle is patched in place, so its filename never changes and a
   browser that cached the old copy keeps running it — which looks exactly
   like being signed out, because an old bundle has none of the restore
   logic. Stamp every locally-served script with a hash of its own contents
   so any change is a new URL and no stale copy can survive.
   ------------------------------------------------------------------ */
import { createHash } from "node:crypto";

const shortHash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 10);

let page = readFileSync(HTML, "utf8");
const pageBefore = page;

// The patched bundle.
page = page.replace(
  /(\/assets\/index-[\w-]+\.js)(\?v=[\w.]+)?/g,
  (_m, path) => `${path}?v=${shortHash(readFileSync(file, "utf8"))}`
);

// Every script and stylesheet we serve from public/. A hand-kept list of
// prefixes used to live here and quietly missed files — an unstamped asset is
// a file that browsers keep serving from cache after we have changed it, which
// is the hardest kind of bug to see because it only happens to people who
// visited before.
page = page.replace(/\/([\w-]+)\.(js|css)(\?v=[\w.]+)?/g, (m, name, ext) => {
  const assetPath = new URL(`../public/${name}.${ext}`, import.meta.url).pathname;
  try {
    return `/${name}.${ext}?v=${shortHash(readFileSync(assetPath, "utf8"))}`;
  } catch {
    return m; // not one of ours (the hashed bundle, a CDN URL) — leave it alone
  }
});

if (page !== pageBefore) {
  writeFileSync(HTML, page);
  console.log("  stamped asset URLs with content hashes so caches cannot serve stale code");
}

/* ------------------------------------------------------------------
   Inline the boot screen.

   A skeleton that arrives as its own <script src> cannot paint until that
   request completes — on a slow connection the user stares at a blank page
   for exactly as long as the shimmer was meant to cover. Inlining it means it
   is on screen in the first frame, with no round trip. The source of truth
   stays public/platform-boot.js; this regenerates the inlined copy.
   ------------------------------------------------------------------ */
{
  const bootPath = new URL("../public/platform-boot.js", import.meta.url).pathname;
  const boot = readFileSync(bootPath, "utf8");
  const html = readFileSync(HTML, "utf8");
  const START = "<!-- boot:start -->";
  const END = "<!-- boot:end -->";
  const from = html.indexOf(START);
  const to = html.indexOf(END);
  if (from === -1 || to === -1) {
    console.log("  boot markers not found — skipping inline boot screen");
  } else {
    const block =
      `${START}\n    <!-- Generated from public/platform-boot.js — edit that file, not this. -->\n` +
      `    <script>\n${boot}\n    </script>\n    ${END}`;
    const next = html.slice(0, from) + block + html.slice(to + END.length);
    if (next !== html) {
      writeFileSync(HTML, next);
      console.log("  inlined the boot screen so it paints in the first frame");
    }
  }
}
