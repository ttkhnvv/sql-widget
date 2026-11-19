import { EditorSelection, Prec } from "@codemirror/state";
import type { EditorState, Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";

const INDENT_SIZE = 2;
const INDENT = " ".repeat(INDENT_SIZE);

/** Действия, которые редактор запрашивает у виджета по горячим клавишам. */
export interface EditorActions {
  onRun?(): void;
  onConfirm?(): void;
  onReturn?(): void;
}

/** Действие, вызванное сочетанием клавиш. */
export type Shortcut = "run" | "confirm" | "return";

/**
 * Какое действие виджета вызывает нажатие: Ctrl/Cmd-Enter — выполнить
 * запрос, Ctrl/Cmd-Shift-Enter — главное действие роли (отправить,
 * оценить, назначить), Ctrl/Cmd-Alt-Enter — вернуть на доработку.
 */
export function shortcutOf(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): Shortcut | null {
  if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) {
    return null;
  }
  if (event.altKey) return "return";
  return event.shiftKey ? "confirm" : "run";
}

/** Начала всех строк, затронутых выделением (или курсором). */
function touchedLineStarts(state: EditorState): number[] {
  const { doc } = state;
  const starts = new Set<number>();
  for (const range of state.selection.ranges) {
    // Выделение, закончившееся в начале строки, её не задевает
    const end =
      !range.empty && doc.lineAt(range.to).from === range.to
        ? range.to - 1
        : range.to;
    for (
      let n = doc.lineAt(range.from).number;
      n <= doc.lineAt(end).number;
      n += 1
    ) {
      starts.add(doc.line(n).from);
    }
  }
  return [...starts];
}

/**
 * Tab: курсор — вставить пробелы до следующего отступа,
 * выделение — сдвинуть все затронутые строки вправо.
 * В режиме только чтения ничего не делает, и Tab переключает фокус.
 */
export function indentMore(view: EditorView): boolean {
  const { state } = view;
  if (state.readOnly) return false;
  if (state.selection.ranges.every((range) => range.empty)) {
    view.dispatch(
      state.update(
        state.changeByRange((range) => {
          const column = range.from - state.doc.lineAt(range.from).from;
          const insert = " ".repeat(INDENT_SIZE - (column % INDENT_SIZE));
          return {
            changes: { from: range.from, insert },
            range: EditorSelection.cursor(range.from + insert.length),
          };
        }),
        { scrollIntoView: true, userEvent: "input" },
      ),
    );
    return true;
  }
  view.dispatch({
    changes: touchedLineStarts(state).map((from) => ({
      from,
      insert: INDENT,
    })),
    userEvent: "input.indent",
  });
  return true;
}

/**
 * Shift-Tab: убрать один отступ (до двух пробелов или табуляцию)
 * у всех затронутых строк.
 */
export function indentLess(view: EditorView): boolean {
  const { state } = view;
  if (state.readOnly) return false;
  const changes: { from: number; to: number }[] = [];
  for (const from of touchedLineStarts(state)) {
    const match = /^( {1,2}|\t)/.exec(state.doc.lineAt(from).text);
    if (match) changes.push({ from, to: from + match[0].length });
  }
  if (changes.length > 0) {
    view.dispatch({ changes, userEvent: "delete.dedent" });
  }
  return true;
}

/**
 * Клавиши редактора: Tab и Shift-Tab (отступы), Ctrl-Enter
 * (выполнить запрос), Ctrl-Shift-Enter (главное действие роли),
 * Ctrl-Alt-Enter (вернуть на доработку). Cmd вместо Ctrl работает
 * и на macOS. Приоритет выше стандартных клавиш, где Ctrl-Enter
 * вставляет пустую строку.
 */
export function editorKeymap(actions: () => EditorActions): Extension {
  const run = () => {
    actions().onRun?.();
    return true;
  };
  const confirm = () => {
    actions().onConfirm?.();
    return true;
  };
  const giveBack = () => {
    actions().onReturn?.();
    return true;
  };
  return Prec.highest(
    keymap.of([
      { key: "Tab", run: indentMore, shift: indentLess },
      { key: "Mod-Enter", run },
      { key: "Ctrl-Enter", run },
      { key: "Mod-Shift-Enter", run: confirm },
      { key: "Ctrl-Shift-Enter", run: confirm },
      { key: "Mod-Alt-Enter", run: giveBack },
      { key: "Ctrl-Alt-Enter", run: giveBack },
    ]),
  );
}
