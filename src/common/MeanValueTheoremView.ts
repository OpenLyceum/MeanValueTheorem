import { DerivedProperty, Multilink } from "scenerystack/axon";
import { Range, roundSymmetric } from "scenerystack/dot";
import { localeProperty } from "scenerystack/joist";
import { Shape } from "scenerystack/kite";
import { StringUtils } from "scenerystack/phetcommon";
import { Circle, DragListener, KeyboardDragListener, Line, Node, Rectangle } from "scenerystack/scenery";
import { StringManager } from "../i18n/StringManager.js";
import Colors from "../MeanValueTheoremColors.js";
import {
  button,
  type Choice,
  column,
  comboBox,
  computed,
  format,
  LessonView,
  niceTicks,
  Plot,
  richText,
  row,
  slider,
  text,
} from "./LessonView.js";
import {
  functions,
  type Graph,
  type GraphId,
  graphFor,
  type Hypothesis,
  knotTimes,
  type MeanValueTheoremModel,
  routes,
  tripDuration,
  tripLength,
} from "./model/MeanValueTheoremModel.js";

// Each arrow-key press moves a custom route point by this many metres (Shift: a quarter).
const KNOT_KEY_STEP = 4;
const CAR_KEYBOARD_STEP_METRES = 4;
// Each arrow-key press moves a checkpoint by this fraction of the window (Shift: a quarter).
const BOUND_KEY_FRACTION = 0.025;
const MAIN_PLOT_HEIGHT = 225;
const SPEED_PLOT_HEIGHT = 118;
const ROAD_WIDTH = 596;
type Handle = ReturnType<LessonView["plot"]["handle"]>;
type Point = [number, number];

/**
 * Samples f across the window as polylines, broken at undefined values, at the graph's breaks
 * and at jumps larger than `jump` (poles).
 */
function pieces(g: (x: number) => number | null, graph: Graph, jump: number): Point[][] {
  const [low, high] = graph.domain;
  const count = 600;
  const result: Point[][] = [];
  let current: Point[] = [];
  for (let i = 0; i <= count; i++) {
    const x = low + ((high - low) * i) / count;
    const previous = current[current.length - 1];
    const y = g(x);
    const crossed = previous && graph.breaks.some((b) => previous[0] < b.x && b.x <= x);
    if (y === null || !Number.isFinite(y) || crossed || (previous && Math.abs(y - previous[1]) > jump)) {
      if (current.length > 1) {
        result.push(current);
      }
      current = y === null || !Number.isFinite(y) ? [] : [[x, y]];
      continue;
    }
    current.push([x, y]);
  }
  if (current.length > 1) {
    result.push(current);
  }
  return result;
}

