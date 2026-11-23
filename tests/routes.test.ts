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
});
