import { sql } from "@codemirror/lang-sql";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef, useState } from "react";
import initSqlJs from "sql.js";
import type { Database, QueryExecResult } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import "./styles.css";

const DEFAULT_QUERY =
  "SELECT 1 AS one, 'SQL widget demo' AS greeting;";

export function App() {
  const editorHost = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const db = useRef<Database | null>(null);
  const [result, setResult] = useState<QueryExecResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editorHost.current) return;
    const editor = new EditorView({
      doc: DEFAULT_QUERY,
      extensions: [basicSetup, sql()],
      parent: editorHost.current,
    });
    view.current = editor;
    let cancelled = false;
    initSqlJs({ locateFile: () => sqlWasmUrl }).then((SQL) => {
      if (!cancelled) db.current = new SQL.Database();
    });
    return () => {
      cancelled = true;
      editor.destroy();
      view.current = null;
    };
  }, []);

  async function runQuery() {
    const query = view.current?.state.doc.toString() ?? "";
    if (!db.current) {
      const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
      db.current = new SQL.Database();
    }
    try {
      const rows = db.current.exec(query);
      setResult(rows[0] ?? null);
      setError(rows.length === 0 ? "Пустой результат" : null);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main className="page">
      <h1>SQL Widget — демо-стенд</h1>
      <p className="subtitle">
        Этап 0: дымовой тест CodeMirror 6 + sql.js
      </p>
      <div className="editor" ref={editorHost} />
      <button type="button" onClick={() => void runQuery()}>
        Выполнить запрос
      </button>
      {error && <pre className="error">{error}</pre>}
      {result && (
        <table className="result">
          <thead>
            <tr>
              {result.columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.values.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{String(cell ?? "NULL")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
