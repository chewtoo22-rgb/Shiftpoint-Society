import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("feed media viewer accessibility contract", () => {
  it("exposes the fullscreen trigger as controlling a dialog with live expanded state", () => {
    const source = readFileSync(new URL("./feed-media-viewer.tsx", import.meta.url), "utf8");

    expect(source).toContain('aria-haspopup="dialog"');
    expect(source).toContain("aria-expanded={open}");
    expect(source).toContain("aria-controls={dialogId}");
    expect(source).toContain("id={dialogId}");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
  });
});
