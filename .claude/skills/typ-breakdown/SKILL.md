---
name: typ-breakdown
description: Break an approved TypeStar design doc into a Jira Epic with child Stories/Tasks/Bugs, each with acceptance criteria and a test plan. Use after a typ-design-doc has been written and confirmed, before starting implementation work.
---

# typ-breakdown

Converts a confirmed design (from `typ-design-doc`, or a design pasted directly by the user) into Jira issues that `typ-work-ticket` will later execute one at a time.

## Steps

1. **Locate the design.** Use the Confluence page from `typ-design-doc` if one exists (search for it); otherwise take the design as given in the conversation.
2. **Create the Epic** in the `TYP` project:
   - Title: the feature name.
   - Description: short summary + link to the Confluence design page.
3. **Break the work into child issues** (Story/Task/Bug — Bug only for fixing existing broken behaviour). Keep each one small enough to land as a single PR. For each:
   - Clear acceptance criteria (bullet list, testable).
   - A **Test Plan** section stating which of Unit / Integration / E2E-UI / Regression apply, per the rules in `CLAUDE.md`, and *what* each should verify. This project already has Vitest and Playwright set up — tickets should extend existing suites, not stand up new tooling.
   - Component/label matching the affected area (`auth`, `api`, `game`, `levels`, `badges`, `infra`).
   - Link to the parent Epic.
4. **Order matters** — if a ticket depends on another, set a Jira "blocks/is blocked by" link so `typ-work-ticket` picks them up in the right order.
5. **Verify the board workflow** the first time this runs: confirm `To Do` exists as the initial status for new issues. If this board lacks it (as the sibling KCR board originally did), flag it to the user rather than silently working around it.
6. **Report back** a table of created tickets (key, title, type, links) and the Epic link. Don't start implementation from this skill — that's `typ-work-ticket`'s job, invoked separately (typically via `/loop`).

Before creating anything, if more than ~8 child issues would result from one design, check with the user whether they want it split into more than one Epic.
