import { BooleanProperty, Property } from "scenerystack/axon";
import { dotRandom } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { TimeModel } from "../TimeModel.js";

export const tripDuration = 10;
export const tripLength = 100;
export const averageSpeed = tripLength / tripDuration;
const tolerance = 0.1;
// The time controls move in 0.05 s steps; a mark this close to an exact match also counts.
const halfStep = 0.025;
export const smoothRoutes = ["accelerating", "changing", "constant", "custom"] as const;
type Route = (typeof smoothRoutes)[number] | "corner";

/** The custom route passes through one position at each of these times (the ends stay fixed). */
export const knotTimes = [0, 2.5, 5, 7.5, 10] as const;
const knotSpacing = 2.5;
const defaultKnots: readonly number[] = [0, 15, 35, 80, 100];

/**
 * Tangents for a monotone cubic Hermite curve through the knots (Fritsch–Butland):
 * a harmonic mean of neighbouring slopes, or zero at a flat stretch, so the car
 * never backs up between knots and its speed stays continuous.
 */
function tangents(knots: readonly number[]): number[] {
  const slopes = knots.slice(1).map((y, i) => (y - (knots[i] ?? 0)) / knotSpacing);
  return knots.map((_, i) => {
    const before = slopes[i - 1];
    const after = slopes[i];
    if (before === undefined || after === undefined) {
      return before ?? after ?? 0;
    }
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
}

// Tangents depend only on the knots; keep the last set so sampling a route stays cheap.
let cachedKnots: readonly number[] | null = null;
let cachedTangents: number[] = [];

function hermite(knots: readonly number[], time: number, derivative: boolean): number {
  if (knots !== cachedKnots) {
    cachedKnots = knots;
    cachedTangents = tangents(knots);
  }
  const m = cachedTangents;
  const i = Math.max(0, Math.min(knots.length - 2, Math.floor(time / knotSpacing)));
  const t = time / knotSpacing - i;
  const a = knots[i] ?? 0;
  const b = knots[i + 1] ?? 0;
  const ma = (m[i] ?? 0) * knotSpacing;
  const mb = (m[i + 1] ?? 0) * knotSpacing;
  if (derivative) {
    return ((6 * t * t - 6 * t) * (a - b) + (3 * t * t - 4 * t + 1) * ma + (3 * t * t - 2 * t) * mb) / knotSpacing;
  }
  return (
    (2 * t ** 3 - 3 * t * t + 1) * a +
    (t ** 3 - 2 * t * t + t) * ma +
    (-2 * t ** 3 + 3 * t * t) * b +
    (t ** 3 - t * t) * mb
  );
}

export function position(route: Route, time: number, knots = defaultKnots): number {
  const u = time / tripDuration;
  switch (route) {
    case "accelerating":
      return tripLength * u * u;
    case "changing":
      return tripLength * (u + 0.1 * Math.sin(2 * Math.PI * u));
    case "corner":
      return time <= 5 ? 5 * time : 25 + 15 * (time - 5);
    case "constant":
      return averageSpeed * time;
    case "custom":
      return hermite(knots, Math.max(0, Math.min(tripDuration, time)), false);
  }
}

export function speed(route: Route, time: number, knots = defaultKnots): number | null {
  switch (route) {
    case "accelerating":
      return 2 * time;
    case "changing":
      return averageSpeed + 2 * Math.PI * Math.cos((2 * Math.PI * time) / tripDuration);
    case "corner":
      return time === 5 ? null : time < 5 ? 5 : 15;
    case "constant":
      return averageSpeed;
    case "custom":
      return hermite(knots, Math.max(0, Math.min(tripDuration, time)), true);
  }
}

/** Interior times where the custom route's speed equals the average, found by sign changes. */
function customMatches(knots: readonly number[]): "all" | readonly number[] {
  const gap = (time: number) => hermite(knots, time, true) - averageSpeed;
  const samples = 2000;
  const found: number[] = [];
  let flat = true;
  for (let i = 1; i < samples; i++) {
    const a = (tripDuration * (i - 1)) / samples;
    const b = (tripDuration * i) / samples;
    flat &&= Math.abs(gap(b)) < 1e-9;
    if (i > 1 && gap(a) === 0) {
      found.push(a);
    } else if (gap(a) * gap(b) < 0) {
      let low = a;
      let high = b;
      for (let k = 0; k < 50; k++) {
        const middle = (low + high) / 2;
        if (gap(low) * gap(middle) <= 0) {
          high = middle;
        } else {
          low = middle;
        }
      }
      found.push((low + high) / 2);
    }
  }
  return flat ? "all" : found;
}

export function matches(route: Route, knots = defaultKnots): "all" | readonly number[] {
  switch (route) {
    case "accelerating":
      return [5];
    case "changing":
      return [2.5, 7.5];
    case "corner":
      return [];
    case "constant":
      return "all";
    case "custom":
      return customMatches(knots);
  }
}

export class MeanValueTheoremModel implements TModel {
  public readonly timer = new TimeModel();
  public readonly route = new Property<Route>("accelerating");
  public readonly prediction = new Property<number | null>(null);
  public readonly reveal = new BooleanProperty(false);
  public readonly hypothesis = new Property<"continuity" | "differentiability" | null>(null);
  public readonly knots = new Property<readonly number[]>(defaultKnots);
  public readonly challenge = new BooleanProperty(false);

  public readonly mode: "drive" | "when-it-applies";

  public constructor(mode: "drive" | "when-it-applies") {
    this.mode = mode;
    this.reset();
  }

  public checkPrediction(): boolean | null {
    const result = this.predictionResult();
    return result === null ? null : result !== "retry";
  }

  /**
   * "close" when the speed is within the tolerance of the average at the mark; "near" when it
   * is not, but an exact match lies within half a time step (a steep custom route can jump past
   * the average between steps); otherwise "retry".
   */
  public predictionResult(): "close" | "near" | "retry" | null {
    const t = this.prediction.value;
    if (t === null) {
      return null;
    }
    const value = speed(this.route.value, t, this.knots.value);
    if (t <= 0 || t >= tripDuration || value === null) {
      return "retry";
    }
    if (Math.abs(value - averageSpeed) <= tolerance + 1e-10) {
      return "close";
    }
    const exact = matches(this.route.value, this.knots.value);
    return exact !== "all" && exact.some((time) => Math.abs(time - t) <= halfStep + 1e-9) ? "near" : "retry";
  }

  /** Moves an interior point of the custom route, keeping positions in order so the car never reverses. */
  public moveKnot(index: number, value: number): void {
    const knots = this.knots.value;
    if (index < 1 || index > knots.length - 2) {
      return;
    }
    const low = knots[index - 1] ?? 0;
    const high = knots[index + 1] ?? tripLength;
    const next = Math.max(low, Math.min(high, Math.round(value)));
    if (next !== knots[index]) {
      this.knots.value = knots.map((knot, i) => (i === index ? next : knot));
    }
  }

  /** A random, visibly curved route: find a time when the speed equals the average. */
  public newChallenge(): void {
    let knots: number[];
    do {
      const inner = [0, 0, 0].map(() => 5 * dotRandom.nextIntBetween(1, 19)).sort((a, b) => a - b);
      knots = [0, ...inner, tripLength];
    } while (Math.max(...knots.map((knot, i) => Math.abs(knot - 25 * i))) < 15);
    this.changeRoute("custom");
    this.knots.value = knots;
    this.challenge.value = true;
  }

  public changeRoute(route: Route): void {
    // The student's custom route survives a trip through the other routes.
    const knots = this.knots.value;
    this.reset();
    this.knots.value = knots;
    this.route.value = route;
    if (this.mode === "when-it-applies") {
      this.timer.timeProperty.value = 5;
    }
  }

  public stepOnce(dt: number): void {
    const time = Math.min(tripDuration, this.timer.timeProperty.value + dt);
    this.timer.timeProperty.value = time;
    if (time === tripDuration) {
      this.timer.isPlayingProperty.value = false;
    }
  }

  public step(dt: number): void {
    if (this.timer.isPlayingProperty.value) {
      this.stepOnce(dt);
    }
  }

  public reset(): void {
    this.timer.reset();
    this.route.reset();
    this.prediction.reset();
    this.reveal.reset();
    this.hypothesis.reset();
    this.knots.reset();
    this.challenge.reset();
    if (this.mode === "when-it-applies") {
      this.route.value = "corner";
      this.timer.timeProperty.value = 5;
    }
  }

  public dispose(): void {
    this.timer.dispose();
    this.route.dispose();
    this.prediction.dispose();
    this.reveal.dispose();
    this.hypothesis.dispose();
    this.knots.dispose();
    this.challenge.dispose();
  }
}
