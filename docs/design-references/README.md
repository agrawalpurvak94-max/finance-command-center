# Design References

Three `DESIGN.md` files pulled from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md), matching the exact aesthetic CLAUDE.md names as the target: **Stripe Dashboard + Linear + Notion**.

## What these actually are

Despite the name, this is **not** a Claude Code skill or plugin — it's a curated collection of markdown documents with extracted/AI-analyzed design tokens (colors, type, spacing, component styling) for real brands. There is nothing to "install"; the intended workflow is to keep the file as a reference and point an AI agent at it when building UI in that visual style.

Per the source repo's own license note: these are **independent analyses of publicly visible CSS values**, not official brand assets, and make no claim of ownership over any site's visual identity. Treat them as inspiration/reference, not as pixel-exact brand specs.

## Files

| File               | Source                           | Note                                                                                                                                                                                                                                                             |
| ------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stripe/DESIGN.md` | `design-md/stripe/DESIGN.md`     | Internally titled "Stripi-Inspired-design-analysis" in the source repo (the only one of the three not using the literal brand name) — flagging this as-is rather than silently renaming it, in case that naming choice was deliberate on the source repo's part. |
| `linear/DESIGN.md` | `design-md/linear.app/DESIGN.md` | Titled "Linear-design-analysis".                                                                                                                                                                                                                                 |
| `notion/DESIGN.md` | `design-md/notion/DESIGN.md`     | Titled "Notion-design-analysis".                                                                                                                                                                                                                                 |

## How to use

When implementing a module's UI (starting with Module 1, Application Shell), these are reference material for tone/color/type/spacing decisions — not a replacement for CLAUDE.md's own UI Design Principles (Part 2), which remain the authoritative spec for this project. Where they conflict, CLAUDE.md wins.
