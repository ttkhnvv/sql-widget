import { sql } from "@codemirror/lang-sql";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef } from "react";

interface SqlEditorProps {
  value: string;
  readOnly?: boolean;
  onChange?(value: string): void;
  /** Выделенные строки, 0-based, границы включительны. */
  onSelectRange?(fromLine: number, toLine: number): void;
}

/**
 * Редактор SQL на CodeMirror 6 с нумерацией строк.
 */
export function SqlEditor(props: SqlEditorProps) {
  const { value, readOnly = false } = props;
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
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          const { onChange, onSelectRange } = callbacks.current;
          if (update.docChanged) {
            onChange?.(update.state.doc.toString());
          }
          if (update.selectionSet) {
            const sel = update.state.selection.main;
            const doc = update.state.doc;
            onSelectRange?.(
              doc.lineAt(sel.from).number - 1,
              doc.lineAt(sel.to).number - 1,
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
  }, [value]);

  return <div className="sqlw-editor" ref={host} />;
}
