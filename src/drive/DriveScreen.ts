/**
 * DriveScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createDriveIcon() in src/common/MeanValueTheoremScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createDriveIcon } from "../common/MeanValueTheoremScreenIcons.js";
import MeanValueTheoremColors from "../MeanValueTheoremColors.js";
import { DriveModel } from "./model/DriveModel.js";
import { DriveKeyboardHelpContent } from "./view/DriveKeyboardHelpContent.js";
import { DriveScreenView } from "./view/DriveScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type DriveScreenOptions = ScreenOptions & { tandem: Tandem };

export class DriveScreen extends Screen<DriveModel, DriveScreenView> {
  public constructor(options: DriveScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new DriveModel(),
      // View factory — receives the model instance
      (model) => new DriveScreenView(model),
      optionize<DriveScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: MeanValueTheoremColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new DriveKeyboardHelpContent(),
          homeScreenIcon: createDriveIcon(),
          navigationBarIcon: createDriveIcon(),
        },
        options,
      ),
    );
  }
}
