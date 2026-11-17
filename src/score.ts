import type { TaskCard } from "./types.js";

/**
 * Итоговый балл за карточку: базовый балл минус пенальти
 * за раскрытые подсказки, но не ниже нуля.
 */
export function calculateScore(card: TaskCard): number {
  const penalty = card.hints
    .filter((hint) => card.usedHintIds.includes(hint.id))
    .reduce((sum, hint) => sum + hint.penalty, 0);
  return Math.max(0, card.maxScore - penalty);
}
