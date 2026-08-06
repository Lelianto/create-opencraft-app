---
"@antihero/registry": patch
"@antihero/cli": patch
---

feat: add the auth-pages module and include it in the saas and app-mobile-api presets

- New `auth-pages` module: a working sign-in page (`/auth/signin`) that renders the provider's `GoogleSignIn` and redirects authenticated visitors to the app, plus a backend-specific `SignOutButton`.
- Add the module to the `saas` and `app-mobile-api` presets so auth-enabled projects ship with a functional login/logout loop.