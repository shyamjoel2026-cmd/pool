# POOL: context for Claude Code

All shared instructions live in **AGENTS.md**. The founder also uses Codex, which reads AGENTS.md, so both tools follow the same rules. Don't duplicate rules here; edit AGENTS.md instead.

@AGENTS.md

Claude-specific notes:
- Claude Code's private auto-memory isn't visible to Codex. Anything important must also be written to `POOL_PROJECT_STATE.md` (decisions and the handoff log) or to AGENTS.md (rules).
- At the end of every session, add a handoff entry to the log in `POOL_PROJECT_STATE.md`, as described in AGENTS.md §2.
