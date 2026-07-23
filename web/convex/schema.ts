import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Each signed-in user gets exactly one SawaData document, keyed by their Clerk
// user id (identity.subject).
//
// `userId` stays optional ONLY because a pre-auth (M2-era) document without one
// still exists in the dev deployment; requiring it fails schema validation and
// blocks every deploy. It is not a correctness hole in practice: every write
// path sets `userId`, so no new orphan can be created, and a row without one is
// simply unreachable through the index. Tighten this to `v.string()` once that
// legacy row is removed.
//
// `rev` is a monotonic revision counter. Every write declares the revision it
// was based on, and the server refuses a write built on an older one — so a
// stale tab, or a device coming back from offline, can't overwrite newer data
// with its outdated snapshot. Optional because documents written before
// revisions existed don't have one; those are treated as rev 0.
//
// `updatedAt` is for debugging/auditing only; nothing reads it.
export default defineSchema({
  documents: defineTable({
    userId: v.optional(v.string()),
    data: v.any(),
    rev: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
});