/** A y-range that holds the curve, cutting off the far ends of a pole, and the given extra values. */
function yRange(values: readonly number[], extra: readonly number[], robust: boolean): [number, number] {
  const sorted = values.filter(Number.isFinite).sort((p, q) => p - q);
  const pick = (q: number) => sorted[Math.floor(q * (sorted.length - 1))] ?? 0;
  let low = robust ? pick(0.06) : (sorted[0] ?? 0);
  let high = robust ? pick(0.94) : (sorted[sorted.length - 1] ?? 0);
  for (const value of extra) {
    if (Number.isFinite(value)) {
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
  }
  const pad = Math.max((high - low) * 0.1, 0.5);
  return [low - pad, high + pad];
}

export class MeanValueTheoremView extends LessonView {
  public constructor(model: MeanValueTheoremModel) {
    const manager = StringManager.getInstance();
    const names = manager.getScreenNames();
    const strings = manager.getLessonStrings();
    const drive = model.mode === "drive";
    const summary = (drive ? manager.getDriveA11yStrings() : manager.getWhenItAppliesA11yStrings()).screenSummary;
    const point = model.point;
    const dependencies = [
      model.graph,
      model.interval,
      point,
      model.prediction,
      model.reveal,
      model.hypothesis,
      model.knots,
      model.challenge,
    ] as const;
    const v = drive ? "t" : "x";
    const unit = (value: string, suffix: string) => (drive ? `${value} ${suffix}` : value);
    const intervalReadout = computed([...dependencies], () => {
      const [a, b] = model.interval.value;
      return `[a, b] = [${unit(format(a), "s")}, ${unit(format(b), "s")}]`;
    });
    const valueReadout = computed([...dependencies], () => {
      const y = model.current.f(point.value);
      const shown = y === null ? strings.undefinedStringProperty.value : unit(format(y), "m");
      return `${v} = ${unit(format(point.value), "s")}   ${drive ? "s" : "f"}(${v}) = ${shown}`;
    });
    const averageReadout = computed([...dependencies], () => {
      const average = model.average;
      const label = drive ? strings.averageStringProperty : strings.secantStringProperty;
      return `${label.value}  ${average === null ? strings.undefinedStringProperty.value : unit(format(average), "m/s")}`;
    });
    const slopeReadout = computed([...dependencies], () => {
      const slope = model.current.df(point.value);
      const label = drive ? strings.speedStringProperty : strings.tangentStringProperty;
      return `${label.value}  ${slope === null ? strings.undefinedStringProperty.value : unit(format(slope), "m/s")}`;
    });
    const feedback = computed([...dependencies], () => {
      const mark = model.prediction.value;
      if (drive && mark !== null) {
        return `t = ${format(mark)} s  ·  ${strings[`${model.predictionResult() ?? "retry"}StringProperty`].value}`;
      }
      if (drive && model.challenge.value) {
        return strings.challengePromptStringProperty.value;
      }
      const guess = model.hypothesis.value;
      if (!drive && guess) {
        const actual = model.failing;
        const breakPoint = model.current.breaks[0];
        const explanation = StringUtils.fillIn(strings[`${actual}ExplanationStringProperty`].value, {
          x: format(breakPoint?.x ?? 0),
          kind: breakPoint ? strings[`${breakPoint.kind}StringProperty`].value : "",
        });
        return `${guess === actual ? strings.rightStringProperty.value : strings.wrongStringProperty.value} ${explanation}`;
      }
      return "";
    });
    const solutions = computed([...dependencies], () => {
      if (!model.reveal.value) {
        return "";
      }
      const result = model.solutions;
      if (result === "all") {
        return strings.allStringProperty.value;
      }
      if (result.length === 0) {
        return strings.noneStringProperty.value;
      }
      return `${strings.matchesStringProperty.value}  ${result.map((c) => unit(format(c), "s")).join(" · ")}`;
    });
    const plain = (markup: string) =>
      markup
        .replace(/<sup>([^<]*)<\/sup>/g, "^$1")
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<");
    const graphName = (id: GraphId) =>
      drive ? strings[`${id as (typeof routes)[number]}StringProperty`].value : plain(graphFor(id).label);
    super({
      title: drive ? names.driveStringProperty : names.whenItAppliesStringProperty,
      hint: summary.interactionHintStringProperty,
      playDescription: summary.playAreaStringProperty,
      controlDescription: summary.controlAreaStringProperty,
      plotHeight: MAIN_PLOT_HEIGHT,
      details: computed([...dependencies, feedback, solutions], () =>
        [
          graphName(model.graph.value),
          intervalReadout.value,
          valueReadout.value,
          averageReadout.value,
          slopeReadout.value,
          feedback.value,
          solutions.value,
        ]
          .filter(Boolean)
          .join(". "),
      ),
    });

    const choices: Choice<GraphId>[] = (drive ? routes : functions).map((id) => ({
      value: id,
      label: drive ? strings[`${id as (typeof routes)[number]}StringProperty`] : graphFor(id).label,
      name: drive ? strings[`${id as (typeof routes)[number]}StringProperty`] : plain(graphFor(id).label),
    }));
    const graphBox = comboBox(
      model.graph,
      choices,
      this.listParent,
      drive ? strings.routeStringProperty : strings.functionStringProperty,
      292,
    );
    const reveal = computed([model.reveal], () =>
      model.reveal.value ? strings.hideStringProperty.value : strings.revealStringProperty.value,
    );
    const revealButton = button(reveal, () => {
      model.reveal.value = !model.reveal.value;
    });
    let controls: Node;
    if (drive) {
      const play = computed([model.timer.isPlayingProperty], () =>
        model.timer.isPlayingProperty.value ? strings.pauseStringProperty.value : strings.playStringProperty.value,
      );
      controls = column(
        graphBox,
        text(intervalReadout, 15, 292),
        slider(strings.timeStringProperty, point, 0, tripDuration, 2, undefined, 0.05),
        row(
          button(play, () => {
            if (!model.timer.isPlayingProperty.value && point.value === tripDuration) {
              point.value = 0;
            }
            model.timer.isPlayingProperty.value = !model.timer.isPlayingProperty.value;
          }),
          button(strings.stepStringProperty, () => {
            model.timer.isPlayingProperty.value = false;
            model.stepOnce(0.1);
          }),
        ),
        text(valueReadout, 15),
        text(averageReadout, 16, 292, true),
        text(slopeReadout, 15),
        row(
          button(strings.markStringProperty, () => {
            model.timer.isPlayingProperty.value = false;
            model.prediction.value = point.value;
          }),
          button(strings.newChallengeStringProperty, () => model.newChallenge()),
        ),
        revealButton,
      );
    } else {
      // One slider serves every function: its track spans all windows, and the current one is enabled.
      const [low, high] = [-2.5, 8.5];
      const enabledRangeProperty = new DerivedProperty([model.graph], () => new Range(...model.current.domain));
      const guesses = (["applies", "continuity", "differentiability"] as const satisfies readonly Hypothesis[]).map(
        (guess) =>
          button(strings[`${guess}StringProperty`], () => {
            model.hypothesis.value = guess;
          }),
      );
      const xSlider = slider(strings.xStringProperty, point, low, high, 2, undefined, 0.05, enabledRangeProperty);
      controls = column(
        graphBox,
        text(intervalReadout, 15, 292),
        xSlider,
        text(valueReadout, 15),
        text(averageReadout, 15, 292, true),
        text(slopeReadout, 15),
        richText(strings.conditionsStringProperty, 13, 292, false, true),
        text(strings.whichStringProperty, 14, 292, true),
        row(...guesses.slice(0, 2)),
        row(...guesses.slice(2), revealButton),
      );
    }
    const secantLegend = text(drive ? strings.averageLineStringProperty : strings.secantStringProperty, 14, 200);
    secantLegend.fill = Colors.secondaryColorProperty;
    const tangentLegend = text(strings.tangentLineStringProperty, 14, 200);
    tangentLegend.fill = Colors.tertiaryColorProperty;
    const matchLegend = text(strings.matchesStringProperty, 14, 200);
    matchLegend.fill = Colors.quaternaryColorProperty;
    this.speedPlot = new Plot(this.notesWidth, SPEED_PLOT_HEIGHT);
    this.finish(
      controls,
      column(
        this.speedPlot,
        ...(drive ? [this.makeRoad(model)] : []),
        row(secantLegend, tangentLegend, matchLegend),
        text(feedback, 15, this.notesWidth, true),
        text(solutions, 15, this.notesWidth),
      ),
      () => model.reset(),
    );

    const setPoint = (x: number) => {
      model.timer.isPlayingProperty.value = false;
      const [low, high] = model.current.domain;
      point.value = Math.max(drive ? 0 : low, Math.min(drive ? tripDuration : high, roundSymmetric(20 * x) / 20));
    };
    this.plot.onDrag((x) => setPoint(x));
    this.pointHandle = this.plot.handle({
      cursor: "ew-resize",
      start: () => {
        model.timer.isPlayingProperty.value = false;
      },
      drag: (x) => setPoint(this.plot.modelX(x)),
      readout: () => valueReadout.value,
    });
    this.boundHandles = ([0, 1] as const).map((side) =>
      this.plot.handle({
        fill: Colors.secondaryColorProperty,
        cursor: "ew-resize",
        drag: (x) => model.moveBound(side, this.plot.modelX(x)),
        readout: () => `${side === 0 ? "a" : "b"} = ${format(model.interval.value[side])}`,
        keyboard: {
          name: side === 0 ? strings.boundAStringProperty : strings.boundBStringProperty,
          direction: "leftRight",
          step: (dx) => {
            const [low, high] = model.current.domain;
            model.moveBound(side, model.interval.value[side] + dx * BOUND_KEY_FRACTION * (high - low));
          },
        },
      }),
    );
    // The custom route's interior points have no slider, so these grips take the keyboard too.
    this.knotHandles = drive
      ? knotTimes.slice(1, -1).map((knotTime, i) =>
          this.plot.handle({
            fill: Colors.textColorProperty,
            cursor: "ns-resize",
            start: () => {
              model.timer.isPlayingProperty.value = false;
            },
            drag: (_x, y) => model.moveKnot(i + 1, this.plot.modelY(y)),
            readout: () => `s(${format(knotTime)}) = ${format(model.knots.value[i + 1] ?? 0)} m`,
            keyboard: {
              name: computed(
                [strings.routePointStringProperty],
                () => `${strings.routePointStringProperty.value} ${format(knotTime)} s`,
              ),
              direction: "upDown",
              step: (_dx, dy) => model.moveKnot(i + 1, (model.knots.value[i + 1] ?? 0) + dy * KNOT_KEY_STEP),
            },
          }),
        )
      : [];
    Multilink.multilink([localeProperty, ...dependencies], () => this.draw(model));
  }

  private readonly speedPlot: Plot;
  private readonly pointHandle: Handle;
  private readonly boundHandles: Handle[];
  private readonly knotHandles: Handle[];

  /** The car on its road, dragged or moved with the arrow keys by distance. */
  private makeRoad(model: MeanValueTheoremModel): Node {
    const strings = StringManager.getInstance().getLessonStrings();
    const road = new Node();
    const width = ROAD_WIDTH;
    road.addChild(new Rectangle(7, 7, width, 24, { fill: Colors.panelBackgroundColorProperty, cornerRadius: 6 }));
    road.addChild(new Line(8, 19, width + 7, 19, { stroke: Colors.textColorProperty, lineDash: [7, 7] }));
    const flags = [0, 1].map(() => new Line(0, 2, 0, 37, { stroke: Colors.secondaryColorProperty, lineWidth: 3 }));
    for (const flag of flags) {
      road.addChild(flag);
    }
    const roadX = (distance: number) => 12 + ((width - 10) * distance) / tripLength;
    const vehicle = new Node({
      y: 13,
      tagName: "div",
      focusable: true,
      accessibleName: strings.carHandleStringProperty,
      accessibleRoleDescription: "movable",
      children: [
        new Rectangle(-11, -6, 23, 16, { fill: Colors.accentColorProperty, cornerRadius: 3 }),
        new Rectangle(-5, -11, 13, 9, { fill: Colors.accentColorProperty, cornerRadius: 3 }),
        new Circle(3.5, { x: -6, y: 10, fill: Colors.textColorProperty }),
        new Circle(3.5, { x: 7, y: 10, fill: Colors.textColorProperty }),
      ],
    });
    road.addChild(vehicle);
    vehicle.cursor = "ew-resize";
    vehicle.touchArea = Shape.rect(-22, -20, 44, 44);
    vehicle.mouseArea = Shape.rect(-14, -13, 28, 28);
    // The route may turn back, so a distance can be reached at several times: take the one
    // nearest the current time.
    const timeAt = (distance: number) => {
      const f = model.current.f;
      const now = model.timer.timeProperty.value;
      let best = now;
      let score = Number.POSITIVE_INFINITY;
      for (let i = 0; i <= 400; i++) {
        const t = (tripDuration * i) / 400;
        const value = Math.abs((f(t) ?? 0) - distance) + 0.5 * Math.abs(t - now);
        if (value < score) {
          score = value;
          best = t;
        }
      }
      return roundSymmetric(20 * best) / 20;
    };
    let grabOffset = 0;
    const localX = (pointer: Parameters<Node["globalToLocalPoint"]>[0]) => road.globalToLocalPoint(pointer).x;
    const vehicleListener = new DragListener({
      start: (event) => {
        model.timer.isPlayingProperty.value = false;
        grabOffset = vehicle.x - localX(event.pointer.point);
      },
      drag: (event) => {
        const distance = ((localX(event.pointer.point) + grabOffset - 12) * tripLength) / (width - 10);
        model.timer.timeProperty.value = timeAt(distance);
      },
    });
    const keyboardListener = new KeyboardDragListener({
      keyboardDragDirection: "leftRight",
      dragDelta: CAR_KEYBOARD_STEP_METRES,
      shiftDragDelta: CAR_KEYBOARD_STEP_METRES / 4,
      drag: (_event, listener) => {
        model.timer.isPlayingProperty.value = false;
        const here = model.current.f(model.timer.timeProperty.value) ?? 0;
        model.timer.timeProperty.value = timeAt(here + listener.modelDelta.x);
      },
    });
    vehicle.addInputListener(vehicleListener);
    vehicle.addInputListener(keyboardListener);
    vehicle.addDisposable({
      dispose: () => {
        vehicle.removeInputListener(keyboardListener);
        vehicle.removeInputListener(vehicleListener);
        keyboardListener.dispose();
        vehicleListener.dispose();
      },
    });
    vehicle.addDisposable(
      Multilink.multilink([model.graph, model.timer.timeProperty, model.knots, model.interval], () => {
        const f = model.current.f;
        vehicle.x = roadX(Math.max(0, Math.min(tripLength, f(model.timer.timeProperty.value) ?? 0)));
        model.interval.value.forEach((checkpoint, i) => {
          const flag = flags[i];
          if (flag) {
            flag.x = roadX(Math.max(0, Math.min(tripLength, f(checkpoint) ?? 0)));
          }
        });
      }),
    );
    return road;
  }

  private draw(model: MeanValueTheoremModel): void {
    const plot = this.plot;
    const strings = StringManager.getInstance().getLessonStrings();
    const drive = model.mode === "drive";
    const graph = model.current;
    const [low, high] = graph.domain;
    const [a, b] = model.interval.value;
    const x = model.point.value;
    const y = graph.f(x);
    const slope = graph.df(x);
    const average = model.average;
    const fa = graph.f(a);
    const fb = graph.f(b);
    const robust = graph.breaks.some((point) => point.kind === "pole");
    const samples = Array.from({ length: 401 }, (_, i) => graph.f(low + ((high - low) * i) / 400) ?? Number.NaN);
    const [bottom, top] = drive ? [-7, 111] : yRange(samples, [0, fa ?? Number.NaN, fb ?? Number.NaN], robust);
    const pad = (high - low) * 0.03;
    plot.setDomain(
      [low - pad, high + pad, bottom, top],
      drive ? strings.timeStringProperty : "x",
      drive ? strings.positionStringProperty : "f(x)",
      niceTicks(low, high, 8),
      niceTicks(bottom, top, 4),
    );
    plot.clear();
    // Checkpoints and the secant through them.
    for (const bound of [a, b]) {
      plot.line(
        [
          [bound, bottom],
          [bound, top],
        ],
        Colors.secondaryColorProperty,
        1,
        [3, 4],
      );
    }
    if (average !== null && fa !== null) {
      plot.line(
        [
          [low - pad, fa + average * (low - pad - a)],
          [high + pad, fa + average * (high + pad - a)],
        ],
        Colors.secondaryColorProperty,
        2,
        [8, 5],
      );
    }
    for (const piece of pieces(graph.f, graph, (top - bottom) * 0.6)) {
      plot.line(piece);
    }
    this.markBreaks(graph, bottom, top);
    if (model.reveal.value && average !== null) {
      const result = model.solutions;
      if (result !== "all") {
        for (const c of result) {
          const fc = graph.f(c) ?? 0;
          const span = (high - low) * 0.12;
          plot.line(
            [
              [c - span, fc - average * span],
              [c + span, fc + average * span],
            ],
            Colors.quaternaryColorProperty,
            3,
          );
          plot.point(c, fc, Colors.quaternaryColorProperty, false, 6);
        }
      }
    }
    if (y !== null) {
      plot.line(
        [
          [x, bottom],
          [x, y],
        ],
        Colors.textColorProperty,
        1,
        [4, 4],
      );
      if (slope !== null) {
        plot.line(
          [
            [low - pad, y + slope * (low - pad - x)],
            [high + pad, y + slope * (high + pad - x)],
          ],
          Colors.tertiaryColorProperty,
          2,
        );
      }
    }
    const mark = model.prediction.value;
    if (mark !== null) {
      plot.point(mark, graph.f(mark) ?? 0, Colors.secondaryColorProperty, true, 7);
    }
    this.pointHandle.place(plot.plotX(x), plot.plotY(y ?? 0));
    this.boundHandles.forEach((handle, side) => {
      const bound = model.interval.value[side as 0 | 1];
      const value = graph.f(bound);
      handle.place(plot.plotX(bound), plot.plotY(value === null ? bottom : Math.max(bottom, Math.min(top, value))));
    });
    this.knotHandles.forEach((handle, i) => {
      handle.place(plot.plotX(knotTimes[i + 1] ?? 0), plot.plotY(model.knots.value[i + 1] ?? 0));
      handle.visible &&= model.graph.value === "custom";
    });
    this.drawSpeed(model);
  }

  /** Open and filled dots at a jump, and a dashed asymptote at a pole. */
  private markBreaks(graph: Graph, bottom: number, top: number): void {
    const plot = this.plot;
    for (const { x, kind } of graph.breaks) {
      if (kind === "pole") {
        plot.line(
          [
            [x, bottom],
            [x, top],
          ],
          Colors.textColorProperty,
          1,
          [6, 5],
        );
      } else if (kind === "jump") {
        const left = graph.f(x - 1e-9) ?? 0;
        plot.point(x, left, Colors.accentColorProperty, true);
        plot.point(x, graph.f(x) ?? 0, Colors.accentColorProperty);
      }
    }
  }

  /** f′ (or speed) with the secant slope as a level line: the c values are where they meet. */
  private drawSpeed(model: MeanValueTheoremModel): void {
    const plot = this.speedPlot;
    const strings = StringManager.getInstance().getLessonStrings();
    const drive = model.mode === "drive";
    const graph = model.current;
    const [low, high] = graph.domain;
    const [a, b] = model.interval.value;
    const average = model.average;
    const robust = graph.breaks.some((point) => point.kind === "pole" || point.kind === "cusp");
    const samples = Array.from({ length: 401 }, (_, i) => graph.df(low + ((high - low) * i) / 400) ?? Number.NaN);
    const [bottom, top] = yRange(samples, [0, average ?? Number.NaN], robust);
    const pad = (high - low) * 0.03;
    plot.setDomain(
      [low - pad, high + pad, bottom, top],
      "",
      drive ? strings.speedAxisStringProperty : "f′(x)",
      niceTicks(low, high, 8),
      niceTicks(bottom, top, 3),
      { x: () => "" },
    );
    plot.clear();
    if (average !== null) {
      plot.line(
        [
          [low - pad, average],
          [high + pad, average],
        ],
        Colors.secondaryColorProperty,
        1,
        [8, 5],
      );
      plot.region(
        [
          [a, bottom],
          [b, bottom],
          [b, top],
          [a, top],
        ],
        Colors.positiveFillColorProperty,
      );
    }
    for (const piece of pieces(graph.df, graph, (top - bottom) * 0.6)) {
      plot.line(piece, Colors.tertiaryColorProperty);
    }
    const x = model.point.value;
    plot.line(
      [
        [x, bottom],
        [x, top],
      ],
      Colors.textColorProperty,
      1,
      [4, 4],
    );
    const slope = graph.df(x);
    if (slope !== null) {
      plot.point(x, slope, Colors.tertiaryColorProperty, false, 4);
    }
    if (model.reveal.value && average !== null) {
      const result = model.solutions;
      if (result !== "all") {
        for (const c of result) {
          plot.point(c, average, Colors.quaternaryColorProperty, false, 5);
        }
      }
    }
  }
}
