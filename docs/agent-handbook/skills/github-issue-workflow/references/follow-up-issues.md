---
name: follow-up-issues
description: How to file a follow-up GitHub issue when a piece of work is parked, deferred, or out of scope of the current branch.
---

# Follow-up issues

When you finish a workstream and discover something else that needs doing, file it as a separate issue before closing the current one. Don't stuff unrelated scope into the closing PR.

## When to file

- A sub-task is out of scope for the current milestone but should not be forgotten.
- A bug is fixed in one place but the same pattern exists elsewhere (e.g. 32 slugs — fix 1 here, file #6 for the rest).
- A workaround is shipped; the real fix needs design discussion.

## Template

```
gh issue create --repo mirkanu/brf2 \
  --title "<short verb phrase>" \
  --body "Follow-up to #<parent>. <what's blocked or deferred and why>.

Acceptance:
- <bullet>
- <bullet>" \
  --label enhancement
```

Use `--assignee mirkanu` for solo work. Add `--label bug` if it's a regression you discovered.

## Cross-link from the parent

When you close the parent issue/PR, include the new issue number in the close comment:

> Closed via #<parent>. Deferred sub-items: #<followup>.

## Don't

- Don't create an issue for trivial 1-line fixes — just fix them in the current branch.
- Don't create follow-ups for things you're going to do in the next 5 minutes — file when you actually close the parent.
