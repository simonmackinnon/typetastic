# TypeStar

Kids typing tutor SPA at typestar.theclouddevopslearningblog.com. React 18 + TypeScript + Vite 6 + Tailwind CSS 3, React Router v6, axios, `amazon-cognito-identity-js`. 20 levels across 6 zones (Keyboard Kingdom → Speed Summit) in `src/data/levels.ts`, badge system in `src/data/badges.ts`, TTS audio pre-generated at build time via ElevenLabs (`scripts/generate-audio.ts`). Cognito auth supports both SRP email/password and Google OAuth via Cognito Hosted UI. API Gateway (HTTP API, JWT authorizer) + a single Lambda (`lambda/handler.js`) + DynamoDB single-table (`tt-user-data`) backend, S3 (OAC, not public) + CloudFront hosting.

**Naming note:** the repo folder is `typetastic`, `package.json`'s name is `typestar` (the current product name), and the Lambda handler's own header comment still says "TypeTastic — API Lambda." Three names for one project — not worth reconciling as part of this workflow setup, just be aware when a ticket touches any of them.

- Package manager is **npm** (only `package-lock.json` present).
- Dev: `npm run dev` (Vite) · Build: `npm run build` (`tsc && vite build`) · Preview: `npm run preview`
- Unit tests: `npm test` (Vitest run) / `npm run test:watch` / `npm run test:coverage` — `jsdom` environment, `@testing-library/react`, setup file `src/test-setup.ts`. 6 spec files today (`useTypingGame`, `badges`, `levels`, `AuthModal`, `LevelMap`, `Keyboard`), ~50 cases.
- E2E tests: `npm run test:e2e` (Playwright, `tests/e2e/`: `auth.spec.ts`, `typing.spec.ts`) — CI runs Chromium only; local also runs Firefox + Mobile Chrome.
- **No ESLint/Prettier** — `npm run lint` is just `tsc --noEmit`. Don't assume a lint gate beyond type-checking exists.
- No `README.md` exists anywhere in the repo — this `CLAUDE.md` is the closest thing to onboarding docs.
- Infra: Terraform in `infra/` (Cognito incl. Google IdP, API Gateway HTTP API, Lambda, DynamoDB, S3+CloudFront with OAC, Route53/ACM). Lambda source in `lambda/handler.js`. **Known inconsistency**: `infra/lambda.tf` pins the Lambda runtime to `nodejs22.x`, but `lambda/handler.js`'s own header comment claims `nodejs24.x` — flag this if a ticket touches the Lambda runtime, don't silently pick one.
- CI/CD: GitHub Actions.
  - `ci.yml` — **pull_request-triggered**, runs on every PR (and push) to every branch: `unit-tests` (type-check + `test:coverage`), `e2e-tests` (Playwright against a stub-env build, fake Cognito/API values), `build-check` (full prod build with real secrets, asserts `dist/index.html` exists). This is the PR gate `work-ticket` polls.
  - `deploy.yml` — push to `main` only. Runs unit tests (no coverage) as a pre-deploy gate, then `generate:audio` (calls ElevenLabs), builds, syncs to S3, invalidates CloudFront. **No separate approval step** — a direct push to `main` deploys regardless of whether `ci.yml` ran on a PR first.
  - `infra.yml` — push to `main` touching `infra/**`/`lambda/**`: `terraform apply` runs directly, no plan-only PR step.
  - `.github/dependabot.yml` and `.github/workflows/dependabot-auto-merge.yml` exist on disk but are **not yet committed** — auto-merge for patch/minor bumps isn't live until pushed.
  - **Merging a PR to main is a production deploy**, not just a merge — treat it accordingly, even though `ci.yml` already ran on the PR.

## Engineering workflow: Jira + Confluence automation

This project drives feature work through Jira tickets and a Confluence design doc, using the `typ-design-doc`, `typ-breakdown`, and `typ-work-ticket` skills in `.claude/skills/`. The Atlassian MCP server is configured in the workspace-root `.mcp.json`. Skills are prefixed `typ-` (rather than the bare `design-doc`/`breakdown`/`work-ticket` names used on sibling projects) because plain names have previously resolved to the wrong project's copy when multiple projects each had their own identically-named skill.

**Jira project key:** `TYP`
**Confluence space key:** `TYP`
**Confluence parent page:** "TypeStar Engineering" — design docs nest under this.
**Confluence changelog page:** "TypeStar — Changelog" (child of the Engineering page) — one row per completed ticket, newest first.

### Phase flow

1. `typ-design-doc` skill — turns a feature request into an architecture doc + diagrams, written to Confluence.
2. `typ-breakdown` skill — turns an approved design doc into a Jira Epic with child Stories/Tasks/Bugs, each carrying acceptance criteria and an explicit test plan.
3. `typ-work-ticket` skill — executed once per `/loop` iteration. Picks the next ticket, implements it, runs the required checks, opens a PR, polls `ci.yml`, updates the Confluence changelog, and transitions the ticket — or marks it Blocked and notifies if it can't proceed safely.

### Ticket conventions

- Types: Epic, Story, Task, Bug.
- Statuses: `To Do` → `In Progress` → `In Review` → `Done`, matching the convention used on the sibling `KCR`/`BNM` boards. **Verify this board's actual columns the first time `typ-breakdown` creates an issue** — not yet confirmed for this specific project.
- Every non-Epic ticket must have a **Test Plan** section stating which of the following apply:
  - **Unit** — required for changes to hooks/reducers/pure logic (`useTypingGame`, `context/ProgressContext.tsx`, `data/levels.ts`, `data/badges.ts`) and components with existing coverage patterns to follow (`AuthModal`, `LevelMap`, `Keyboard`). Vitest + Testing Library already exist — extend the pattern, don't stand up new tooling.
  - **Integration** — required for changes crossing the API Gateway ↔ Lambda ↔ DynamoDB boundary, or the `AuthContext`/`ProgressContext` ↔ `services/` boundary.
  - **E2E/UI** — required for anything touching routing, the typing-game flow, or auth (`tests/e2e/auth.spec.ts`, `tests/e2e/typing.spec.ts` already exist — extend them). A real harness exists here, unlike the sibling BNM/Blog projects — don't fall back to a manual-verification note when a Playwright test is the right tool.
  - **Regression** — required for all Bug tickets; the regression test must be shown failing against the pre-fix code and passing after.
- A ticket only moves past `In Progress` once: the checks named in its Test Plan pass locally (`npm test`, `npm run test:e2e` if applicable), `npm run build` succeeds, and the PR's `ci.yml` checks are green — poll `gh pr checks`, don't assume. A PR is then opened for human review and `typ-work-ticket` must **never merge its own PR**, CI-green or not — merging to `main` is a production deploy here too, and `ci.yml` passing on the PR doesn't change that.

### Blocked handling

If a ticket's requirement is ambiguous, a check can't be made to pass after reasonable attempts, or CI stays red after a fix attempt: leave the ticket in its current status, set the **Flagged** field to `Impediment` (verify the exact custom field id for this project — it was `customfield_10021` on BNM but may differ here), comment the specific blocker on the ticket, and send a push notification. Never guess past a genuine ambiguity or silently skip a failing check to force a transition.

### Documentation

After a ticket completes, append an entry to the Confluence changelog page (ticket key, one-line summary, PR link, date) and comment the same summary on the Jira ticket.
