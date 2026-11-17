import type { SelectionRange } from "./types.js";

/**
 * Текст строк SQL-запроса, попавших в выделенный диапазон
 * (номера строк с 1, границы включительны).
 */
export function getSelectedText(sql: string, range: SelectionRange): string {
  const lines = sql.split("\n");
  return lines.slice(range.fromLine - 1, range.toLine).join("\n");
}

/**
 * Диапазон строк (с 1) из 0-based позиций строк редактора.
 */
export function toSelectionRange(
  fromLine: number,
  toLine: number,
): SelectionRange {
  return {
    fromLine: Math.min(fromLine, toLine) + 1,
    toLine: Math.max(fromLine, toLine) + 1,
  };
}
