import { describe, expect, it } from "vitest";
import {
  functions,
  graphFor,
  hypothesisOn,
  MeanValueTheoremModel,
  matches,
  routes,
  secantSlope,
} from "../src/common/model/MeanValueTheoremModel.js";

describe("graphs", () => {
  it("pairs every f with its derivative away from the breaks", () => {
    for (const id of [...routes, ...functions]) {
      const graph = graphFor(id);
      const [low, high] = graph.domain;
      for (let i = 1; i < 20; i++) {
        const x = low + ((high - low) * i) / 20;
        const h = 1e-6;
        const left = graph.f(x - h);
        const right = graph.f(x + h);
        const slope = graph.df(x);
        const nearBreak = graph.breaks.some((point) => Math.abs(point.x - x) < 1e-3);
        if (left === null || right === null || slope === null || nearBreak) {
          continue;
        }
        expect(slope).toBeCloseTo((right - left) / (2 * h), 4);
      }
    }
  });
});

describe("mean value theorem", () => {
  it("finds every c where the tangent is parallel to the secant", () => {
    // x³ − 3x on [−2, 2]: the secant slope is 1, and 3c² − 3 = 1 at c = ±2/√3.
    const cubic = graphFor("cubic");
    expect(secantSlope(cubic, -2, 2)).toBeCloseTo(1, 12);
    const found = matches(cubic, -2, 2);
    expect(found).not.toBe("all");
    const expected = [-2 / Math.sqrt(3), 2 / Math.sqrt(3)];
    expect(found).toHaveLength(2);
    for (const [i, c] of (found as readonly number[]).entries()) {
      expect(c).toBeCloseTo(expected[i] ?? 0, 6);
    }
    // Rolle: sin x on [0, π] has a flat secant and c = π/2.
    const sine = matches(graphFor("sine"), 0, Math.PI) as readonly number[];
    expect(sine).toHaveLength(1);
    expect(sine[0]).toBeCloseTo(Math.PI / 2, 6);
    // Constant speed matches everywhere; the accelerating car only at the midpoint of [a, b].
    expect(matches(graphFor("constant"), 0, 10)).toBe("all");
    expect((matches(graphFor("accelerating"), 2, 8) as readonly number[])[0]).toBeCloseTo(5, 6);
  });

  it("names the failing hypothesis and finds no c when it fails", () => {
    expect(hypothesisOn(graphFor("cubic"), -2, 2)).toBe("applies");
    // √x has an infinite slope only at the endpoint 0, which the theorem allows.
    expect(hypothesisOn(graphFor("root"), 0, 4)).toBe("applies");
    expect(matches(graphFor("root"), 0, 4)).toHaveLength(1);
    for (const [id, a, b, failing] of [
      ["corner", -1, 2, "differentiability"],
      ["cusp", -1, 8, "differentiability"],
      ["jump", 0, 2, "continuity"],
      ["pole", -1, 1, "continuity"],
    ] as const) {
      expect(hypothesisOn(graphFor(id), a, b)).toBe(failing);
      expect(matches(graphFor(id), a, b)).toEqual([]);
    }
    // Moving the interval off the break restores the theorem.
    expect(hypothesisOn(graphFor("corner"), 0.5, 2)).toBe("applies");
    // A jump at the right end still breaks continuity on the closed interval.
    expect(hypothesisOn(graphFor("jump"), 0, 1)).toBe("continuity");
  });
});

describe("model", () => {
  it("moves the checkpoints, keeps them apart, and judges a marked time", () => {
    const model = new MeanValueTheoremModel("drive");
    model.moveBound(0, 2.02);
    model.moveBound(1, 8);
    expect(model.interval.value).toEqual([2, 8]);
    model.moveBound(0, 9);
    expect(model.interval.value).toEqual([7.5, 8]);
    model.moveBound(0, 2);
    model.prediction.value = 5;
    expect(model.predictionResult()).toBe("close");
    model.prediction.value = 1;
    expect(model.predictionResult()).toBe("retry");
    model.dispose();
  });

  it("lets the custom route turn back so a Rolle case can be built", () => {
    const model = new MeanValueTheoremModel("drive");
    model.graph.value = "custom";
    model.moveKnot(2, 90);
    model.moveKnot(3, 20);
    expect(model.knots.value).toEqual([0, 15, 90, 20, 100]);
    model.dispose();
  });

  it("asks a fresh question when the function or the interval changes", () => {
    const model = new MeanValueTheoremModel("when-it-applies");
    model.hypothesis.value = "continuity";
    model.graph.value = "corner";
    expect(model.hypothesis.value).toBeNull();
    expect(model.interval.value).toEqual([-1, 2]);
    expect(model.failing).toBe("differentiability");
    model.hypothesis.value = "applies";
    model.moveBound(0, 0.5);
    expect(model.hypothesis.value).toBeNull();
    expect(model.failing).toBe("applies");
    model.dispose();
  });

  it("sets up a challenge on a curved custom route", () => {
    const model = new MeanValueTheoremModel("drive");
    model.newChallenge();
    expect(model.graph.value).toBe("custom");
    expect(model.challenge.value).toBe(true);
    expect(model.solutions).not.toBe("all");
    model.dispose();
  });
});
