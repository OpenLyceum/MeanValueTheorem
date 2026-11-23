/**
 * Memory-leak regression suite (fleet standard).
 *
 * List every model/view object that links Properties, adds listeners, or owns child
 * nodes, with a factory that builds a fresh instance. The shared harness in
 * tests/helpers/memoryLeak.ts (template-owned) checks that each one is garbage
 * collected after dispose() and leaves no survivors across repeated cycles
 * (idempotentDispose: true also checks a second dispose()). Add sim-specific leak
 * tests below using forceGC().
 */

import { describe, expect, it, vi } from "vitest";
import { MeanValueTheoremModel } from "../src/common/model/MeanValueTheoremModel.js";
import { TimeModel } from "../src/common/TimeModel.js";
import { DriveModel } from "../src/drive/model/DriveModel.js";
import { WhenItAppliesModel } from "../src/when-it-applies/model/WhenItAppliesModel.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

describeDisposalLeaks([
  { name: "MeanValueTheoremModel", create: () => new MeanValueTheoremModel("drive") },
  { name: "TimeModel", create: () => new TimeModel(), idempotentDispose: true },
  { name: "DriveModel", create: () => new DriveModel() },
  { name: "WhenItAppliesModel", create: () => new WhenItAppliesModel() },
]);

describe("composed TimeModel disposal", () => {
  it("screen models dispose their owned timer", () => {
    {
      const model = new DriveModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
    {
      const model = new WhenItAppliesModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
  });
});
