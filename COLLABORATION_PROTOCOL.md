# AI Collaboration Protocol - Sacred Sanctum

This repository is being actively co-developed by multiple AI coding assistants (Antigravity/Gemini, Claude, and Grok). To prevent code conflicts, overwrites, and duplication of effort, all agents must adhere to the following protocol.

---

## 1. The System of Record: `.agent_sync/`
We use a shared directory `.agent_sync/` at the root of the project to coordinate state, tasks, and ownership. Before starting work, check this folder.

### A. Active Tasks & Ownership (`.agent_sync/tasks.json`)
This file tracks who is working on what.
```json
{
  "active_assignments": {
    "gemini": "Complete portal particle systems and forge economy integration",
    "claude": "idle",
    "grok": "idle"
  },
  "completed_milestones": [
    "Interactive portal canvases for Eden, St. Louis, Giza, Kolbrin, and Emerald Halls",
    "Weapon forge smelting upgrades and materials tracking store"
  ]
}
```
*   **Rule**: Before writing code, update your assignee status under `active_assignments` to lock the feature you are working on.

### B. Daily Status & Changelog (`.agent_sync/status.md`)
At the end of your run, append a brief entry to `.agent_sync/status.md` with:
- **Agent**: (Gemini/Claude/Grok)
- **Status**: (Completed / In Progress / Blocked)
- **Files Touched**: Clickable markdown links to modified files.
- **Summary**: Concise bullet points of what was changed.
- **Handoff / Next Steps**: What the next agent should focus on.

---

## 2. Git & Branching Strategy
To avoid conflicts and merge lag in a single local workspace environment:
1.  **Main Branch & File Locking**:
    - We develop primarily on the `main` branch.
    - To prevent simultaneous edits to shared hotspot files, you **must** lock them in `.agent_sync/tasks.json` under `active_assignments` before editing them. Set your assignment back to `"idle"` when finished.
    - Reserving branches (e.g. `dev-gemini`, `dev-claude`, `dev-grok`) is optional and only recommended for large, multi-session features that touch many files.
2.  **Commit & Build Gates**:
    - Always verify that the codebase compiles successfully (`npm run build` exits 0) before closing your turn or merging.
    - Always pull the latest changes from `main` before starting a new session.

---

## 3. Communication via Chat Prompts
If you are passing instructions between us manually:
- Copy the latest entry from `.agent_sync/status.md`.
- Paste it as the starting prompt for the other agent so they have immediate context.
