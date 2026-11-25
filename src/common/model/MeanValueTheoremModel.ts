import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { dotRandom, roundSymmetric, toFixedNumber } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  BOUND_STEP as boundStep,
  DEFAULT_KNOTS as defaultKnots,
  MATCH_HALF_STEP as halfStep,
  KNOT_SPACING as knotSpacing,
  MINIMUM_GAP as minimumGap,
  MATCH_TOLERANCE as tolerance,
  tripDuration,
  tripLength,
} from "../../MeanValueTheoremConstants.js";
import { TimeModel } from "../TimeModel.js";

export {
  knotTimes,
  tripDuration,
  tripLength,
} from "../../MeanValueTheoremConstants.js";

/** The car routes of the Drive screen, as position against time. */
export const routes = ["accelerating", "changing", "constant", "custom"] as const;
/** The functions of the When It Applies screen: two that satisfy the theorem's hypotheses, and failures. */
export const functions = ["cubic", "sine", "root", "corner", "cusp", "jump", "pole"] as const;
export type GraphId = (typeof routes)[number] | (typeof functions)[number];
/** Which hypothesis of the theorem fails on [a, b], or none. */
export type Hypothesis = "applies" | "continuity" | "differentiability";

/** A point where f is not differentiable: a jump or pole breaks continuity too; a corner or cusp does not. */
type Break = { readonly x: number; readonly kind: "jump" | "pole" | "corner" | "cusp" };

/**
 * One graph: f and f′ (null where undefined), the window it is drawn in, the interval [a, b]
 * it starts on, and its breaks.
 */
export type Graph = {
  readonly id: GraphId;
  readonly label: string;
  readonly f: (x: number) => number | null;
  readonly df: (x: number) => number | null;
  readonly domain: readonly [number, number];
  readonly bounds: readonly [number, number];
  readonly breaks: readonly Break[];
};

/**
 * Tangents for a cubic Hermite curve through the knots (Fritsch–Butland): a harmonic mean of
 * neighbouring slopes, or zero at a turning knot, so the route never overshoots a knot and
 * its speed stays continuous. The car may turn back, which makes Rolle's case possible.
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
  const clamped = Math.max(0, Math.min(tripDuration, time));
  const i = Math.max(0, Math.min(knots.length - 2, Math.floor(clamped / knotSpacing)));
  const t = clamped / knotSpacing - i;
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

const trip = { domain: [0, tripDuration], bounds: [0, tripDuration], breaks: [] } as const;

/** The library; the custom route is rebuilt from the knots by `graphFor`. */
const library: Readonly<Record<Exclude<GraphId, "custom">, Graph>> = {
  accelerating: {
    id: "accelerating",
    label: "s(t) = t<sup>2</sup>",
    f: (t) => t * t,
    df: (t) => 2 * t,
    ...trip,
  },
  changing: {
    id: "changing",
    label: "s(t) = 10t + (50/π) sin(πt/5)",
    f: (t) => 10 * t + (50 / Math.PI) * Math.sin((Math.PI * t) / 5),
    df: (t) => 10 + 10 * Math.cos((Math.PI * t) / 5),
    ...trip,
  },
  constant: { id: "constant", label: "s(t) = 10t", f: (t) => 10 * t, df: () => 10, ...trip },
  cubic: {
    id: "cubic",
    label: "f(x) = x<sup>3</sup> − 3x",
    f: (x) => x ** 3 - 3 * x,
    df: (x) => 3 * x * x - 3,
    domain: [-2.3, 2.3],
    bounds: [-2, 2],
    breaks: [],
  },
  sine: {
    id: "sine",
    label: "f(x) = sin x",
    f: Math.sin,
    df: Math.cos,
    domain: [-0.4, 6.7],
    bounds: [0, Math.PI],
    breaks: [],
  },
  root: {
    id: "root",
    label: "f(x) = √x",
    f: (x) => (x < 0 ? null : Math.sqrt(x)),
    // The slope is infinite at 0; the theorem only needs differentiability inside (a, b).
    df: (x) => (x <= 0 ? null : 0.5 / Math.sqrt(x)),
    domain: [0, 4.5],
    bounds: [0, 4],
    breaks: [],
  },
  corner: {
    id: "corner",
    label: "f(x) = |x|",
    f: Math.abs,
    df: (x) => (x === 0 ? null : Math.sign(x)),
    domain: [-1.6, 2.6],
    bounds: [-1, 2],
    breaks: [{ x: 0, kind: "corner" }],
  },
  cusp: {
    id: "cusp",
    label: "f(x) = x<sup>2/3</sup>",
    f: (x) => Math.cbrt(x) ** 2,
    df: (x) => (x === 0 ? null : 2 / (3 * Math.cbrt(x))),
    domain: [-1.5, 8.5],
    bounds: [-1, 8],
    breaks: [{ x: 0, kind: "cusp" }],
  },
  jump: {
    id: "jump",
    label: "f(x) = x (x &lt; 1),  x + 1 (x ≥ 1)",
    f: (x) => (x < 1 ? x : x + 1),
    df: (x) => (x === 1 ? null : 1),
    domain: [-0.3, 2.3],
    bounds: [0, 2],
    breaks: [{ x: 1, kind: "jump" }],
  },
  pole: {
    id: "pole",
    label: "f(x) = 1/x",
    f: (x) => (x === 0 ? null : 1 / x),
    df: (x) => (x === 0 ? null : -1 / (x * x)),
    domain: [-1.6, 1.6],
    bounds: [-1, 1],
    breaks: [{ x: 0, kind: "pole" }],
  },
};

