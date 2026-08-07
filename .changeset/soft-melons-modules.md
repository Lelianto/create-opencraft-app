---
"create-opencraft-app": minor
"@antihero/cli": minor
"@antihero/registry": minor
---

feat: machine-readable module contracts, deployment modules, and Living Context (LCDD) integration

- Add `exports` (public API contract) and `governance` (owner/classification/lifecycle) metadata to the module manifest schema, populate it across all modules, and enforce it in `scripts/validate-registry.mjs`.
- Surface the contract in the CLI: `opencraft info <module>` shows exports + governance, and `opencraft list --json` emits resolved export paths for every module for AI agents.
- Add `deploy-docker` module: multi-stage standalone `Dockerfile`, `.dockerignore`, and `compose.yaml` with healthcheck.
- Add `deploy-vercel` module: `vercel.json` + a PR preview workflow (type-check, lint, test, build).
- Add the `self-hosted` preset (full SaaS packaged for Docker) and include `deploy-vercel` in the `saas` preset.
- Set `output: "standalone"` in the base `next.config.ts` so generated projects are deployable as a standalone server or container.
- Extend the `generated-apps` CI matrix with the `self-hosted` preset.
- Document opencraft-skills and LCDD (how they govern generated projects) and the machine-readable module contract in the README.
