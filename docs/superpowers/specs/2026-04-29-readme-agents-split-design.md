# README / AGENTS Split Design

## Goal

Split the current root documentation into:

- `README.md` for users, deployers, and developers who need a project entry point
- `AGENTS.md` for workspace-wide agent instructions that should stay concise and actionable

## Problem

The current `AGENTS.md` mixes two roles:

- project overview and operational documentation
- agent-specific instructions

That makes the file too long for always-on guidance and duplicates content that is better surfaced through docs.

## Chosen Approach

Use a two-file split:

1. Move project overview, commands, architecture summary, rain-alert overview, and doc links into `README.md`.
2. Reduce `AGENTS.md` to high-signal instructions for coding agents: architecture boundaries, key conventions, validation commands, and doc entry points.

## README Scope

`README.md` should target users and deployers first, while still giving a short developer entry point.

It should include:

- what the project is and its main value proposition
- core features
- stack summary
- quick start and local development commands
- build and run commands
- Web Push deployment entry points
- high-level project structure
- links to detailed docs

It should not duplicate low-level implementation details that already live in docs.

## AGENTS Scope

`AGENTS.md` should include only instructions that are relevant to most coding tasks in this repo:

- architecture boundaries (`src/`, `server/`, `shared/`)
- project-specific conventions (no SvelteKit, weather API proxy conventions, server-side rain alerts)
- validation guidance after edits
- links to more detailed docs when needed

It should not contain long narrative sections such as development history, full deployment instructions, or exhaustive API walkthroughs.

## Validation

There is no executable validation specific to Markdown docs here, so validation is limited to reviewing the resulting diff for scope and correctness.

## Notes

Do not create a git commit as part of this change.
