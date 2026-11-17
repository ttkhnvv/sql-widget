import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import type { SelectionRange } from "../types.js";

const mark = Decoration.mark({ class: "sqlw-highlight" });

const setHighlight = StateEffect.define<{
  from: number;
  to: number;
} | null>();

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    value = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (!effect.is(setHighlight)) continue;
      if (!effect.value) {
        value = Decoration.none;
        continue;
      }
      const builder = new RangeSetBuilder<Decoration>();
      builder.add(effect.value.from, effect.value.to, mark);
      value = builder.finish();
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * Расширение CodeMirror для подсветки строк, выделенных
 * второй ролью в общем рабочем пространстве.
 */
export const highlightExtension = [highlightField];

/**
 * Подсветить диапазон строк (номера с 1) в открытом редакторе.
 */
export function applyHighlight(
  view: EditorView,
  range: SelectionRange | null,
): void {
  if (!range) {
    view.dispatch({ effects: setHighlight.of(null) });
    return;
  }
  const doc = view.state.doc;
  const fromLine = Math.min(Math.max(range.fromLine, 1), doc.lines);
  const toLine = Math.min(Math.max(range.toLine, 1), doc.lines);
  view.dispatch({
    effects: setHighlight.of({
      from: doc.line(fromLine).from,
      to: doc.line(toLine).to,
    }),
  });
}
