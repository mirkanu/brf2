---
name: github-issue-workflow
description: Pointer to the canonical, repo-agnostic GitHub workflow skill. The canonical skill lives outside the brf2 repo on purpose — read it from the path below.
---

# GitHub issue workflow

This file is a pointer, not a copy. The canonical skill — repo-agnostic, applies to any GitHub repo the agent works on with this user — lives at:

```
/home/workspace/Skills/github-workflow/SKILL.md
```

Read that file. It covers the full lifecycle (comment-on-start, claim the issue, branch/commit link, PR with `Closes #N`, comment-on-finish, milestone wiring, label hygiene, partial-work follow-ups, anti-patterns), plus the agent + sole-owner collaborator rules (assignee, draft PRs, preview URL on the issue, milestone squash merge, no close without confirmation, double-check the issue number).

Why the pointer and not a copy: the canonical skill is a workspace asset (it lives in `/home/workspace/Skills/`), not a brf2-specific artefact. Any change to how we use GitHub together belongs in one place. Mirroring it here would invite drift.
