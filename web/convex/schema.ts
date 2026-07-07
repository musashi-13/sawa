import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// M2 (sync) stores the entire SawaData blob in a single-row `documents` table.
// This is the minimal change that keeps the existing blob-based `Store`
// interface — and therefore `useSawa` and the whole component tree — untouched.
// Granular per-record tables + `updatedAt` reconciliation are a future
// refinement (the ids/timestamps are already in the data model for it).
export default defineSchema({
  documents: defineTable({
    data: v.any(),
  }),
});
