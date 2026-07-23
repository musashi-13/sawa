import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { assertSawaData } from "./validate";

// The signed-in user's SawaData document. Everything is scoped to the caller's
// Clerk user id, so users only ever see and write their own data.

/**
 * Resolve this user's document deterministically. `.first()` alone is ambiguous
 * if duplicates ever exist (nothing enforces one-row-per-user), and reads could
 * then flip between rows. Always resolving to the highest revision — oldest as
 * the tie-break — keeps reads and writes agreed on the same row.
 */
async function findDoc(ctx: QueryCtx | MutationCtx, userId: string) {
  const docs = await ctx.db
    .query("documents")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (docs.length <= 1) return docs[0] ?? null;
  return [...docs].sort(
    (a, b) => (b.rev ?? 0) - (a.rev ?? 0) || a._creationTime - b._creationTime,
  )[0];
}

/**
 * Legacy read. Kept because a service worker can keep an older build alive in
 * someone's browser for a while, and those clients subscribe to this. It can't
 * distinguish "signed out" from "no data" — current clients use `getState`.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const doc = await findDoc(ctx, identity.subject);
    return doc?.data ?? null;
  },
});

/**
 * The read current clients use. Unlike `get`, it separates "your token was not
 * accepted" from "this account has no data yet" — collapsing those into a bare
 * `null` is what once let a client mistake a rejected token for an empty
 * account and seed over real data. Also returns `rev`, so writes can be ordered.
 */
export const getState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { authed: false, data: null, rev: 0 };
    const doc = await findDoc(ctx, identity.subject);
    return { authed: true, data: doc?.data ?? null, rev: doc?.rev ?? 0 };
  },
});

export const save = mutation({
  args: { data: v.any(), baseRev: v.optional(v.number()) },
  handler: async (ctx, { data, baseRev }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    assertSawaData(data);

    const userId = identity.subject;
    const existing = await findDoc(ctx, userId);
    const currentRev = existing?.rev ?? 0;

    // Staleness guard. A client that tells us which revision it worked from
    // must not overwrite a newer one. `baseRev === undefined` means a client
    // predating revisions — allow it rather than break it. The current revision
    // is reported back either way, so a caller that loses a race can catch up
    // instead of being wedged into permanent conflict.
    if (existing && baseRev !== undefined && baseRev < currentRev) {
      return { ok: false as const, conflict: true as const, rev: currentRev };
    }

    const rev = currentRev + 1;
    const updatedAt = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { data, rev, updatedAt });
    } else {
      await ctx.db.insert("documents", { userId, data, rev, updatedAt });
    }
    return { ok: true as const, conflict: false as const, rev };
  },
});
