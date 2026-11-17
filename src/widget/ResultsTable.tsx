import type { SqlQueryResult } from "../types.js";

interface ResultsTableProps {
  result: SqlQueryResult | null;
  error: string | null;
}

/**
 * Таблица результатов исполнения SQL или сообщение об ошибке.
 */
export function ResultsTable({ result, error }: ResultsTableProps) {
  if (error) return <pre className="sqlw-error">{error}</pre>;
  if (!result) return null;
  if (result.columns.length === 0) {
    return <p className="sqlw-muted">Запрос не вернул строк</p>;
  }
  return (
    <table className="sqlw-result">
      <thead>
        <tr>
          {result.columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell === null ? "NULL" : String(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
