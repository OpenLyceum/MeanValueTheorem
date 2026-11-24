# AGENTS.md — Mean Value Theorem

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Mean Value Theorem (`mean-value-theorem`) is a SceneryStack simulation scaffolded from SceneryStackTemplate.

## Key files

| File | Purpose |
|---|---|
| `src/MeanValueTheoremColors.ts` | All `ProfileColorProperty` instances |
| `src/MeanValueTheoremConstants.ts` | Named numeric constants |
| `src/MeanValueTheoremNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |
| `src/common/MeanValueTheoremPanel.ts` | Pre-themed `Panel` wrapper |
| `src/common/MeanValueTheoremButtonOptions.ts` | Flat button / combo-box option bundles |
| `src/common/TimeModel.ts` | Play/pause, speed, and elapsed time composed by screen models |
| `src/drive/DriveScreen.ts` | Screen wrapper |
| `src/drive/model/DriveModel.ts` | Simulation state and logic |
| `src/drive/view/DriveScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/when-it-applies/WhenItAppliesScreen.ts` | Screen wrapper |
| `src/when-it-applies/model/WhenItAppliesModel.ts` | Simulation state and logic |
| `src/when-it-applies/view/WhenItAppliesScreenView.ts` | Visual nodes, layout, a11y wiring |

## Compliance carve-outs

- `memory-leak:PlotHandle` — file-private drag handle inside the plot/lesson view; not exported for `describeDisposalLeaks`.

## Testing

See the shared Vitest setup (`vitest.config.ts`, `tests/setup.ts`) and `tests/memory-leak.test.ts` for disposal coverage. Add sim-specific unit tests under `tests/` as physics and UI logic land.

## Accessibility

Follow [Baton/ACCESSIBILITY.md](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md): PDOM names, per-screen `*ScreenSummaryContent`, and keyboard-help content. Document any intentional deviations under Compliance carve-outs.
