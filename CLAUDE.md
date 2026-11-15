<!-- coding-studio:begin -->
## coding-studio
- Config: `.studio/project.json` (commands, protected_paths, gated_commands, m2_triggers) and, if present, `.studio/modules.json` (modules, locks). Do not edit them or the checks to make a verification pass; only the owner locks or unlocks a module.
- For ANY coding task here (implement, fix, refactor, debug, review, release) invoke the `coding-studio` skill first and follow it as Lead: classify small vs complex, work on branch `cs/<task-id>`, subagents as `coding-studio:<name>`, work files in `work/<task-id>/`.
- Check `git status` before starting; builders work in `.claude/worktrees/` and must commit.
- Push, deploy, publish, and sending anything outward need the owner's approval per command.
<!-- coding-studio:end -->
