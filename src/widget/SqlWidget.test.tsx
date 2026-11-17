import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { EditorView } from "codemirror";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { SqlExecutor, TaskCard } from "../types.js";
import { SqlWidget } from "./SqlWidget.js";

afterEach(cleanup);

const executor: SqlExecutor = {
  execute: vi.fn(async () => ({ columns: [], rows: [] })),
};

function makeCard(overrides: Partial<TaskCard> = {}): TaskCard {
  return {
    id: "card-1",
    prompt: "Выбери все строки таблицы users",
    maxScore: 10,
    hints: [{ id: "h1", text: "Первая подсказка", penalty: 2 }],
    assigneeId: "student-1",
    status: "assigned",
    usedHintIds: [],
    ...overrides,
  };
}

function noop() {
  /* no-op */
}

function renderWidget(
  overrides: Partial<Parameters<typeof SqlWidget>[0]> = {},
) {
  return render(
    <SqlWidget
      card={makeCard()}
      role="student"
      solution={null}
      executor={executor}
      onSubmit={noop}
      onUseHint={noop}
      onReturnForRevision={noop}
      onReview={noop}
      {...overrides}
    />,
  );
}

describe("SqlWidget", () => {
  test("студент видит условие и кнопку подсказки", () => {
    renderWidget();
    expect(screen.getByText(/Выбери все строки/)).toBeTruthy();
    expect(screen.getByText("Подсказка (−2 б.)")).toBeTruthy();
  });

  test("клик по подсказке вызывает onUseHint", () => {
    const onUseHint = vi.fn();
    renderWidget({ onUseHint });
    fireEvent.click(screen.getByText("Подсказка (−2 б.)"));
    expect(onUseHint).toHaveBeenCalledWith("h1");
  });

  test("раскрытая подсказка показывается текстом", () => {
    renderWidget({ card: makeCard({ usedHintIds: ["h1"] }) });
    expect(screen.getByText("Первая подсказка")).toBeTruthy();
    expect(screen.queryByText("Подсказка (−2 б.)")).toBeNull();
  });

  test("преподаватель редактирует черновик", () => {
    const onCardChange = vi.fn();
    renderWidget({
      role: "teacher",
      card: makeCard({ status: "draft" }),
      onCardChange,
    });
    const prompt = screen.getByDisplayValue(/Выбери все строки/);
    fireEvent.change(prompt, { target: { value: "Новое условие" } });
    expect(onCardChange).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "Новое условие" }),
    );
  });

  test("преподаватель оценивает решение (балл по умолчанию)", () => {
    const onReview = vi.fn();
    renderWidget({
      role: "teacher",
      card: makeCard({ status: "submitted", usedHintIds: ["h1"] }),
      solution: { cardId: "card-1", sql: "SELECT 1", review: null },
      onReview,
    });
    fireEvent.click(screen.getByText("Оценить"));
    expect(onReview).toHaveBeenCalledWith({
      score: 8,
      comment: "",
      highlight: null,
    });
  });

  test("после проверки виден итоговый балл", () => {
    renderWidget({
      card: makeCard({ status: "reviewed" }),
      solution: {
        cardId: "card-1",
        sql: "SELECT 1",
        review: { score: 7, comment: "Хорошо" },
      },
    });
    expect(screen.getByText("Итог: 7 б.")).toBeTruthy();
    expect(screen.getByText("Хорошо")).toBeTruthy();
  });

  test("возврат на доработку передаёт комментарий", () => {
    const onReturnForRevision = vi.fn();
    renderWidget({
      role: "teacher",
      card: makeCard({ status: "submitted" }),
      solution: { cardId: "card-1", sql: "SELECT 1", review: null },
      onReturnForRevision,
    });
    fireEvent.change(screen.getByPlaceholderText("Комментарий"), {
      target: { value: "Проверь WHERE" },
    });
    fireEvent.click(screen.getByText("Вернуть на доработку"));
    expect(onReturnForRevision).toHaveBeenCalledWith("Проверь WHERE", null);
  });

  test("студент видит комментарий при возврате на доработку", () => {
    renderWidget({
      card: makeCard({ status: "in_progress" }),
      solution: {
        cardId: "card-1",
        sql: "SELECT 1",
        review: null,
        revisionComment: "Проверь WHERE",
      },
    });
    expect(screen.getByText("Проверь WHERE")).toBeTruthy();
  });

  test("преподаватель назначает студента из черновика", () => {
    const onCardChange = vi.fn();
    renderWidget({
      role: "teacher",
      card: makeCard({ status: "draft" }),
      onCardChange,
    });
    fireEvent.click(screen.getByText("Назначить студента"));
    expect(onCardChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "assigned" }),
    );
  });
});

