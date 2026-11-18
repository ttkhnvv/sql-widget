import { sql } from "@codemirror/lang-sql";
import { EditorState } from "@codemirror/state";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef } from "react";
import { toSelectionRange } from "../selection.js";
import type { SelectionRange } from "../types.js";
import { applyHighlight, highlightExtension } from "./highlight.js";
import { editorKeymap } from "./keymap.js";
import { syntaxExtension } from "./syntax.js";

interface SqlEditorProps {
  value: string;
  readOnly?: boolean;
  /** Строки, подсвеченные второй ролью. */
  highlight?: SelectionRange | null;
  onChange?(value: string): void;
  onSelectRange?(range: SelectionRange | null): void;
  /** Ctrl-Enter в редакторе. */
  onRun?(): void;
  /** Ctrl-Shift-Enter в редакторе. */
  onSubmit?(): void;
}

/**
 * Редактор SQL на CodeMirror 6: нумерация строк, выделение
 * строк мышью (onSelectRange, null — выделения нет), подсветка
 * зафиксированных строк, Tab для отступов и горячие клавиши
 * запуска и отправки.
 */
export function SqlEditor(props: SqlEditorProps) {
  const { value, readOnly = false, highlight = null } = props;
  const fromLine = highlight?.fromLine;
  const toLine = highlight?.toLine;
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef(props);
  callbacks.current = props;

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      doc: callbacks.current.value,
      extensions: [
        editorKeymap(() => callbacks.current),
        basicSetup,
        sql(),
        syntaxExtension,
        highlightExtension,
        // readOnly, а не editable=false: выделять строки можно всегда
        EditorState.readOnly.of(readOnly),
        EditorView.updateListener.of((update) => {
          const { onChange, onSelectRange } = callbacks.current;
          if (update.docChanged) {
            onChange?.(update.state.doc.toString());
          }
          if (update.selectionSet && onSelectRange) {
            const sel = update.state.selection.main;
            const doc = update.state.doc;
            if (sel.empty) {
              onSelectRange(null);
            } else {
              // Выделение, закончившееся в начале строки, её не задевает
              const end =
                doc.lineAt(sel.to).from === sel.to ? sel.to - 1 : sel.to;
              onSelectRange(
                toSelectionRange(
                  doc.lineAt(sel.from).number - 1,
                  doc.lineAt(end).number - 1,
                ),
              );
            }
          }
        }),
      ],
      parent: host.current,
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [readOnly]);

  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current !== value) {
      editor.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const range =
      fromLine === undefined || toLine === undefined
        ? null
        : { fromLine, toLine };
    applyHighlight(editor, range);
  }, [fromLine, toLine, readOnly]);

  return <div className="sqlw-editor" ref={host} />;
}
