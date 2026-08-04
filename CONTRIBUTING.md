# Contributing to OpenCraft

Thank you for your interest in contributing to OpenCraft!

## Workflow

1. Fork and clone the repository.
2. Install dependencies with `pnpm install`.
3. Create a feature branch (`git checkout -b feature/my-new-module`).
4. Implement your changes following TypeScript strict mode and ESLint rules.
5. Add test coverage under `packages/*/test`.
6. Run verification commands:

```bash
pnpm run verify
npm run registry:validate
npm run pack:check
```

7. Submit a pull request.

## Adding a New Module to Registry

To add a new module to `registry/modules/<module-name>`:

1. Create a `module.json` manifest following `registry/schemas/module.schema.json`.
2. Add template files for supported architectures (`atomic`, `feature`, `hybrid`).
3. Ensure any external input is validated with Zod on the server.
4. Run `npm run registry:validate` to ensure your manifest passes validation.
5. Add an integration test in `packages/cli/test/integration.test.ts`.
