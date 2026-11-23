# Implementation notes — Mean Value Theorem

Developer-facing architecture notes for `mean-value-theorem`.

## Architecture

Screens: src/drive/, src/when-it-applies/

- Models own state and `step` / `reset`; views observe Properties and never integrate physics.
- Colors live in `src/MeanValueTheoremColors.ts`; strings in `src/i18n/` via `StringManager`.
- Preferences shell: `src/preferences/` (empty until sim-specific prefs are added).

## Notes

*Record design decisions, performance constraints, and known limitations here.*
