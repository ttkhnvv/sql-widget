import { sql } from "@codemirror/lang-sql";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef } from "react";
import { toSelectionRange } from "../selection.js";
import type { SelectionRange } from "../types.js";
import { applyHighlight, highlightExtension } from "./highlight.js";
import { syntaxExtension } from "./syntax.js";

interface SqlEditorProps {
  value: string;
  readOnly?: boolean;
  /** Строки, подсвеченные второй ролью. */
  highlight?: SelectionRange | null;
  onChange?(value: string): void;
  onSelectRange?(range: SelectionRange | null): void;
}

/**
 * Редактор SQL на CodeMirror 6: нумерация строк, выделение
 * строк мышью и подсветка строк второй роли.
 */
export function SqlEditor(props: SqlEditorProps) {
  const { value, readOnly = false, highlight = null } = props;
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef(props);
  callbacks.current = props;

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      doc: callbacks.current.value,
      extensions: [
        basicSetup,
        sql(),
        syntaxExtension,
        highlightExtension,
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          const { onChange, onSelectRange } = callbacks.current;
          if (update.docChanged) {
            onChange?.(update.state.doc.toString());
          }
          if (update.selectionSet && onSelectRange) {
            const sel = update.state.selection.main;
            const doc = update.state.doc;
            onSelectRange(
              toSelectionRange(
                doc.lineAt(sel.from).number - 1,
                doc.lineAt(sel.to).number - 1,
              ),
            );
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
    applyHighlight(editor, highlight);
  }, [value, highlight]);

  return <div className="sqlw-editor" ref={host} />;
}
