import { describe, expect, it } from "vitest";

import { CustomSplat } from "../../src/js/formats/CustomSplat";

describe("CustomSplat", () => {
    it("formats %I with custom inspect depth", () => {
        const message = CustomSplat.formatString("data=%I0", [{ a: { b: { c: 1 } } }], false);

        expect(message).toContain("data=");
        expect(message).toContain("[Object]");
    });
});
