/**
 * dns-patch.mjs
 * Patches dns.lookup so Node's native fetch can resolve *.supabase.co
 * even when the local DNS resolver can't handle the .co TLD.
 * Import this as the FIRST import in any script that talks to Supabase.
 *
 * Node's undici (fetch internals) calls dns.lookup with { all: true },
 * expecting callback(err, [{address, family}]). We handle both modes.
 */
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const dns = _require("dns");

// IPs for *.supabase.co resolved via 8.8.8.8 (Cloudflare CDN – stable)
const SUPABASE_IPS = ["104.18.38.10", "172.64.149.246"];

const _origLookup = dns.lookup.bind(dns);
dns.lookup = function patchedLookup(hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (typeof hostname === "string" && hostname.endsWith(".supabase.co")) {
    const all = options && options.all;
    if (all) {
      // undici (Node fetch) calls with {all:true}, expects [{address, family}]
      process.nextTick(() =>
        callback(
          null,
          SUPABASE_IPS.map((a) => ({ address: a, family: 4 })),
        ),
      );
    } else {
      process.nextTick(() => callback(null, SUPABASE_IPS[0], 4));
    }
    return;
  }
  _origLookup(hostname, options, callback);
}
