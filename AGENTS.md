# AGENTS.md: shared instructions for every AI coding agent (Claude Code, Codex, others)

The founder switches between Claude Code and Codex. Neither tool can see the other's private memory, so **everything that matters lives in files in this folder**. Read them, follow them, and keep them updated.

## 1. Start of every session (mandatory)

1. Read `POOL_PROJECT_STATE.md`: decisions, file map, status, and the **handoff log**. Start with the handoff log, since it records where the last session stopped.
2. Read `POOL_BLUEPRINT.md`, the single build document: product rules, architecture, stack and milestones.
3. For code work, go to `pool/`, the monorepo. Read `pool/README.md` and run the tests before changing anything.

## 2. End of every session (mandatory handoff)

Add an entry at the **top** of the handoff log in `POOL_PROJECT_STATE.md`:

```
### YYYY-MM-DD HH:MM · <Claude Code | Codex> · <milestone>
- Did: …
- Verified: (tests run, results)
- Next: …
- Open issues / blockers: …
```

Commit code with a clear message. Never leave work uncommitted without noting it in the handoff log.

## 3. Who the founder is (facts confirmed by the founder)

- Hyderabad-based founder of **POOL**. A Pvt Ltd company exists, and **its GST turnover is above ₹40 lakh**.
- Budget is above ₹50 lakh. Team: founder, 4 field/ops people, 5 developers.
- Edge: builder/real-estate contacts, appliance dealer contacts, tech/AI.
- Goal now: a **real, working global prototype (India + USA)** to pitch 4 investors (2 India, 2 US).
- Accounts created: Anthropic, Razorpay, Stripe, Meta (WhatsApp), Twilio. Docker Desktop runs locally, and GitHub CLI is logged in.

## 4. How to work (the founder's rules)

- **Never hallucinate.** Verify versions, APIs, prices and facts at the source (npm, official docs, GitHub). Check arithmetic with code, and label guesses "guess — check".
- **Think like a co-founder.** Use plain, concrete language. Keep the founder's idea at the centre; improve it, don't replace it.
- **Keep one source of truth.** Update `POOL_PROJECT_STATE.md` and `POOL_BLUEPRINT.md` instead of creating new documents.
- **Real, not fake.** No dummy dashboards or mocked data paths in the product. Payments run in test mode, but the flows are real.
- **UI/UX must be excellent** and very easy for first-time smartphone users (Telugu/Hindi/English, low-end Android), with no dark patterns (India CCPA 2023, US FTC).
- **Secrets.** Keys go only in `pool/.env`, which is git-ignored. Never print, log or commit them, and use test keys only.
- **Claude API.** Call it only through the official `@anthropic-ai/sdk`. The default model is `claude-opus-5-5`. Don't route it through OpenAI-compatible shims.
- **Accounts.** Agents never create third-party accounts or enter passwords; the founder does that.

## 5. Where things are

| Path | What |
| --- | --- |
| `POOL_PROJECT_STATE.md` | Shared memory: decisions, status, handoff log |
| `POOL_BLUEPRINT.md` | The one build document |
| `POOL_WORKING_MODEL_v3.md` | Detailed business model (reference) |
| `research/` | Verified research: `06_prototype_stack.md` (383 items), `08_hidden_gems.md` (123 gems plus critic verdict); raw JSON in `research/raw/` |
| `pool/` | The code monorepo (a folder inside this one git repository; the repo root is this folder, so Codex and Claude both read this AGENTS.md) |
| Older `POOL_*` documents | Superseded; history only |

## 6. Local environment notes (Windows)

- Docker isn't on PATH. The binary is at `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe`.
- pnpm 12 is installed via npm into `%APPDATA%\npm`. Add that folder to PATH if `pnpm` isn't found. Corepack can't write to `C:\Program Files`.
