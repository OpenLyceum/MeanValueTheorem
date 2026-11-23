import { Multilink } from "scenerystack/axon";
import { localeProperty } from "scenerystack/joist";
import { Circle, Line, Node, Rectangle } from "scenerystack/scenery";
import { StringManager } from "../i18n/StringManager.js";
import Colors from "../MeanValueTheoremColors.js";
import { button, column, computed, format, LessonView, row, slider, text } from "./LessonView.js";
import {
  averageSpeed,
  type MeanValueTheoremModel,
  matches,
  position,
  smoothRoutes,
  speed,
  tripDuration,
  tripLength,
} from "./model/MeanValueTheoremModel.js";

export class MeanValueTheoremView extends LessonView {
  public constructor(model: MeanValueTheoremModel) {
    const manager = StringManager.getInstance();
    const names = manager.getScreenNames();
    const strings = manager.getLessonStrings();
    const drive = model.mode === "drive";
    const summary = (drive ? manager.getDriveA11yStrings() : manager.getWhenItAppliesA11yStrings()).screenSummary;
    const time = model.timer.timeProperty;
    const dependencies = [model.route, time, model.prediction, model.reveal, model.hypothesis] as const;
    const route = computed([model.route], () => strings[`${model.route.value}StringProperty`].value);
    const speedReadout = computed([...dependencies], () => {
      const velocity = speed(model.route.value, time.value);
      return `${strings.speedStringProperty.value}  ${velocity === null ? strings.undefinedStringProperty.value : `${format(velocity)} m/s`}`;
    });
    const average = computed([], () => `${strings.averageStringProperty.value}  ${format(averageSpeed)} m/s`);
    const positionReadout = computed(
      dependencies,
      () => `${strings.positionStringProperty.value}  ${format(position(model.route.value, time.value))}`,
    );
    const feedback = computed([...dependencies], () => {
      const mark = model.prediction.value;
      if (drive && mark !== null) {
        return `t = ${format(mark)} s  ·  ${model.checkPrediction() ? strings.closeStringProperty.value : strings.retryStringProperty.value}`;
      }
      if (!drive && model.hypothesis.value) {
        return model.hypothesis.value === "continuity"
          ? strings.continuousAnswerStringProperty.value
          : strings.differentAnswerStringProperty.value;
      }
      return "";
    });
    const solutions = computed([...dependencies], () => {
      if (!model.reveal.value) {
        return "";
      }
      const result = matches(model.route.value);
      if (result === "all") {
        return strings.allStringProperty.value;
      }
      if (result.length === 0) {
        return strings.noneStringProperty.value;
      }
      return `${strings.matchesStringProperty.value}  ${result.map((x) => `${format(x)} s`).join(" · ")}`;
    });
    const oneSided = computed([...dependencies], () =>
      model.route.value === "corner" ? strings.oneSidedStringProperty.value : "",
    );
    super({
      title: drive ? names.driveStringProperty : names.whenItAppliesStringProperty,
      hint: summary.interactionHintStringProperty,
      playDescription: summary.playAreaStringProperty,
      controlDescription: summary.controlAreaStringProperty,
      details: computed([...dependencies], () =>
        [
          route.value,
          `t = ${format(time.value)} s`,
          positionReadout.value,
          average.value,
          speedReadout.value,
          oneSided.value,
          feedback.value,
          solutions.value,
        ]
          .filter(Boolean)
          .join(". "),
      ),
    });

    const play = computed([model.timer.isPlayingProperty], () =>
      model.timer.isPlayingProperty.value ? strings.pauseStringProperty.value : strings.playStringProperty.value,
    );
    const reveal = computed([model.reveal], () =>
      model.reveal.value ? strings.hideStringProperty.value : strings.revealStringProperty.value,
    );
    const nextRoute = () => {
      if (!drive) {
        model.changeRoute(model.route.value === "corner" ? "accelerating" : "corner");
      } else {
        const currentRoute = model.route.value === "corner" ? "accelerating" : model.route.value;
        model.changeRoute(
          smoothRoutes[(smoothRoutes.indexOf(currentRoute) + 1) % smoothRoutes.length] ?? "accelerating",
        );
      }
    };
    this.finish(
      column(
        text(route, 19, 286, true),
        button(strings.routeStringProperty, nextRoute),
        slider(strings.timeStringProperty, time, 0, tripDuration, 2, undefined, 0.05),
        row(
          button(play, () => {
            if (!model.timer.isPlayingProperty.value && time.value === tripDuration) {
              time.value = 0;
            }
            model.timer.isPlayingProperty.value = !model.timer.isPlayingProperty.value;
          }),
          button(strings.stepStringProperty, () => {
            model.timer.isPlayingProperty.value = false;
            model.stepOnce(0.1);
          }),
        ),
        text(positionReadout, 15),
        text(average, 16, 286, true),
        text(speedReadout, 15),
        text(oneSided, 14),
        ...(drive
          ? [
              button(strings.markStringProperty, () => {
                model.timer.isPlayingProperty.value = false;
                model.prediction.value = time.value;
              }),
            ]
          : [
              text(strings.conditionsStringProperty, 15),
              text(strings.whichStringProperty, 15),
              row(
                button(strings.continuityStringProperty, () => {
                  model.hypothesis.value = "continuity";
                }),
                button(strings.differentiabilityStringProperty, () => {
                  model.hypothesis.value = "differentiability";
                }),
              ),
            ]),
        button(reveal, () => {
          model.reveal.value = !model.reveal.value;
        }),
      ),
      this.makeRoad(model, feedback, solutions),
      () => model.reset(),
    );

    this.plot.onDrag((x) => {
      model.timer.isPlayingProperty.value = false;
      time.value = Math.max(0, Math.min(tripDuration, Math.round(20 * x) / 20));
    });
    Multilink.multilink([localeProperty, ...dependencies], () => this.draw(model));
  }

