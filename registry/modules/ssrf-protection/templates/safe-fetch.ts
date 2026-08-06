import "server-only";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

/**
 * SSRF-resistant outbound fetch.
 *
 * Use this for **every server-side request whose URL is influenced by user
 * input** — webhooks, "import from URL", link previews, avatar fetching.
 *
 * Do not use it as a general ban on URLs in user input: storing or displaying a
 * URL is harmless. The risk is the *server* fetching it, because the server sits
 * inside your network perimeter and can reach metadata endpoints and internal
 * services that the user cannot.
 *
 * ## Controls applied
 *
 * - Protocol allowlist (HTTPS only by default).
 * - Hostname allowlist — required, no wildcard default.
 * - Rejects credentials embedded in the URL.
 * - Resolves DNS and rejects private, loopback, link-local, CGNAT, multicast,
 *   and reserved ranges, including IPv4-mapped IPv6.
 * - Redirects are followed manually and every hop is re-validated.
 * - Hard timeout and a streamed response size cap.
 * - Sends no ambient credentials: no cookies, no Authorization header.
 *
 * ## Honest limitations — read these
 *
 * 1. **DNS rebinding is not fully solved.** We resolve the hostname, validate the
 *    addresses, then hand the *hostname* to `fetch`, which resolves again. A
 *    hostile DNS server can return a public address to our check and a private
 *    one to the real connection. Closing this requires pinning the connection to
 *    the validated IP via a custom agent/socket hook, which is not portable
 *    across serverless runtimes. The hostname allowlist is what actually protects
 *    you here — keep it narrow.
 *
 * 2. **Serverless egress may bypass this entirely.** On some platforms outbound
 *    traffic leaves through a proxy whose own DNS view differs from ours. Treat
 *    this as defence in depth, not a perimeter.
 *
 * 3. **The allowlist is the primary control.** Every check below is secondary to
 *    "only these hostnames". Do not accept arbitrary hosts and rely on IP
 *    filtering alone.
 */
export interface SafeFetchOptions {
  /** Required. Exact hostnames permitted, e.g. `["api.stripe.com"]`. */
  allowedHosts: string[];
  /** Defaults to HTTPS only. */
  allowedProtocols?: string[];
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  method?: "GET" | "HEAD" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

/** IPv4 ranges that must never be reachable from a user-influenced fetch. */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  const [a = 0, b = 0] = parts;

  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast and reserved
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const address = ip.toLowerCase().replace(/^\[|\]$/g, "");

  if (address === "::" || address === "::1") return true; // unspecified, loopback

  /*
   * IPv4-mapped and IPv4-compatible forms (::ffff:127.0.0.1) would otherwise
   * slip past the IPv6 prefix checks entirely.
   */
  const mapped = /^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (mapped?.[1]) return isBlockedIPv4(mapped[1]);

  if (/^f[cd]/.test(address)) return true; // fc00::/7 unique local
  if (/^fe[89ab]/.test(address)) return true; // fe80::/10 link-local
  if (/^ff/.test(address)) return true; // multicast
  if (address.startsWith("2002:")) return true; // 6to4
  if (address.startsWith("64:ff9b:")) return true; // NAT64
  return false;
}

function isBlockedAddress(ip: string): boolean {
  return isIP(ip) === 4 ? isBlockedIPv4(ip) : isBlockedIPv6(ip);
}

/** Reject hosts that resolve to anything non-public. */
async function assertPublicHost(hostname: string): Promise<void> {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Blocked host");
  }
  // `.internal` is used by several cloud providers for private endpoints.
  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    throw new Error("Blocked host");
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) throw new Error("Blocked address");
    return;
  }

  const results = await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
  if (!results.length) throw new Error("Host does not resolve");

  // Every resolved address must be public; one bad answer is enough to refuse.
  for (const { address } of results) {
    if (isBlockedAddress(address)) throw new Error("Host resolves to a non-public address");
  }
}

/** Read at most `maxBytes`, aborting the stream rather than buffering more. */
async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  // A declared length over the cap lets us fail before reading anything.
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("Response too large");

  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      // Enforced while streaming: a server that omits or lies about
      // content-length cannot make us buffer an unbounded body.
      if (total > maxBytes) throw new Error("Response too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function safeFetch(
  input: string,
  options: SafeFetchOptions,
): Promise<{ status: number; contentType: string; bytes: Uint8Array }> {
  const {
    allowedHosts,
    allowedProtocols = ["https:"],
    timeoutMs = 5_000,
    maxBytes = 2_000_000,
    maxRedirects = 2,
    method = "GET",
    headers = {},
    body,
  } = options;

  if (!allowedHosts.length) {
    throw new Error("safeFetch requires an explicit allowedHosts list");
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (!allowedProtocols.includes(url.protocol)) throw new Error("Protocol not allowed");
    // `https://user:pass@host` can be used to confuse naive host parsing.
    if (url.username || url.password) throw new Error("Credentials in URL are not allowed");
    if (!allowedHosts.includes(url.hostname)) throw new Error("Host not allowed");

    await assertPublicHost(url.hostname);

    const response = await fetch(url, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      // No cookies and no ambient credentials are ever sent.
      credentials: "omit",
      cache: "no-store",
      headers: { accept: "application/json, text/plain;q=0.8", ...headers },
      ...(body === undefined ? {} : { body }),
    } as RequestInit & { cache: "no-store" });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without a location");

      // Resolve against the current URL, then loop so the new target passes
      // every check again rather than being trusted.
      url = new URL(location, url);
      continue;
    }

    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      bytes: await readCapped(response, maxBytes),
    };
  }

  throw new Error("Too many redirects");
}
