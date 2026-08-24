import { describe, expect, it } from "vitest";

import nextConfig, { securityHeaders } from "./next.config.mjs";

const headerMap = new Map(securityHeaders.map(({ key, value }) => [key, value]));

describe("baseline response security headers", () => {
  it("keeps the hardened browser policy intact", () => {
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });

  it("applies the policy to every route", async () => {
    const rules = await nextConfig.headers();

    expect(rules).toEqual([
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]);
  });
});
