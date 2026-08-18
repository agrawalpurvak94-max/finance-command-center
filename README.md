# Finance Command Center

Frontend for the Finance Command Center — see [CLAUDE.md](./CLAUDE.md) for the full architecture and engineering playbook, [docs/README.md](./docs/README.md) for the documentation index, and [docs/project/PROJECT_STATUS.md](./docs/project/PROJECT_STATUS.md) for current build status.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

## Scripts

| Command             | Purpose                               |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the Vite dev server             |
| `npm run build`     | Type-check and build for production   |
| `npm run lint`      | ESLint                                |
| `npm run format`    | Prettier (write)                      |
| `npm run test`      | Vitest unit/component tests           |
| `npm run test:e2e`  | Playwright end-to-end tests           |
| `npm run typecheck` | TypeScript project check with no emit |