  private makeRoad(
    model: MeanValueTheoremModel,
    feedback: ReturnType<typeof computed>,
    solutions: ReturnType<typeof computed>,
  ): Node {
    const strings = StringManager.getInstance().getLessonStrings();
    const road = new Node();
    const width = 596;
    road.addChild(new Rectangle(7, 7, width, 24, { fill: Colors.panelBackgroundColorProperty, cornerRadius: 6 }));
    road.addChild(new Line(8, 19, width + 7, 19, { stroke: Colors.textColorProperty, lineDash: [7, 7] }));
    for (const x of [12, width + 2]) {
      road.addChild(new Line(x, 2, x, 37, { stroke: Colors.tertiaryColorProperty, lineWidth: 3 }));
    }
    const vehicle = new Node({
      y: 13,
      children: [
        new Rectangle(-11, -6, 23, 16, { fill: Colors.accentColorProperty, cornerRadius: 3 }),
        new Rectangle(-5, -11, 13, 9, { fill: Colors.accentColorProperty, cornerRadius: 3 }),
        new Circle(3.5, { x: -6, y: 10, fill: Colors.textColorProperty }),
        new Circle(3.5, { x: 7, y: 10, fill: Colors.textColorProperty }),
      ],
    });
    road.addChild(vehicle);
    Multilink.multilink([model.route, model.timer.timeProperty], (route, time) => {
      vehicle.x = 12 + ((width - 10) * position(route, time)) / tripLength;
    });
    const secant = text(strings.secantStringProperty, 14, 275);
    secant.fill = Colors.secondaryColorProperty;
    const tangent = text(strings.tangentStringProperty, 14, 275);
    tangent.fill = Colors.tertiaryColorProperty;
    return column(road, row(secant, tangent), text(feedback, 16, 610, true), text(solutions, 16, 610));
  }

  private draw(model: MeanValueTheoremModel): void {
    const plot = this.plot;
    const strings = StringManager.getInstance().getLessonStrings();
    const route = model.route.value;
    const t = model.timer.timeProperty.value;
    const s = position(route, t);
    const v = speed(route, t);
    plot.setDomain(
      [-0.35, 10.35, -7, 111],
      strings.timeStringProperty,
      strings.positionStringProperty,
      [0, 2.5, 5, 7.5, 10],
      [0, 25, 50, 75, 100],
    );
    plot.clear();
    if (model.mode === "when-it-applies") {
      const other = route === "corner" ? "accelerating" : "corner";
      plot.line(
        Array.from({ length: 101 }, (_, i) => [i / 10, position(other, i / 10)]),
        Colors.quaternaryColorProperty,
        1.7,
        [5, 4],
      );
    }
    plot.line(
      [
        [0, 0],
        [tripDuration, tripLength],
      ],
      Colors.secondaryColorProperty,
      2,
      [8, 5],
    );
    plot.line(Array.from({ length: 101 }, (_, i) => [i / 10, position(route, i / 10)]));
    plot.line(
      [
        [t, 0],
        [t, s],
      ],
      Colors.textColorProperty,
      1,
      [4, 4],
    );
    if (v !== null) {
      plot.line(
        [
          [0, s - v * t],
          [tripDuration, s + v * (tripDuration - t)],
        ],
        Colors.tertiaryColorProperty,
        2,
      );
    }
    if (model.reveal.value) {
      const result = matches(route);
      if (result === "all") {
        plot.line(
          [
            [0, 0],
            [tripDuration, tripLength],
          ],
          Colors.quaternaryColorProperty,
          4,
          [6, 4],
        );
      } else {
        for (const x of result) {
          plot.point(x, position(route, x), Colors.quaternaryColorProperty, false, 7);
        }
      }
    }
    const mark = model.prediction.value;
    if (mark !== null) {
      plot.point(mark, position(route, mark), Colors.secondaryColorProperty, true, 7);
    }
    plot.point(t, s, Colors.accentColorProperty, false, 4);
  }
}
