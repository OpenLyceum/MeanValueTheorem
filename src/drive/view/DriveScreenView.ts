import { MeanValueTheoremView } from "../../common/MeanValueTheoremView.js";
import type { DriveModel } from "../model/DriveModel.js";

export class DriveScreenView extends MeanValueTheoremView {
  public constructor(model: DriveModel) {
    super(model);
  }
}
