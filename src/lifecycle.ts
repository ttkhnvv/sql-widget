import type { CardStatus } from "./types.js";

const TRANSITIONS: Record<CardStatus, CardStatus[]> = {
  draft: ["assigned"],
  assigned: ["in_progress"],
  in_progress: ["submitted"],
  submitted: ["reviewed"],
  reviewed: [],
};

/**
 * Допустим ли переход карточки из статуса `from` в статус `to`.
 * Жизненный цикл линеен: draft → assigned → in_progress →
 * submitted → reviewed.
 */
export function canTransition(from: CardStatus, to: CardStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