export function graphFor(id: GraphId, knots: readonly number[] = defaultKnots): Graph {
  if (id !== "custom") {
    return library[id];
  }
  return {
    id,
    label: "",
    f: (t) => hermite(knots, t, false),
    df: (t) => hermite(knots, t, true),
    ...trip,
  };
}

/** The slope of the secant over [a, b], or null when f is undefined at an end.
 *
 * @internal Exported for unit tests; not part of the application API.
 */
export function secantSlope(graph: Graph, a: number, b: number): number | null {
  const fa = graph.f(a);
  const fb = graph.f(b);
  return fa === null || fb === null ? null : (fb - fa) / (b - a);
}

/** Which hypothesis fails on [a, b]: continuity on the closed interval, then differentiability inside it.
 *
 * @internal Exported for unit tests; not part of the application API.
 */
export function hypothesisOn(graph: Graph, a: number, b: number): Hypothesis {
  const inside = (x: number, closed: boolean) => (closed ? a <= x && x <= b : a < x && x < b);
  if (graph.breaks.some(({ x, kind }) => (kind === "jump" || kind === "pole") && inside(x, true))) {
    return "continuity";
  }
  return graph.breaks.some(({ x }) => inside(x, false)) ? "differentiability" : "applies";
}

/**
 * The points c in (a, b) where f′(c) equals the secant slope, by sign changes on a fine grid,
 * skipping grid cells where f′ is undefined; "all" when f′ matches the slope everywhere.
 *
 * @internal Exported for unit tests; not part of the application API.
 */
export function matches(graph: Graph, a: number, b: number): "all" | readonly number[] {
  const slope = secantSlope(graph, a, b);
  if (slope === null) {
    return [];
  }
  const gap = (x: number) => {
    const value = graph.df(x);
    return value === null || !Number.isFinite(value) ? null : value - slope;
  };
  const samples = 2000;
  const found: number[] = [];
  let flat = true;
  for (let i = 1; i < samples; i++) {
    const low = a + ((b - a) * (i - 1)) / samples;
    const high = a + ((b - a) * i) / samples;
    const gLow = gap(low);
    const gHigh = gap(high);
    const broken = graph.breaks.some(({ x }) => low <= x && x <= high);
    if (gHigh === null || broken) {
      flat = false;
      continue;
    }
    flat &&= Math.abs(gHigh) < 1e-9;
    if (gLow === null || i === 1) {
      continue;
    }
    if (gLow === 0) {
      found.push(low);
    } else if (gLow * gHigh < 0) {
      let left = low;
      let right = high;
      for (let k = 0; k < 50; k++) {
        const middle = (left + right) / 2;
        const gMiddle = gap(middle) ?? 0;
        if ((gap(left) ?? 0) * gMiddle <= 0) {
          right = middle;
        } else {
          left = middle;
        }
      }
      found.push((left + right) / 2);
    }
  }
  return flat ? "all" : found;
}

export class MeanValueTheoremModel implements TModel {
  public readonly timer = new TimeModel();
  public readonly graph: Property<GraphId>;
  /** The checkpoints a < b. */
  public readonly interval: Property<readonly [number, number]>;
  /** Where the tangent is drawn: the time on Drive, x on When It Applies. */
  public readonly point: NumberProperty;
  public readonly prediction = new Property<number | null>(null);
  public readonly reveal = new BooleanProperty(false);
  /** The student's answer to "which hypothesis fails?". */
  public readonly hypothesis = new Property<Hypothesis | null>(null);
  public readonly knots = new Property<readonly number[]>(defaultKnots);
  public readonly challenge = new BooleanProperty(false);

  public readonly mode: "drive" | "when-it-applies";

