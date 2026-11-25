# AGENTS.md — Mean Value Theorem

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Mean Value Theorem (`mean-value-theorem`) connects the secant over [a, b] with tangents inside it.

- **Drive:** a car's position against time, chosen from the route list: steady acceleration, speed-up and slow-down, constant speed, or the student's route.
  - Drag the checkpoints a and b. They take the arrow keys.
  - The time slider, Play/Step or the car on its road set the moment.
  - A speed graph under the position graph draws the average speed as a level line over [a, b]; every c is where the speed curve meets it.
  - "Mark and check" judges a marked time, and "New challenge" builds a curved route.
  - The student's route may turn back, so a Rolle case (s(a) = s(b)) can be built.
- **When It Applies:** functions with a draggable [a, b].
  - Both hypotheses hold for x³ − 3x (two c values), sin x on [0, π] (Rolle) and √x (infinite slope only at the endpoint).
  - The rest each break one hypothesis: |x| (corner), x^(2/3) (cusp), a jump, and 1/x (pole).
  - The student answers which hypothesis fails: Neither, Continuity or Differentiability. The answer is judged against `hypothesisOn(graph, a, b)`, so moving a or b across a break changes it.

## Key files

| File | Purpose |
|---|---|
| `src/common/model/MeanValueTheoremModel.ts` | `Graph` library (f, f′, window, default [a, b], breaks), `secantSlope`, `hypothesisOn`, `matches` (every c, by sign changes of f′ − slope), the custom Hermite route, model state |
| `src/common/MeanValueTheoremView.ts` | Both screens: combo box, readouts, hypothesis buttons, main and f′ plots, road and car, handles |
| `src/common/LessonView.ts` | Canonical Calculus I scaffold, kept identical with Limit Explorer, Riemann Sum Builder and Related Rates apart from the sim prefix. Its `Plot` takes a size, so this sim adds the f′ graph as a second `Plot`. |
| `tests/routes.test.ts` | f′ against f, c values (two-root cubic, Rolle, constant), failing hypotheses, checkpoints, the custom route, the challenge |
| `tests/browser/*.spec.ts` | Car keyboard path, preferences focus, hypothesis feedback following the interval |

## Compliance carve-outs

- `memory-leak:PlotHandle` — file-private drag handle inside the plot/lesson view; not exported for `describeDisposalLeaks`.
- `.github/workflows/ci.yml` enables Baton's browser regression job for the Chromium pilot.

## Testing

See the shared Vitest setup (`vitest.config.ts`, `tests/setup.ts`) and `tests/memory-leak.test.ts` for disposal coverage. Add sim-specific unit tests under `tests/` as physics and UI logic land.

## Accessibility

Follow [Baton/ACCESSIBILITY.md](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md): PDOM names, per-screen `*ScreenSummaryContent`, and keyboard-help content. Document any intentional deviations under Compliance carve-outs.
