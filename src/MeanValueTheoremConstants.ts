/**
 * MeanValueTheoremConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Model / math values note their unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in MeanValueTheoremColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 *
 * LAYOUT matches the other Calculus I sims (Limit Explorer, Riemann Sum
 * Builder, Related Rates) — keep those copies in sync.
 */

import MeanValueTheoremNamespace from "./MeanValueTheoremNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/**
 * Corner radius shared by control panels and dialogs.
 * @public
 */
export const PANEL_CORNER_RADIUS = 6;

/**
 * Shared lesson scaffold: plot left, panel right, notes under the plot.
 * Keys stay camelCase to match LessonView usage across the Calculus I fleet.
 */
export const LAYOUT = {
  inset: 32,
  gap: 24,
  plotWidth: 610,
  plotHeight: 360,
  panelWidth: 320,
  panelHeight: 430,
  top: 107,
  notesGap: 14,
};

/** Drive screen: main position plot height (px). */
export const MAIN_PLOT_HEIGHT = 225;

/** Drive screen: speed plot height under the road (px). */
export const SPEED_PLOT_HEIGHT = 118;

/** Drive screen: road graphic width (px). */
export const ROAD_WIDTH = 596;

// ── Model / SI ────────────────────────────────────────────────────────────────

/** Length of the Drive-screen trip (s). */
export const tripDuration = 10;

/** Road length of the Drive-screen trip (m). */
export const tripLength = 100;

/** “Mark and check” grading half-width around an exact match. */
export const MATCH_TOLERANCE = 0.1;

/** Time controls move in 0.05 s steps; a mark this close also counts (s). */
export const MATCH_HALF_STEP = 0.025;

/** Minimum gap between checkpoints (s). */
export const MINIMUM_GAP = 0.5;

/** Dragged checkpoints snap to multiples of this (s). */
export const BOUND_STEP = 0.05;

/** Custom route knot times; ends stay fixed at 0 and tripDuration (s). */
export const knotTimes = [0, 2.5, 5, 7.5, 10] as const;

/** Spacing between custom-route knots (s). */
export const KNOT_SPACING = 2.5;

/** Default knot positions along the road (m). */
export const DEFAULT_KNOTS: readonly number[] = [0, 15, 35, 80, 100];

MeanValueTheoremNamespace.register("MeanValueTheoremConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  LAYOUT,
  MAIN_PLOT_HEIGHT,
  SPEED_PLOT_HEIGHT,
  ROAD_WIDTH,
  tripDuration,
  tripLength,
  MATCH_TOLERANCE,
  MATCH_HALF_STEP,
  MINIMUM_GAP,
  BOUND_STEP,
  knotTimes,
  KNOT_SPACING,
  DEFAULT_KNOTS,
});