  public constructor(mode: "drive" | "when-it-applies") {
    this.mode = mode;
    const first = mode === "drive" ? "accelerating" : "cubic";
    this.graph = new Property<GraphId>(first);
    this.interval = new Property<readonly [number, number]>(graphFor(first).bounds);
    this.point = mode === "drive" ? this.timer.timeProperty : new NumberProperty(0.5);
    this.graph.lazyLink(() => {
      this.interval.value = this.current.bounds;
      this.prediction.reset();
      this.reveal.reset();
      this.hypothesis.reset();
      this.timer.isPlayingProperty.value = false;
      const [a, b] = this.interval.value;
      // Off-centre, so the point does not start on a break in the middle of [a, b].
      this.point.value = this.mode === "drive" ? 0 : roundSymmetric((a + 0.3 * (b - a)) * 20) / 20;
    });
    // A new interval asks a new question.
    this.interval.lazyLink(() => {
      this.prediction.reset();
      this.hypothesis.reset();
    });
    this.reset();
  }

  public get current(): Graph {
    return graphFor(this.graph.value, this.knots.value);
  }

  public get average(): number | null {
    const [a, b] = this.interval.value;
    return secantSlope(this.current, a, b);
  }

  /** The hypothesis that actually fails on the current interval. */
  public get failing(): Hypothesis {
    const [a, b] = this.interval.value;
    return hypothesisOn(this.current, a, b);
  }

  public get solutions(): "all" | readonly number[] {
    const [a, b] = this.interval.value;
    return matches(this.current, a, b);
  }

  /**
   * "close" when f′ is within the tolerance of the secant slope at the mark; "near" when it
   * is not, but an exact match lies within half a time step (a steep custom route can jump past
   * the average between steps); otherwise "retry".
   */
  public predictionResult(): "close" | "near" | "retry" | null {
    const t = this.prediction.value;
    if (t === null) {
      return null;
    }
    const [a, b] = this.interval.value;
    const value = this.current.df(t);
    const average = this.average;
    if (t <= a || t >= b || value === null || average === null) {
      return "retry";
    }
    if (Math.abs(value - average) <= tolerance + 1e-10) {
      return "close";
    }
    const exact = this.solutions;
    return exact !== "all" && exact.some((time) => Math.abs(time - t) <= halfStep + 1e-9) ? "near" : "retry";
  }

  /** Moves an interior point of the custom route, kept on the road. */
  public moveKnot(index: number, value: number): void {
    const knots = this.knots.value;
    if (index < 1 || index > knots.length - 2) {
      return;
    }
    const next = Math.max(0, Math.min(tripLength, roundSymmetric(value)));
    if (next !== knots[index]) {
      this.knots.value = knots.map((knot, i) => (i === index ? next : knot));
    }
  }

  /** Moves checkpoint a (side 0) or b (side 1), snapped and kept in the window and apart. */
  public moveBound(side: 0 | 1, x: number): void {
    const [low, high] = this.current.domain;
    const [a, b] = this.interval.value;
    const snapped = roundSymmetric(x / boundStep) * boundStep;
    const next: [number, number] =
      side === 0
        ? [Math.max(low, Math.min(b - minimumGap, snapped)), b]
        : [a, Math.min(high, Math.max(a + minimumGap, snapped))];
    if (next[0] !== a || next[1] !== b) {
      this.interval.value = [toFixedNumber(next[0], 2), toFixedNumber(next[1], 2)];
    }
  }

  /** A random, visibly curved route: find a time when the speed equals the average. */
  public newChallenge(): void {
    let knots: number[];
    do {
      const inner = [0, 0, 0].map(() => 5 * dotRandom.nextIntBetween(1, 19)).sort((a, b) => a - b);
      knots = [0, ...inner, tripLength];
    } while (Math.max(...knots.map((knot, i) => Math.abs(knot - 25 * i))) < 15);
    this.graph.value = "custom";
    this.knots.value = knots;
    this.interval.value = [0, tripDuration];
    this.prediction.reset();
    this.challenge.value = true;
  }

  public stepOnce(dt: number): void {
    const time = Math.min(tripDuration, this.timer.timeProperty.value + dt);
    this.timer.timeProperty.value = time;
    if (time === tripDuration) {
      this.timer.isPlayingProperty.value = false;
    }
  }

  public step(dt: number): void {
    if (this.mode === "drive" && this.timer.isPlayingProperty.value) {
      this.stepOnce(dt);
    }
  }

  public reset(): void {
    this.timer.reset();
    this.graph.reset();
    this.interval.value = this.current.bounds;
    if (this.mode !== "drive") {
      this.point.value = 0.5;
    }
    this.prediction.reset();
    this.reveal.reset();
    this.hypothesis.reset();
    this.knots.reset();
    this.challenge.reset();
  }

  public dispose(): void {
    this.timer.dispose();
    this.graph.dispose();
    this.interval.dispose();
    if (this.point !== this.timer.timeProperty) {
      this.point.dispose();
    }
    this.prediction.dispose();
    this.reveal.dispose();
    this.hypothesis.dispose();
    this.knots.dispose();
    this.challenge.dispose();
  }
}
