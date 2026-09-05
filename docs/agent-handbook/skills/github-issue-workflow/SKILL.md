---
name: github-issue-workflow
description: Pointer to the canonical GitHub workflow skill. Use that one — it lives outside the brf2 repo because it is repo-agnostic. This file only records brf2-specific conventions that override or supplement the canonical skill.
---

# GitHub issue workflow (brf2-specific notes)

The canonical, repo-agnostic skill lives at:

```
/home/workspace/Skills/github-workflow/SKILL.md
```

Read it first — it covers the full lifecycle (comment-on-start, claim the issue, branch/commit link, PR with `Closes #N`, comment-on-finish, milestone wiring, label hygiene, partial-work follow-ups, anti-patterns).

This file only adds what is **specific to the brf2 repo**:

## brf2 conventions (override or extend the canonical skill)

- **Assignee.** The brf2 repo is a sole-owner repo. Always assign issues to `mirkanu` (not "me", not the agent handle). The user wants the avatar visible on the issue card.
- **PR draft on first push.** Open the PR as `--draft` as soon as the branch is pushed. Cloudflare Pages auto-builds and surfaces the preview URL on the PR. The canonical skill recommends opening a PR early; brf2 uses drafts specifically so PRs accumulate preview URLs while work continues.
- **Comment with the preview URL on the issue, not just the PR.** The user reviews via issue comments — PRs are the technical record but issues are the user-facing record. Repeat after every iteration the user is asked to review.
- **Milestone merge is one squash.** Don't `gh pr merge` per-workstream. The brf2 workflow is: each workstream ships a preview, the user approves each preview, then a single final squash merges the milestone to `main`. The canonical skill's "One PR per logical change" rule is honoured, but merge cadence is milestone-batched.
- **Don't close without user confirmation.** Even if the fix is implemented and pushed, even if it "looks done", even if the user said "approved" about a different issue — wait for an explicit "close #N" or equivalent per-issue confirmation. Reopen with a comment if closed by mistake.
- **Double-check the issue number before commenting or closing.** A fix for issue #5 goes on #5, not #4 — even if #4 was worked on earlier in the same branch. Before any `gh issue comment <N>` or `gh issue close <N>`, confirm `<N>` matches the issue the work actually addressed.

## Verification (brf2-specific)

After any GitHub action, before yielding back to the user:

- `gh issue view <N> --repo mirkanu/brf2 --comments` — confirm the new comment is on the right issue with the right number.
- `gh pr list --repo mirkanu/brf2 --head <branch>` — confirm the PR exists in the expected state (draft/open/merged).
- If a milestone is involved: `gh api repos/mirkanu/brf2/milestones --jq '.[] | {number, title, open_issues, closed_issues}'` to confirm progress is reflected.
