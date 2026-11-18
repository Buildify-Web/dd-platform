"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A tiny shared value for two client islands on the same page (e.g. a note field on the
 * left and its submit buttons on the right). Module-level, so keep it to page-local UI state.
 */
export function createShared<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  const subscribe = (fn: () => void) => (subs.add(fn), () => void subs.delete(fn));
  return function useShared(): [T, (v: T) => void] {
    const v = useSyncExternalStore(subscribe, () => value, () => initial);
    const set = useCallback((next: T) => {
      value = next;
      subs.forEach((f) => f());
    }, []);
    return [v, set];
  };
}
