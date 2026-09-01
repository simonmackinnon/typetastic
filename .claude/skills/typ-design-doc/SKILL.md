---
name: typ-design-doc
description: Turn a feature request for TypeStar into an architecture design (with diagrams) published to Confluence. Use when the user asks to build, add, or design a new feature or significant change for this project, before any Jira tickets exist for it.
---

# typ-design-doc

Produces an architecture design for a feature and publishes it to Confluence as the source of truth that `typ-breakdown` will later split into Jira tickets.

## Steps

1. **Clarify scope.** If the request is ambiguous on user-facing behaviour, data model changes, or which layers it touches (React components/context, Cognito auth flows, API Gateway/Lambda/DynamoDB, level/badge content, infra), ask before writing the doc. Don't guess a design the user didn't ask for.
2. **Write the design doc** covering:
   - Problem/goal in 2-3 sentences.
   - Components affected (map to real paths: `src/components/`, `src/context/`, `src/data/levels.ts`, `src/data/badges.ts`, `src/services/api.ts`, `src/services/auth.ts`, `lambda/`, `infra/`).
   - Data flow / sequence for any new interaction.
   - New or changed API surface (API Gateway routes, DynamoDB items under the `tt-user-data` single-table design, Cognito attributes) if applicable.
   - Non-functional notes: auth/security implications (flag anything touching the Cognito SRP or Google OAuth/PKCE flow in `services/auth.ts`), performance, and test impact — this project already has Vitest unit tests, Playwright E2E, and a PR-triggered CI gate, so name what needs extending rather than treating testing as a future concern.
3. **Generate diagrams.** The connected Atlassian MCP tools have no attachment/media upload method, so rendered PNGs can't be attached, and `language-mermaid` code blocks fail to render on this site (confirmed broken on sibling KCR/BNM setups — don't retry that path). Build diagrams natively in Confluence HTML: `<section data-type="layout-two-equal">`/`layout-three-equal` + `panel-*` divs for splits, plain `<ol>` for sequences. Keep Mermaid source (if wanted) in a `language-text` code block, never `language-mermaid`.
4. **Publish to Confluence** via the `atlassian` MCP tools:
   - Page title: `[TypeStar] <Feature Name> — Design`
   - Parent: "TypeStar Engineering" (space key `TYP`)
   - If a page for this feature already exists, update it in place rather than creating a duplicate — search first.
5. **Report back** with the Confluence page URL and a short summary. Don't proceed to ticket creation automatically — wait for the user to confirm the design before handing off to `typ-breakdown`.
