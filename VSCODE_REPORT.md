# VSCODE_REPORT.md

Bootstrap Phase 4 — VS Code Extensions

Generated: 2026-07-30

VS Code version: 1.131.0

---

## Already present (not touched)

| Extension                                      | ID                                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Claude Code                                    | `anthropic.claude-code`                                                                             |
| Python (unrelated to this project, left as-is) | `ms-python.python`, `ms-python.debugpy`, `ms-python.vscode-pylance`, `ms-python.vscode-python-envs` |
| PDF viewer (unrelated, left as-is)             | `tomoki1207.pdf`                                                                                    |

## Installed this session (Required, per PROJECT_BOOTSTRAP.md Phase 8)

| Extension                 | ID                                                                                                | Version installed | Why required                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                    | `dbaeumer.vscode-eslint`                                                                          | 3.0.34            | CLAUDE.md's Code Review Checklist requires "Lint clean" before every commit — this surfaces it in-editor.                                                                                                                                |
| Prettier                  | `esbenp.prettier-vscode`                                                                          | 12.4.0            | Formatting consistency mandated throughout Coding Standards.                                                                                                                                                                             |
| Tailwind CSS IntelliSense | `bradlc.vscode-tailwindcss`                                                                       | 0.16.0            | CLAUDE.md mandates Tailwind + an 8px spacing scale + design tokens — autocompletes/validates class names against the actual v4 theme.                                                                                                    |
| GitLens                   | `eamodio.gitlens`                                                                                 | 18.3.0            | Git Workflow (Part 6) uses feature branches and a strict commit-prefix convention — GitLens surfaces blame/history inline.                                                                                                               |
| Error Lens                | `usernamehw.errorlens`                                                                            | 3.28.0            | Surfaces TS/ESLint errors inline, speeding up the "TypeScript passes / Lint clean" gate.                                                                                                                                                 |
| Path Intellisense         | `christian-kohler.path-intellisense`                                                              | 2.10.0            | Convenience for the deep `pages/components/hooks/services/types` folder structure.                                                                                                                                                       |
| npm Intellisense          | `christian-kohler.npm-intellisense`                                                               | 1.4.5             | Autocompletes imports across the large dependency list in package.json.                                                                                                                                                                  |
| Material Icon Theme       | `pkief.material-icon-theme`                                                                       | 5.37.0            | Visual folder/file differentiation across the deep structure.                                                                                                                                                                            |
| Docker                    | `ms-azuretools.vscode-docker` (pulled in `ms-azuretools.vscode-containers` 2.4.5 as a dependency) | 2.0.0             | Docker was verified present on this machine (29.6.1); this extension surfaces container tooling in-editor if it's used later.                                                                                                            |
| Supabase                  | `supabase.vscode-supabase-extension`                                                              | 0.0.13            | Official schema/migration/table inspection UI. Note: its richest features are built around a GitHub Copilot chat participant, which isn't in use here — the schema/table/migration-history inspection panels work standalone regardless. |

## Installed this session (Recommended, per PROJECT_BOOTSTRAP.md Phase 8)

| Extension                 | ID                                    | Version installed | Why                                                                  |
| ------------------------- | ------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| TODO Tree                 | `gruntfuggly.todo-tree`               | 0.0.226           | CLAUDE.md forbids unapproved TODOs — this surfaces any that slip in. |
| Markdown Preview Enhanced | `shd101wyy.markdown-preview-enhanced` | 0.8.30            | For reviewing CLAUDE.md/PROJECT_BOOTSTRAP.md/reports comfortably.    |

## Verification

All 12 installs reported `was successfully installed` with no errors. No extension was already present under a conflicting version, so nothing was skipped or overwritten.
