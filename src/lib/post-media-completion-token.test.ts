import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createPostMediaCompletionGrant,
  verifyPostMediaCompletionGrant,
} from "./post-media-completion-token";

const SECRET = "test-media-completion-secret";
const NOW = 1_800_000_000_000;

const grantInput = {
  ownerId: "member-1",
  objectKey: "members/member-1/post-media/upload_1.jpg",
  mediaUrl: "https://cdn.example.com/upload_1.jpg",
  originalName: "garage.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  kind: "IMAGE" as const,
};

function signPayload(value: unknown) {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  const signature = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

describe("post media completion grants", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  it("round-trips a server-issued grant before expiry", () => {
    const token = createPostMediaCompletionGrant(grantInput, NOW);

    expect(verifyPostMediaCompletionGrant(token, NOW + 1)).toEqual({
      ...grantInput,
      expiresAt: NOW + 15 * 60 * 1000,
    });
  });

  it("treats the exact expiry instant as expired", () => {
    const token = createPostMediaCompletionGrant(grantInput, NOW);

    expect(() => verifyPostMediaCompletionGrant(token, NOW + 15 * 60 * 1000)).toThrow(
      "Media completion grant expired.",
    );
  });

  it("rejects a correctly signed payload with missing required fields", () => {
    const token = signPayload({
      ownerId: "member-1",
      expiresAt: NOW + 60_000,
    });

    expect(() => verifyPostMediaCompletionGrant(token, NOW)).toThrow(
      "Invalid media completion grant.",
    );
  });

  it("rejects a correctly signed payload with unexpected fields", () => {
    const token = signPayload({
      ...grantInput,
      expiresAt: NOW + 60_000,
      admin: true,
    });

    expect(() => verifyPostMediaCompletionGrant(token, NOW)).toThrow(
      "Invalid media completion grant.",
    );
  });

  it("rejects malformed signed metadata instead of trusting the parsed shape", () => {
    const invalidPayloads = [
      { ...grantInput, sizeBytes: 0, expiresAt: NOW + 60_000 },
      { ...grantInput, kind: "DOCUMENT", expiresAt: NOW + 60_000 },
      { ...grantInput, ownerId: "   ", expiresAt: NOW + 60_000 },
      { ...grantInput, expiresAt: "later" },
    ];

    for (const payload of invalidPayloads) {
      expect(() => verifyPostMediaCompletionGrant(signPayload(payload), NOW)).toThrow(
        "Invalid media completion grant.",
      );
    }
  });

  it("rejects a tampered signature", () => {
    const token = createPostMediaCompletionGrant(grantInput, NOW);
    const [payload] = token.split(".");

    expect(() => verifyPostMediaCompletionGrant(`${payload}.tampered`, NOW)).toThrow(
      "Invalid media completion grant.",
    );
  });
});
