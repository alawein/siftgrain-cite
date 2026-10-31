import { expect, test } from "vitest";
import { readDraft, saveDraft } from "./draft.js";

function withStorage(descriptor: PropertyDescriptor, check: () => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, ...descriptor });
  try {
    check();
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("saving a draft reports failure when device storage is full", () => {
  withStorage(
    {
      value: {
        setItem() {
          throw new Error("Storage full");
        },
      },
    },
    () =>
      expect(saveDraft({ schema_version: 2, sources: [], claims: [], reviews: [] })).toBe(false),
  );
});

test("reading a draft reports unavailable when access to storage itself is blocked", () => {
  withStorage(
    {
      get() {
        throw new Error("Storage blocked");
      },
    },
    () => {
      expect(readDraft()).toEqual({ available: false });
    },
  );
});
