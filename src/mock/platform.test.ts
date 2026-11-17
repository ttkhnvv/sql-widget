import { beforeEach, describe, expect, test } from "vitest";
import { MOCK_CARDS } from "./data.js";
import { MockPlatform } from "./platform.js";

/** Ожидает применения отложенной мутации (LATENCY_MS = 300). */
function flush(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("MockPlatform", () => {
  let platform: MockPlatform;
  const cardId = MOCK_CARDS[0].id;

  beforeEach(() => {
    platform = new MockPlatform(MOCK_CARDS);
  });

  test("submit сохраняет запрос, выделение и статус", async () => {
    platform.submit(cardId, "SELECT 1", { fromLine: 2, toLine: 3 });
    await flush();
    expect(platform.getCard(cardId)?.status).toBe("submitted");
    const solution = platform.getSolution(cardId);
    expect(solution?.sql).toBe("SELECT 1");
    expect(solution?.highlight).toEqual({ fromLine: 2, toLine: 3 });
  });

  test("возврат на доработку: статус и комментарий", async () => {
    platform.submit(cardId, "SELECT 1");
    await flush();
    platform.returnForRevision(cardId, "Проверь WHERE");
    await flush();
    expect(platform.getCard(cardId)?.status).toBe("in_progress");
    const solution = platform.getSolution(cardId);
    expect(solution?.revisionComment).toBe("Проверь WHERE");
    expect(solution?.sql).toBe("SELECT 1");
  });

  test("повторная отправка после доработки", async () => {
    platform.submit(cardId, "SELECT 1");
    await flush();
    platform.returnForRevision(cardId, "Плохо");
    await flush();
    platform.submit(cardId, "SELECT 2", { fromLine: 1, toLine: 1 });
    await flush();
    expect(platform.getCard(cardId)?.status).toBe("submitted");
    const solution = platform.getSolution(cardId);
    expect(solution?.sql).toBe("SELECT 2");
    expect(solution?.revisionComment).toBeNull();
  });

  test("оценка завершает жизненный цикл", async () => {
    platform.submit(cardId, "SELECT 1");
    await flush();
    platform.review(cardId, { score: 9, comment: "Ок" });
    await flush();
    expect(platform.getCard(cardId)?.status).toBe("reviewed");
    expect(platform.getSolution(cardId)?.review).toEqual({
      score: 9,
      comment: "Ок",
    });
  });
});
