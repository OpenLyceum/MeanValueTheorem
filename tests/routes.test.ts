import { describe, expect, it } from "vitest";
import {
  averageSpeed,
  MeanValueTheoremModel,
  matches,
  position,
  smoothRoutes,
  speed,
} from "../src/common/model/MeanValueTheoremModel.js";

describe("route models", () => {
  it("matches average speed at one, two, or all interior times", () => {
    const [accelerating, changing, constant] = smoothRoutes;
    expect(matches(accelerating)).toEqual([5]);
    expect(matches(changing)).toEqual([2.5, 7.5]);
    expect(matches(constant)).toBe("all");
    for (const route of smoothRoutes) {
      expect(position(route, 0)).toBe(0);
      expect(position(route, 10)).toBeCloseTo(100);
      const times = matches(route);
      for (const time of times === "all" ? [1, 5, 9] : times) {
        expect(speed(route, time)).toBeCloseTo(averageSpeed);
      }
    }
  });

  it("leaves the tangent undefined at the continuous corner", () => {
    expect(position("corner", 5)).toBe(25);
    expect(speed("corner", 4)).toBe(5);
    expect(speed("corner", 5)).toBeNull();
    expect(speed("corner", 6)).toBe(15);
    expect(matches("corner")).toEqual([]);
  });

  it("checks only interior predictions and stops at the second checkpoint", () => {
    const model = new MeanValueTheoremModel("drive");
    model.prediction.value = 5.05;
    expect(model.checkPrediction()).toBe(true);
    model.prediction.value = 5.1;
    expect(model.checkPrediction()).toBe(false);
    model.changeRoute("constant");
    model.prediction.value = 10;
    expect(model.checkPrediction()).toBe(false);
    model.timer.isPlayingProperty.value = true;
    model.step(11);
    expect(model.timer.timeProperty.value).toBe(10);
    expect(model.timer.isPlayingProperty.value).toBe(false);
    model.dispose();
  });

  it("keeps a custom route monotone and finds every matching time", () => {
    const model = new MeanValueTheoremModel("drive");
    model.changeRoute("custom");
    model.moveKnot(2, 90);
    model.moveKnot(1, 95);
    // Positions stay in order, so the car never reverses.
    expect(model.knots.value).toEqual([0, 80, 80, 80, 100]);
    for (let t = 0; t < 10; t += 0.01) {
      expect(speed("custom", t, model.knots.value) ?? -1).toBeGreaterThanOrEqual(-1e-9);
    }
    const times = matches("custom", model.knots.value);
    expect(times).not.toBe("all");
    expect((times as number[]).length).toBeGreaterThan(0);
    for (const time of times as number[]) {
      expect(speed("custom", time, model.knots.value)).toBeCloseTo(averageSpeed, 6);
    }
    model.changeRoute("accelerating");
    expect(model.knots.value[2]).toBe(80);
    model.dispose();
  });

  it("treats a straight custom route as matching everywhere", () => {
    expect(matches("custom", [0, 25, 50, 75, 100])).toBe("all");
  });

  it("generates challenge routes whose matches can be marked on the 0.05 s grid", () => {
    const model = new MeanValueTheoremModel("drive");
    for (let i = 0; i < 20; i++) {
      model.newChallenge();
      expect(model.challenge.value).toBe(true);
      expect(model.route.value).toBe("custom");
      const times = matches("custom", model.knots.value);
      expect(times).not.toBe("all");
      const first = (times as number[])[0] ?? 0;
      model.prediction.value = Math.round(first * 20) / 20;
      expect(model.checkPrediction()).toBe(true);
      // Some interior grid time must miss, or the check would accept anything.
      const misses = Array.from({ length: 199 }, (_, k) => (k + 1) / 20).filter((time) => {
        model.prediction.value = time;
        return model.checkPrediction() === false;
      });
      expect(misses.length).toBeGreaterThan(100);
    }
    model.changeRoute("accelerating");
    expect(model.challenge.value).toBe(false);
    model.dispose();
  });
});
