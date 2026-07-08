import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// The signed-in user's SawaData document. Both functions require authentication
// and are scoped to the caller's Clerk user id, so users only ever see and
// write their own data.

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const doc = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    return doc?.data ?? null;
  },
});

export const save = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { data });
    } else {
      await ctx.db.insert("documents", { userId, data });
    }
  },
});
