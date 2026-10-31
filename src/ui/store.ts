import type { Packet } from "../core/packet.js";

export interface Store {
  get(): Packet | null;
  set(next: Packet | null, ticket?: number): void;
  isDirty(): boolean;
  markExported(raw: string): void;
  ticket(): number;
  beginOperation(): number;
  subscribe(fn: () => void): () => void;
}

export function createStore(): Store {
  let packet: Packet | null = null;
  let generation = 0;
  let lastExport = "";
  const subscribers = new Set<() => void>();

  return {
    get: () => packet,
    set(next, ticket) {
      if (ticket === undefined) generation++;
      else if (ticket !== generation) throw new Error("Session changed");
      packet = next;
      for (const fn of subscribers) fn();
    },
    isDirty: () => !!packet && JSON.stringify(packet) !== lastExport,
    markExported(raw) {
      lastExport = raw;
    },
    ticket: () => generation,
    beginOperation: () => ++generation,
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
