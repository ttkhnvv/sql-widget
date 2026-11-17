import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import type { Text } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import type { SelectionRange } from "../types.js";

const mark = Decoration.line({ class: "sqlw-highlight" });

const setHighlight = StateEffect.define<SelectionRange | null>();

function lineDecorations(doc: Text, range: SelectionRange): DecorationSet {
  const fromLine = Math.min(Math.max(range.fromLine, 1), doc.lines);
  const toLine = Math.min(Math.max(range.toLine, 1), doc.lines);
  const builder = new RangeSetBuilder<Decoration>();
  for (let n = fromLine; n <= toLine; n += 1) {
    const from = doc.line(n).from;
    builder.add(from, from, mark);
  }
  return builder.finish();
}

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
      value = lineDecorations(tr.state.doc, effect.value);
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
  view.dispatch({ effects: setHighlight.of(range) });
}
