// Tells Convex to accept Clerk-issued JWTs. `CLERK_JWT_ISSUER_DOMAIN` is set per
// deployment (`npx convex env set CLERK_JWT_ISSUER_DOMAIN <issuer-url>`, or the
// dashboard); `applicationID` matches the Clerk JWT template name ("convex").
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;

// Fail loudly at deploy time rather than silently at runtime. With this unset,
// Convex rejects every token: `getUserIdentity()` returns null, reads look like
// an empty account, and writes throw "Not authenticated" — which is
// indistinguishable from data loss, and cost a full day of debugging once. A
// failed deploy is far easier to diagnose than silent auth failure.
//
// It must be the ISSUER URL (e.g. https://clerk.sawaflow.dev), not the JWKS
// URL — pointing it at /.well-known/jwks.json is exactly how this broke before.
if (!domain) {
  throw new Error(
    "CLERK_JWT_ISSUER_DOMAIN is not set for this Convex deployment. Set it to " +
      "the Clerk issuer URL, e.g. `npx convex env set CLERK_JWT_ISSUER_DOMAIN " +
      "https://clerk.example.com` (add --prod for production).",
  );
}

export default {
  providers: [{ domain, applicationID: "convex" }],
};
