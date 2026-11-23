import { MeanValueTheoremView } from "../../common/MeanValueTheoremView.js";
import type { WhenItAppliesModel } from "../model/WhenItAppliesModel.js";

export class WhenItAppliesScreenView extends MeanValueTheoremView {
  public constructor(model: WhenItAppliesModel) {
    super(model);
  }
}
