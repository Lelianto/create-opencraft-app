import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, rateLimitHeaders } from "../../../registry/modules/rate-limit/templates/rate-limit.js";
import { safeFetch } from "../../../registry/modules/ssrf-protection/templates/safe-fetch.js";
import {
  applyStrictCsp,
  buildStrictCsp,
  createNonce,
} from "../../../registry/modules/security-headers/templates/csp.js";

// DNS lookup is mocked so tests never hit a real resolver and can assert the
// private-range sniffing. `dns/promises` is ESM, so spyOn cannot stub its
// namespace; a module-level mock is the supported route.
const { dnsLookup } = vi.hoisted(() => ({
  dnsLookup: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  lookup: dnsLookup,
}));

/**
 * Behavioural tests for security-critical template logic that is not covered by
 * the structural invariants in security-invariants.test.ts. Unlike
 * template-behaviour.test.ts, these templates are executed against a real
 * (stubbed) network/filesystem surface so their runtime behaviour is exercised,
 * not just their exports.
 */

describe("rate-limit: fixed window behaves correctly", () => {
  it("allows the first request up to the limit", () => {
    const first = checkRateLimit("user-1", 3, 60_000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    const second = checkRateLimit("user-1", 3, 60_000);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);

    const third = checkRateLimit("user-1", 3, 60_000);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("rejects once the window is exhausted", () => {
    checkRateLimit("user-2", 1, 60_000);
    const rejected = checkRateLimit("user-2", 1, 60_000);
    expect(rejected.allowed).toBe(false);
    expect(rejected.remaining).toBe(0);
  });

  it("keys buckets independently", () => {
    checkRateLimit("user-a", 1, 60_000);
    // A different key is not affected by user-a exhausting its window.
    expect(checkRateLimit("user-b", 1, 60_000).allowed).toBe(true);
  });

  it("reports a reset time at the end of the current window", () => {
    const before = Date.now();
    const result = checkRateLimit("user-reset", 2, 60_000);
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60_000 - 1);
    expect(result.resetAt).toBeLessThanOrEqual(before + 60_000 + 1);
  });

  it("never reports a negative remaining count", () => {
    checkRateLimit("user-neg", 2, 60_000);
    checkRateLimit("user-neg", 2, 60_000);
    const blocked = checkRateLimit("user-neg", 2, 60_000);
    expect(blocked.remaining).toBe(0);
  });

  it("emits standard RateLimit headers", () => {
    const headers = rateLimitHeaders({ allowed: true, remaining: 5, resetAt: Date.now() + 30_000 }, 20);
    expect(headers["RateLimit-Limit"]).toBe("20");
    expect(headers["RateLimit-Remaining"]).toBe("5");
    expect(headers["RateLimit-Reset"]).toBe("30");
  });
});

describe("csp: strict policy with per-request nonce", () => {
  it("produces a unique nonce on each call", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(16);
  });

  it("binds the nonce into script-src", () => {
    const policy = buildStrictCsp("nonce-value");
    expect(policy).toContain("'nonce-nonce-value'");
    expect(policy).toContain("'strict-dynamic'");
  });

  it("blocks framing and object embedding", () => {
    const policy = buildStrictCsp("n");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it("never allows inline or eval scripts in production", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const policy = buildStrictCsp("n");
      const scriptSrc = policy.split(";").find((directive) => directive.trim().startsWith("script-src"));
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("attaches the policy to a response", () => {
    const response = { headers: new Headers() };
    applyStrictCsp(response, "n");
    expect(response.headers.get("Content-Security-Policy")).toContain("'nonce-n'");
  });
});

describe("safeFetch: SSRF defences", () => {
  it("refuses to fetch without an explicit allowlist", async () => {
    await expect(safeFetch("https://api.stripe.com/v1", { allowedHosts: [] })).rejects.toThrow(
      /allowedHosts/,
    );
  });

  it("rejects a non-allowlisted host before any network activity", async () => {
    await expect(
      safeFetch("https://not-allowed.example", { allowedHosts: ["api.stripe.com"] }),
    ).rejects.toThrow(/Host not allowed/);
  });

  it("rejects credentials embedded in the URL", async () => {
    await expect(
      safeFetch("https://user:pass@api.stripe.com/v1", { allowedHosts: ["api.stripe.com"] }),
    ).rejects.toThrow(/Credentials/);
  });

  it("rejects a plain-IP host that is private", async () => {
    await expect(
      safeFetch("http://10.0.0.1", { allowedHosts: ["10.0.0.1"], allowedProtocols: ["http:"] }),
    ).rejects.toThrow(/Blocked/);
  });

  it("rejects loopback", async () => {
    await expect(
      safeFetch("https://127.0.0.1/", { allowedHosts: ["127.0.0.1"] }),
    ).rejects.toThrow(/Blocked/);
  });

  it("rejects an allowlisted hostname that resolves to a private address", async () => {
    dnsLookup.mockResolvedValue([{ address: "10.1.2.3", family: 4 }] as never);
    try {
      await expect(
        safeFetch("https://metadata.internal.example/", { allowedHosts: ["metadata.internal.example"] }),
      ).rejects.toThrow(/non-public|Blocked/);
    } finally {
      dnsLookup.mockReset();
    }
  });

  it("allows a hostname that resolves to public addresses", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);

    const fetchMock = vi.fn(() =>
      new Response("ok", {
        status: 200,
        headers: { "content-type": "application/json", "content-length": "2" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      const result = await safeFetch("https://public.example/data", {
        allowedHosts: ["public.example"],
      });
      expect(result.status).toBe(200);
      expect(result.contentType).toBe("application/json");
      expect(Buffer.from(result.bytes).toString()).toBe("ok");
      // The request must not carry ambient credentials.
      const call = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
      expect(call[0]?.[1].credentials).toBe("omit");
    } finally {
      dnsLookup.mockReset();
      vi.unstubAllGlobals();
    }
  });

  it("re-validates every redirect hop", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://public.example/next" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("landed", { status: 200, headers: { "content-length": "6" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    try {
      const result = await safeFetch("https://public.example/start", {
        allowedHosts: ["public.example"],
      });
      expect(result.status).toBe(200);
      expect(Buffer.from(result.bytes).toString()).toBe("landed");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      dnsLookup.mockReset();
      vi.unstubAllGlobals();
    }
  });

  it("rejects a redirect that leaves the allowlist", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);

    const fetchMock = vi.fn(() =>
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.example/steal" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(
        safeFetch("https://public.example/start", { allowedHosts: ["public.example"] }),
      ).rejects.toThrow(/Host not allowed/);
    } finally {
      dnsLookup.mockReset();
      vi.unstubAllGlobals();
    }
  });

  it("caps the response size while streaming", async () => {
    dnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);

    const fetchMock = vi.fn(() =>
      new Response("x".repeat(1_000), { status: 200, headers: { "content-length": "1000" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(
        safeFetch("https://public.example/data", { allowedHosts: ["public.example"], maxBytes: 100 }),
      ).rejects.toThrow(/too large/);
    } finally {
      dnsLookup.mockReset();
      vi.unstubAllGlobals();
    }
  });
});
