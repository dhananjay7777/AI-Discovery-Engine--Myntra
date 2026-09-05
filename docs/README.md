# Docs

| File | What it is |
| --- | --- |
| [problemstatement.md](./problemstatement.md) | Why this engine exists |
| [architecture.md](./architecture.md) | How it is built |
| [implementationplan.md](./implementationplan.md) | Phase-wise build |
| [Deploymentplan.md](./Deploymentplan.md) | Deploy the site on Vercel |
| [decision.md](./decision.md) | Tech and business decisions |
| [groq-api-setup.md](./groq-api-setup.md) | Add `GROQ_API_KEY` (needed for Phase 0 smoke) |
| [phases/phase-2-extraction/quota-plan.md](./phases/phase-2-extraction/quota-plan.md) | How Phase 2 stays inside Groq RPM / TPM / RPD / TPD caps |
| [youtube-api-setup.md](./youtube-api-setup.md) | Add `YOUTUBE_API_KEY` (needed for Phase 1 comments) |

Per-phase tests and exit criteria live in `phases/phase-N-*/eval.md`. Status in the implementation plan table is generated from those files (`npm run phase:complete -- <n>`).
