import { KeyboardHelpIconFactory, KeyboardHelpSection, KeyboardHelpSectionRow } from "scenerystack/scenery-phet";
import { StringManager } from "../i18n/StringManager.js";

export class CarKeyboardHelpSection extends KeyboardHelpSection {
  public constructor() {
    const strings = StringManager.getInstance().getLessonStrings();
    super(strings.moveCarStringProperty, [
      KeyboardHelpSectionRow.labelWithIconList(
        strings.moveCarHelpStringProperty,
        [
          KeyboardHelpIconFactory.leftRightOrADKeysRowIcon(),
          KeyboardHelpIconFactory.shiftPlusIcon(KeyboardHelpIconFactory.leftRightOrADKeysRowIcon()),
        ],
        { labelInnerContent: strings.moveCarHelpStringProperty, labelOptions: { lineWrap: 220 } },
      ),
    ]);
  }
}
