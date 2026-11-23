import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import Colors from "../MeanValueTheoremColors.js";

function makeIcon(outline: string, points: readonly (readonly [number, number])[] = []): ScreenIcon {
  const background = new Rectangle(0, 0, 548, 373, { fill: Colors.backgroundColorProperty });
  const line = new Path(new Shape(outline), {
    stroke: Colors.accentColorProperty,
    lineWidth: 18,
    lineCap: "round",
    lineJoin: "round",
  });
  const markers = points.map(([x, y]) => new Circle(12, { x, y, fill: Colors.secondaryColorProperty }));
  return new ScreenIcon(new Node({ children: [background, line, ...markers] }), {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: Colors.backgroundColorProperty,
  });
}

export function createDriveIcon(): ScreenIcon {
  return makeIcon(
    "M 77 255 L 470 255 M 109 207 L 109 285 M 439 207 L 439 285 M 201 236 L 201 204 L 223 200 L 243 166 L 303 166 L 330 201 L 344 201 L 344 236",
    [
      [229, 237],
      [318, 237],
    ],
  );
}

export function createWhenItAppliesIcon(): ScreenIcon {
  return makeIcon("M 85 291 L 271 222 L 450 70 M 85 289 L 450 70", [[271, 222]]);
}
