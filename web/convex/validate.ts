// Payload validation for `data.save`, kept pure (no Convex imports) so it can
// be unit-tested directly.

/** Convex caps a document at 1 MiB. Stay clearly under it and fail with a
 *  readable message rather than an opaque platform error. */
export const MAX_DATA_BYTES = 900_000;

/**
 * Refuse anything that isn't recognisably SawaData. `v.any()` otherwise lets a
 * buggy client persist junk that breaks every other device on next load, with
 * no size ceiling at all. Deliberately permissive — it rejects only payloads
 * that are structurally wrong, so older clients keep working.
 */
export function assertSawaData(data: unknown): void {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("save: payload must be a SawaData object");
  }
  const d = data as Record<string, unknown>;
  if (
    !Array.isArray(d.tasks) ||
    !Array.isArray(d.streams) ||
    !Array.isArray(d.completionDays)
  ) {
    throw new Error("save: payload missing tasks/streams/completionDays arrays");
  }
  const bytes = JSON.stringify(data).length;
  if (bytes > MAX_DATA_BYTES) {
    throw new Error(
      `save: payload too large (${bytes} bytes, max ${MAX_DATA_BYTES})`,
    );
  }
}
