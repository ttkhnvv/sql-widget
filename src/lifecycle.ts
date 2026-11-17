import type { CardStatus } from "./types.js";

const TRANSITIONS: Record<CardStatus, CardStatus[]> = {
  draft: ["assigned"],
  assigned: ["in_progress"],
  in_progress: ["submitted"],
  submitted: ["reviewed", "in_progress"],
  reviewed: [],
};

/**
 * Допустим ли переход карточки из статуса `from` в статус `to`.
 * Цикл: draft → assigned → in_progress → submitted → reviewed;
 * из submitted возможен возврат на доработку (in_progress).
 */
export function canTransition(from: CardStatus, to: CardStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
