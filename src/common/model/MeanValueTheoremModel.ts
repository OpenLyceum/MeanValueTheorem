import { BooleanProperty, Property } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { TimeModel } from "../TimeModel.js";

export const tripDuration = 10;
export const tripLength = 100;
export const averageSpeed = tripLength / tripDuration;
const tolerance = 0.1;
export const smoothRoutes = ["accelerating", "changing", "constant"] as const;
type Route = (typeof smoothRoutes)[number] | "corner";

export function position(route: Route, time: number): number {
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
  }
}

export function speed(route: Route, time: number): number | null {
  switch (route) {
    case "accelerating":
      return 2 * time;
    case "changing":
      return averageSpeed + 2 * Math.PI * Math.cos((2 * Math.PI * time) / tripDuration);
    case "corner":
      return time === 5 ? null : time < 5 ? 5 : 15;
    case "constant":
      return averageSpeed;
  }
}

export function matches(route: Route): "all" | readonly number[] {
  switch (route) {
    case "accelerating":
      return [5];
    case "changing":
      return [2.5, 7.5];
    case "corner":
      return [];
    case "constant":
      return "all";
  }
}

export class MeanValueTheoremModel implements TModel {
  public readonly timer = new TimeModel();
  public readonly route = new Property<Route>("accelerating");
  public readonly prediction = new Property<number | null>(null);
  public readonly reveal = new BooleanProperty(false);
  public readonly hypothesis = new Property<"continuity" | "differentiability" | null>(null);

  public readonly mode: "drive" | "when-it-applies";

  public constructor(mode: "drive" | "when-it-applies") {
    this.mode = mode;
    this.reset();
  }

  public checkPrediction(): boolean | null {
    const t = this.prediction.value;
    if (t === null) {
      return null;
    }
    const value = speed(this.route.value, t);
    return t > 0 && t < tripDuration && value !== null && Math.abs(value - averageSpeed) <= tolerance + 1e-10;
  }

  public changeRoute(route: Route): void {
    this.reset();
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
  }
}
