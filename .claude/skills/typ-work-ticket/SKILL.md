---
name: typ-work-ticket
description: Pick up the next available TypeStar Jira ticket, implement it with the checks its test plan requires, open a PR, and update Jira/Confluence — or mark it Blocked and notify. Designed to be invoked once per /loop iteration to work through the backlog. Use when the user says to start working tickets, resume the loop, or work the next task.
---

# typ-work-ticket

Executes exactly one ticket per invocation, so it composes cleanly with `/loop` (each loop iteration = one ticket, or one blocked/no-op check).

## Steps

1. **Find the next ticket.** Query the `TYP` project for issues in `To Do`, excluding any already flagged `Impediment` and respecting any "is blocked by" links, ordered by rank/priority.
   - **Nothing available:** report the backlog is clear and stop — don't invent work. If invoked inside `/loop`, say so explicitly so the loop can end rather than spin.
2. **Claim it.** Transition the ticket to `In Progress`.
3. **Read full context**: ticket description, acceptance criteria, test plan, and the linked Confluence design page.
4. **Implement** on a new branch named `<ticket-key>-<short-slug>`. Keep the change scoped to the ticket — don't fold in unrelated cleanup.
5. **Write/update checks** per the ticket's Test Plan section exactly, extending the existing Vitest (`src/**/*.test.{ts,tsx}`) and Playwright (`tests/e2e/*.spec.ts`) suites rather than introducing new tooling. For a Bug ticket, the regression check must be shown failing against the pre-fix code first.
6. **Run the full local gate**: `npm test` (unit), `npm run test:e2e` if the plan calls for it, `npm run build`. All must pass before proceeding — do not transition the ticket on partial success.
7. **On local failure you can't resolve** after a genuine attempt: commit what exists as WIP on the branch, comment the specific blocker on the ticket (what failed, what you tried), set the issue's **Flagged** field to `Impediment`, send a push notification, and stop — move to the next loop iteration rather than looping on the same failure indefinitely.
8. **On local success:** push the branch and open a PR (`gh pr create`) referencing the ticket key. Poll `gh pr checks` (e.g. `gh pr checks <n> --watch`) until `ci.yml`'s three jobs (`unit-tests`, `e2e-tests`, `build-check`) all report a result — don't assume it'll pass.
   - **CI red:** same as step 7 — comment the specific failure, flag as `Impediment`, notify, stop.
   - **CI green:** transition the ticket to `In Review`. Still **never merge the PR yourself** — merging to `main` is equivalent to a prod release on this repo (`deploy.yml` fires on push to `main` with no separate approval step), so that decision stays with the user regardless of CI status.
9. **Document.** Append one line to the Confluence changelog page (ticket key, summary, PR link, date) and post the same summary as a Jira comment.
10. **Return control** — report what ticket was worked, its new status, and the PR link, then let the loop continue to the next iteration.

Never skip step 6 to save time, and never transition a ticket past `In Progress` on assumed rather than observed results. Never merge a PR from within this skill.
