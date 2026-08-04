# create-opencraft-app

<p align="center">
  <strong>The Official Scaffolding Tool for OpenCraft Next.js Applications</strong>
</p>

`create-opencraft-app` allows developers and AI coding agents to rapidly scaffold modular, security-first Next.js (App Router, TypeScript strict mode, Tailwind CSS, and shadcn/ui) projects with pre-configured component architectures, authentication providers, storage adapters, and pre-built features.

---

## Quick Start

### Interactive Scaffolding

```bash
npx create-opencraft-app my-app
```

### Non-Interactive Command (Automated / CI)

```bash
npx create-opencraft-app my-app \
  --architecture hybrid \
  --backend supabase \
  --auth google \
  --storage vercel-blob \
  --modules dashboard,image-upload,crud-example \
  --package-manager pnpm \
  --yes
```

---

## Command Flags & Options

| Option | Values | Description |
| --- | --- | --- |
| `--architecture` | `hybrid`, `feature`, `atomic` | Choose component architecture layout |
| `--backend` | `none`, `supabase`, `firebase` | Select backend provider |
| `--auth` | `none`, `google` | Enable Google OAuth authentication |
| `--storage` | `none`, `vercel-blob`, `supabase`, `firebase` | Select storage adapter |
| `--modules` | Comma-separated list | Specify initial modules to install |
| `--package-manager` | `pnpm`, `npm`, `yarn`, `bun` | Set target package manager |
| `--dry-run` | Flag | Preview generated file structure without writing |
| `--yes` | Flag | Skip prompts and accept defaults |
| `--no-install` | Flag | Skip automatic dependency installation |
| `--no-git` | Flag | Skip git repository initialization |
| `--help` | Flag | Show CLI help details |
| `--version` | Flag | Show CLI version |

---

## What Gets Generated?

1. **Next.js App Router Setup**: Fully configured with TypeScript strict mode, Tailwind CSS, and shadcn/ui primitives.
2. **Selected Component Architecture**: Directory structures for `hybrid`, `feature`, or `atomic` layouts.
3. **Selected Provider Adapters**: Provider infrastructure code for Supabase or Firebase Auth & Storage in `src/infrastructure/`.
4. **Initial Registry Modules**: Pre-configured features (e.g. `image-upload`, `crud-example`, `dashboard`, `ssrf-protection`).
5. **Project Config File**: `opencraft.config.json` tracking installed module versions and checksums.
6. **AI Assistant Guidelines**: `AGENTS.md` in root directory providing clear rules for AI coding assistants.

---

## Next Steps After Scaffolding

Once your project is created:

```bash
cd my-app

# Start dev server
pnpm run dev

# Add more modules anytime
npx opencraft add storage

# Run diagnostics
npx opencraft doctor
```

---

## License

[MIT](https://github.com/Lelianto/create-opencraft-app/blob/main/LICENSE)
