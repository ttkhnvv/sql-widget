import { describe, expect, test } from "vitest";
import { canTransition } from "./lifecycle.js";
import { calculateScore } from "./score.js";
import { getSelectedText, toSelectionRange } from "./selection.js";
import type { TaskCard } from "./types.js";

function makeCard(overrides: Partial<TaskCard> = {}): TaskCard {
  return {
    id: "card-1",
    prompt: "Выбери все строки",
    maxScore: 10,
    hints: [
      { id: "h1", text: "Первая", penalty: 2 },
      { id: "h2", text: "Вторая", penalty: 3 },
    ],
    assigneeId: "student-1",
    status: "assigned",
    usedHintIds: [],
    ...overrides,
  };
}

describe("calculateScore", () => {
  test("без подсказок — полный балл", () => {
    expect(calculateScore(makeCard())).toBe(10);
  });

  test("вычитает пенальти раскрытых подсказок", () => {
    const card = makeCard({ usedHintIds: ["h1", "h2"] });
    expect(calculateScore(card)).toBe(5);
  });

  test("не опускается ниже нуля", () => {
    const card = makeCard({
      maxScore: 3,
      usedHintIds: ["h1", "h2"],
    });
    expect(calculateScore(card)).toBe(0);
  });

  test("игнорирует неизвестные id подсказок", () => {
    const card = makeCard({ usedHintIds: ["nope"] });
    expect(calculateScore(card)).toBe(10);
  });
});

describe("canTransition", () => {
  test("линейный жизненный цикл", () => {
    expect(canTransition("draft", "assigned")).toBe(true);
    expect(canTransition("assigned", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "submitted")).toBe(true);
    expect(canTransition("submitted", "reviewed")).toBe(true);
    expect(canTransition("submitted", "in_progress")).toBe(true);
  });

  test("запрещает пропуски и возвраты", () => {
    expect(canTransition("draft", "submitted")).toBe(false);
    expect(canTransition("reviewed", "in_progress")).toBe(false);
    expect(canTransition("assigned", "assigned")).toBe(false);
  });
});

describe("getSelectedText / toSelectionRange", () => {
  const sql = "SELECT a\nFROM t\nWHERE a > 1";

  test("одна строка", () => {
    const text = getSelectedText(sql, { fromLine: 2, toLine: 2 });
    expect(text).toBe("FROM t");
  });

  test("диапазон строк", () => {
    const text = getSelectedText(sql, { fromLine: 1, toLine: 2 });
    expect(text).toBe("SELECT a\nFROM t");
  });

  test("toSelectionRange нормализует порядок и 0-based ввод", () => {
    expect(toSelectionRange(2, 0)).toEqual({
      fromLine: 1,
      toLine: 3,
    });
  });
});
