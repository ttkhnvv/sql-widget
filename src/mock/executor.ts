import initSqlJs from "sql.js";
import type { Database, SqlValue } from "sql.js";
import type { SqlExecutor, SqlQueryResult } from "../types.js";

export interface SqlJsExecutorOptions {
  /** URL файла sql-wasm.wasm; без него sql.js ищет его сам. */
  wasmUrl?: string;
  /** Скрипт создания таблиц, выполняется при запуске. */
  schema?: string;
}

/**
 * Mock-исполнитель SQL на sql.js (реальный SQLite в WASM).
 * Каждая база живёт в памяти вкладки браузера.
 */
export async function createSqlJsExecutor(
  options: SqlJsExecutorOptions = {},
): Promise<SqlExecutor> {
  const SQL = await initSqlJs(
    options.wasmUrl
      ? { locateFile: () => options.wasmUrl as string }
      : undefined,
  );
  const db: Database = new SQL.Database();
  if (options.schema) db.run(options.schema);
  return {
    async execute(sqlText: string): Promise<SqlQueryResult> {
      const results = db.exec(sqlText);
      const first = results[0];
      if (!first) return { columns: [], rows: [] };
      return {
        columns: first.columns,
        rows: first.values as (string | number | null)[][],
      };
    },
  };
}

export type { SqlValue };
