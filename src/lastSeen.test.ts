import { describe, expect, it } from "vitest";
import { formatLastSeen } from "./lastSeen";

const now = new Date("2021-05-04T12:00:00");

describe("formatLastSeen", () => {
    it("is relative for the last day", () => {
        expect(formatLastSeen("2021-05-04T11:59:40", now)).toBe("just now");
        expect(formatLastSeen("2021-05-04T11:45:00", now)).toBe("15 min ago");
        expect(formatLastSeen("2021-05-04T09:00:00", now)).toBe("3 h ago");
    });

    it("is the date when older", () => {
        expect(formatLastSeen("2021-05-01T09:00:00", now)).toBe("2021-05-01");
    });
});
