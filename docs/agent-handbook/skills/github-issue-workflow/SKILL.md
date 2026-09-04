---
name: github-issue-workflow
description: How to track work on a GitHub issue in the brf2 repo — comment on the issue before starting work, assign it, link every branch/commit/PR back to it, and close it with a final comment. Activate whenever a task references a GitHub issue, milestone, or PR; before creating any branch; whenever a commit message mentions `(#NN)`.
---

# GitHub issue workflow

Goal: a single click on any issue/PR shows the full lifecycle — who started, what was tried, which branches/PRs are involved, what's blocked, what shipped.

## When this fires

Any of:
- User mentions a GitHub issue/milestone/PR number or URL.
- A task touches an open issue in `mirkanu/brf2`.
- You're about to create a branch, commit, or PR.

## Lifecycle (do these in order)

1. **Read the issue first.** `gh issue view <N> --repo mirkanu/brf2` — title, body, comments, linked PRs. Confirm the scope and acceptance criteria before touching code.

2. **Assign it.** `gh issue edit <N> --repo mirkanu/brf2 --add-assignee mirkanu`. Sole-owner repos: assign to the user (mirkanu) so the avatar shows on the issue card.

3. **Comment "starting".** Single short message before any code:
   ```
   gh issue comment <N> --repo mirkanu/brf2 --body "Starting on a fix- branch. Plan: <one line>. Will post the preview URL when the first build is up."
   ```

4. **Branch + commit message conventions.**
   - Branch prefix encodes workstream: `fix/`, `feat/`, `chore/`. Include the issue number in the branch name when one issue maps cleanly to it: `fix/amp-in-titles-3`.
   - Commit messages reference the issue: `fix(WS1): decode HTML entities in article titles (#3)`.

5. **Open a PR as soon as the branch is pushed.** Even if work continues. `gh pr create --repo mirkanu/brf2 --head <branch> --base main --title "<scope>: <what> (#N)" --body "Closes #N" --draft`. Draft is fine. Cloudflare Pages auto-builds the branch and the PR surfaces the preview URL.

6. **Comment with the preview URL on the issue** (not just the PR):
   ```
   gh issue comment <N> --repo mirkanu/brf2 --body "Preview: https://<branch>.brf2.pages.dev/"
   ```
   Repeat after every iteration the user is asked to review.

7. **On close**, comment on the issue with what shipped and any deferred sub-items. If anything is parked, file a follow-up issue (see references/follow-up-issues.md) and reference it from the close comment.

## What NOT to do

- Don't start coding before reading the issue. The body almost always has scope hints the title doesn't.
- Don't close an issue via commit message alone — issue state must change explicitly (`gh issue close` or a `Closes #N` in a merged PR).
- Don't use `gh pr merge` for milestone work — this project merges the milestone as one final squash after every workstream's preview is approved, not per-PR.
- Don't post the same comment on PR and issue. The PR is the technical record; the issue is the user-facing record. Keep them separate.

## Verification

Before yielding back to the user after any GitHub action:
- Run `gh issue view <N> --repo mirkanu/brf2 --comments` and confirm the new comment is visible.
- Run `gh pr list --repo mirkanu/brf2 --head <branch>` and confirm the PR exists with the expected state.
