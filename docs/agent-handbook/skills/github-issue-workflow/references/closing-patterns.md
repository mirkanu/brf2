# Closing & referencing patterns

## When to use `Closes` vs `Refs`

- `Closes #N` — issue is fully resolved by this PR.
- `Refs #N` — PR touches the same area but doesn't resolve the issue (partial work, follow-up still needed).
- `Fixes #N` — synonym for `Closes`, prefer `Closes` for consistency.

Multiple references: `Closes #3, Closes #6` in a single PR body works when one PR resolves multiple issues.

## Squash-merge vs merge-commit

This repo uses squash-merge by default. That means **all of the PR's commits collapse into one commit message on `main`**. The `(#N)` reference must be in the squash commit message OR in the PR body for auto-close to fire.

To be safe:
1. Reference `(#N)` in **every** commit message on the branch.
2. Reference `Closes #N` in the **PR body** (not just the title).
3. The squash commit's message (which you write during the squash-merge UI) should also contain `(Closes #N)`.

## Branch deletion

After a branch merges, delete the remote branch (`gh pr merge --delete-branch`). Local cleanup:

```bash
git fetch --prune
git branch -d <branch>
```

## Issue edit history

GitHub shows all label, assignee, and milestone changes in the issue timeline. Comments are the only place to write prose context — use them for "what I did" and "what the user said". Use labels for state transitions only.

## What comments look like in the timeline

| Event | Where |
| --- | --- |
| Issue filed | Issue header shows open date |
| Self-assigned | Timeline shows "user added themselves as assignee" |
| Labelled | Timeline shows each label add/remove |
| Branch referenced | Comment mentions `branch-name` |
| PR opened | Timeline shows cross-reference |
| PR merged | Issue auto-closes; timeline shows "closed by commit <sha>" |
| Manual close | Timeline shows who closed it + closing comment |
