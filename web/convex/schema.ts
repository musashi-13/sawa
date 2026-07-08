import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Each signed-in user gets their own SawaData document, keyed by their Clerk
// user id (identity.subject). `userId` is optional only so the pre-auth M2
// document doesn't fail validation — every new document is written with it.
export default defineSchema({
  documents: defineTable({
    userId: v.optional(v.string()),
    data: v.any(),
  }).index("by_user", ["userId"]),
});