const SQL = "SELECT a\nFROM t\nWHERE a > 1";

/** Выделяет текст в редакторе виджета, как это делает мышь. */
function selectInEditor(container: HTMLElement, anchor: number, head: number) {
  const dom = container.querySelector<HTMLElement>(".cm-editor");
  const view = dom ? EditorView.findFromDOM(dom) : null;
  if (!view) throw new Error("editor not found");
  act(() => view.dispatch({ selection: { anchor, head } }));
}

describe("выделение строк", () => {
  const submitted = {
    role: "teacher" as const,
    card: makeCard({ status: "submitted" }),
    solution: { cardId: "card-1", sql: SQL, review: null },
  };

  test("оценка передаёт выделенные преподавателем строки", () => {
    const onReview = vi.fn();
    const { container } = renderWidget({ ...submitted, onReview });
    selectInEditor(container, 0, 12);
    fireEvent.click(screen.getByText("Оценить"));
    expect(onReview).toHaveBeenCalledWith(
      expect.objectContaining({ highlight: { fromLine: 1, toLine: 2 } }),
    );
  });

  test("выделение до начала строки её не задевает", () => {
    const onReview = vi.fn();
    const { container } = renderWidget({ ...submitted, onReview });
    selectInEditor(container, 0, 9);
    fireEvent.click(screen.getByText("Оценить"));
    expect(onReview).toHaveBeenCalledWith(
      expect.objectContaining({ highlight: { fromLine: 1, toLine: 1 } }),
    );
  });

  test("возврат на доработку передаёт выделенные строки", () => {
    const onReturnForRevision = vi.fn();
    const { container } = renderWidget({ ...submitted, onReturnForRevision });
    selectInEditor(container, 10, 20);
    fireEvent.click(screen.getByText("Вернуть на доработку"));
    expect(onReturnForRevision).toHaveBeenCalledWith("", {
      fromLine: 2,
      toLine: 3,
    });
  });

  test("курсор без выделения — это отсутствие выделения", () => {
    const onReview = vi.fn();
    const { container } = renderWidget({ ...submitted, onReview });
    selectInEditor(container, 0, 12);
    selectInEditor(container, 3, 3);
    fireEvent.click(screen.getByText("Оценить"));
    expect(onReview).toHaveBeenCalledWith(
      expect.objectContaining({ highlight: null }),
    );
  });

  test("отправка решения передаёт строки студента", () => {
    const onSubmit = vi.fn();
    const { container } = renderWidget({
      card: makeCard({ status: "in_progress" }),
      solution: { cardId: "card-1", sql: SQL, review: null },
      onSubmit,
    });
    selectInEditor(container, 0, 5);
    fireEvent.click(screen.getByText("Отправить на проверку"));
    expect(onSubmit).toHaveBeenCalledWith(SQL, {
      fromLine: 1,
      toLine: 1,
    });
  });

  test("до отправки выделение второй роли не видно", () => {
    const { container } = renderWidget({
      card: makeCard({ status: "assigned" }),
      solution: null,
    });
    selectInEditor(container, 0, 0);
    expect(container.querySelector(".sqlw-highlight")).toBeNull();
    expect(screen.queryByText(/выделил|отметил/)).toBeNull();
  });

  test("после отправки преподаватель видит строки студента", () => {
    const { container } = renderWidget({
      ...submitted,
      solution: {
        ...submitted.solution,
        highlight: { fromLine: 1, toLine: 2 },
      },
    });
    expect(screen.getByText("Студент выделил строки 1–2")).toBeTruthy();
    expect(container.querySelectorAll(".sqlw-highlight").length).toBe(2);
  });

  test("после возврата студент видит строки преподавателя", () => {
    renderWidget({
      card: makeCard({ status: "in_progress" }),
      solution: {
        cardId: "card-1",
        sql: SQL,
        review: null,
        highlight: { fromLine: 1, toLine: 1 },
        revisionHighlight: { fromLine: 3, toLine: 3 },
      },
    });
    expect(screen.getByText("Преподаватель отметил строку 3")).toBeTruthy();
    expect(screen.queryByText(/Студент выделил/)).toBeNull();
  });

  test("после оценки студент видит строки преподавателя", () => {
    renderWidget({
      card: makeCard({ status: "reviewed" }),
      solution: {
        cardId: "card-1",
        sql: SQL,
        review: {
          score: 7,
          comment: "",
          highlight: { fromLine: 2, toLine: 3 },
        },
      },
    });
    expect(screen.getByText("Преподаватель отметил строки 2–3")).toBeTruthy();
  });
});
