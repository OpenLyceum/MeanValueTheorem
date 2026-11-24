import {
  BasicActionsKeyboardHelpSection,
  MoveDraggableItemsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class DriveKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    // The custom route's points are moved with the arrow keys.
    super(
      [new MoveDraggableItemsKeyboardHelpSection(), new SliderControlsKeyboardHelpSection()],
      [new BasicActionsKeyboardHelpSection()],
    );
  }
}
