// Tells Convex to accept Clerk-issued JWTs. `CLERK_JWT_ISSUER_DOMAIN` is set in
// the Convex dashboard (Settings → Environment Variables) for each deployment;
// `applicationID` matches the Clerk JWT template name ("convex").
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
