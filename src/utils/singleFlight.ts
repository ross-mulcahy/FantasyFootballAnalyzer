// Share an identical read only while it is in flight. Settled results are
// discarded so a manual refresh always asks the provider for current data.
export function singleFlight<T>(
  pending: Map<string, Promise<unknown>>,
  key: string,
  request: () => Promise<T>,
): Promise<T> {
  const existing = pending.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = Promise.resolve().then(request);
  pending.set(key, promise);
  void promise.then(
    () => { if (pending.get(key) === promise) pending.delete(key); },
    () => { if (pending.get(key) === promise) pending.delete(key); },
  );
  return promise;
}
