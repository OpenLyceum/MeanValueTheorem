/**
 * WhenItAppliesScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createWhenItAppliesIcon() in src/common/MeanValueTheoremScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createWhenItAppliesIcon } from "../common/MeanValueTheoremScreenIcons.js";
import MeanValueTheoremColors from "../MeanValueTheoremColors.js";
import { WhenItAppliesModel } from "./model/WhenItAppliesModel.js";
import { WhenItAppliesKeyboardHelpContent } from "./view/WhenItAppliesKeyboardHelpContent.js";
import { WhenItAppliesScreenView } from "./view/WhenItAppliesScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type WhenItAppliesScreenOptions = ScreenOptions & { tandem: Tandem };

export class WhenItAppliesScreen extends Screen<WhenItAppliesModel, WhenItAppliesScreenView> {
  public constructor(options: WhenItAppliesScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new WhenItAppliesModel(),
      // View factory — receives the model instance
      (model) => new WhenItAppliesScreenView(model),
      optionize<WhenItAppliesScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: MeanValueTheoremColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new WhenItAppliesKeyboardHelpContent(),
          homeScreenIcon: createWhenItAppliesIcon(),
          navigationBarIcon: createWhenItAppliesIcon(),
        },
        options,
      ),
    );
  }
}
