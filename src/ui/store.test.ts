import { expect, test } from "vitest";
import type { Packet } from "../core/packet.js";
import { createStore } from "./store.js";

const packet: Packet = { schema_version: 2, sources: [], claims: [], reviews: [] };

test("starting a replacement invalidates older operations before the packet changes", () => {
  const store = createStore();
  store.set(packet);
  store.markExported(JSON.stringify(packet));
  const previous = store.ticket();
  expect(store.ticket()).toBe(previous);

  const current = store.beginOperation();
  expect(store.ticket()).toBe(current);
  expect(current).not.toBe(previous);
  expect(store.get()).toBe(packet);
  expect(store.isDirty()).toBe(false);
  expect(() => store.set(null, previous)).toThrow();
  expect(store.get()).toBe(packet);
});

test("an ordinary set advances the ticket, while a current-ticket commit changes packet identity", () => {
  const store = createStore();
  const first = store.ticket();
  store.set(packet);
  const current = store.ticket();
  expect(current).not.toBe(first);
  const previous = store.get();
  const next = structuredClone(packet);
  store.set(next, current);
  expect(store.ticket()).toBe(current);
  expect(store.get()).toBe(next);
  expect(store.get()).not.toBe(previous);
});

test("dirty state compares the packet's compact serialization to the last native export", () => {
  const store = createStore();
  expect(store.isDirty()).toBe(false);
  store.set(packet);
  expect(store.isDirty()).toBe(true);
  store.markExported(JSON.stringify(packet, null, 2));
  expect(store.isDirty()).toBe(true);
  store.markExported(JSON.stringify(packet));
  expect(store.isDirty()).toBe(false);
  store.set({ ...packet, claims: [{ id: "c1", text: "Changed", citation_ids: [] }] });
  expect(store.isDirty()).toBe(true);
  store.set(structuredClone(packet));
  expect(store.isDirty()).toBe(false);
  store.set(null);
  expect(store.isDirty()).toBe(false);
});

test("subscribers see the committed packet and can unsubscribe", () => {
  const store = createStore();
  const seen: (Packet | null)[] = [];
  const unsubscribe = store.subscribe(() => seen.push(store.get()));
  store.set(packet);
  const ticket = store.beginOperation();
  store.markExported(JSON.stringify(packet));
  store.set(null, ticket);
  unsubscribe();
  store.set(packet);
  expect(seen).toEqual([packet, null]);
});
