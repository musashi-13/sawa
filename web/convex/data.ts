import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// The single SawaData document. `get` returns null when nothing has been saved
// yet (first run); the client then seeds it. `save` upserts the whole blob.

export const get = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("documents").first();
    return doc?.data ?? null;
  },
});

export const save = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const existing = await ctx.db.query("documents").first();
    if (existing) {
      await ctx.db.patch(existing._id, { data });
    } else {
      await ctx.db.insert("documents", { data });
    }
  },
});
