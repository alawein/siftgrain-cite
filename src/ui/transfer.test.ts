import { expect, test } from "vitest";
import type { Packet } from "../core/packet.js";
import { decideImport } from "./transfer.js";

const packet: Packet = { schema_version: 2, sources: [], claims: [], reviews: [] };

test("imports immediately when there is no current packet", () => {
  expect(decideImport(null, packet, false)).toBe("replace");
  expect(decideImport(null, packet, true)).toBe("replace");
});

test("asks before replacing dirty work, even with the same packet", () => {
  expect(decideImport(packet, packet, true)).toBe("confirm");
});

test("replaces an exported packet without confirmation", () => {
  expect(decideImport(packet, structuredClone(packet), false)).toBe("replace");
});
