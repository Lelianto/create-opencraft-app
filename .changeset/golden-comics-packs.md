---
"create-opencraft-app": minor
"@antihero/cli": minor
---

feat: bump opencraft-skills to 1.3.0 and apply Living Context (LCDD) in generated projects

- Require `opencraft-skills@1.3.0` in every generated project.
- Change the `postinstall` to `opencraft-skills install --target all --with-project-files` so every generated project bootstraps the baseline `core-pack` and materializes the `.lcdd/` Context Registry (contexts, project knowledge, merged AI rules) plus `packs.yaml`.
- Document the LCDD workflow — extending `packs.yaml` with `npx opencraft-packs packs add`, re-materializing with `packs install`, and committing `.lcdd/` — in the generated-project README.
