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
