import { useEffect, useState } from "react";
import { calculateScore } from "../score.js";
import type {
  SelectionRange,
  Solution,
  SqlQueryResult,
  SqlWidgetProps,
  TaskCard,
} from "../types.js";
import { CardEditor } from "./CardEditor.js";
import { ResultsTable } from "./ResultsTable.js";
import { SqlEditor } from "./SqlEditor.js";
import "./styles.css";

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  assigned: "Назначено",
  in_progress: "В работе",
  submitted: "На проверке",
  reviewed: "Проверено",
};

function formatRange(range: SelectionRange): string {
  return range.fromLine === range.toLine
    ? `строку ${range.fromLine}`
    : `строки ${range.fromLine}–${range.toLine}`;
}

/**
 * Какие строки и чьи показывать: выделение видно только после
 * действия автора (отправка решения, возврат или оценка).
 */
function fixedHighlight(
  card: TaskCard,
  solution: Solution | null,
): { range: SelectionRange; caption: string } | null {
  if (!solution) return null;
  const teacherCaption = (range: SelectionRange) =>
    `Преподаватель отметил ${formatRange(range)}`;
  if (card.status === "submitted" && solution.highlight) {
    return {
      range: solution.highlight,
      caption: `Студент выделил ${formatRange(solution.highlight)}`,
    };
  }
  const marked =
    card.status === "in_progress"
      ? solution.revisionHighlight
      : card.status === "reviewed"
        ? solution.review?.highlight
        : null;
  return marked ? { range: marked, caption: teacherCaption(marked) } : null;
}

/**
 * Виджет SQL-задания: карточка, редактор запроса с общей
 * подсветкой строк, подсказки, проверка и возврат на доработку.
 */
export function SqlWidget(props: SqlWidgetProps) {
  const { card, role, solution } = props;
  const [draftSql, setDraftSql] = useState(solution?.sql ?? "");
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [reviewScore, setReviewScore] = useState(calculateScore(card));
  const [reviewComment, setReviewComment] = useState("");
  const [selection, setSelection] = useState<SelectionRange | null>(null);

  // Выделение относится к одному этапу: при смене статуса сбрасываем
  useEffect(() => {
    setSelection(null);
  }, [card.id, card.status]);

  useEffect(() => {
    setDraftSql(solution?.sql ?? "");
    setResult(null);
    setError(null);
  }, [card.id]);

  const usedHints = card.usedHintIds.join(",");
  useEffect(() => {
    setReviewScore(calculateScore(card));
  }, [card.maxScore, usedHints, card.status]);

  const isTeacher = role === "teacher";
  const canSolve =
    !isTeacher && (card.status === "assigned" || card.status === "in_progress");
  const canReview = isTeacher && card.status === "submitted";

  async function runQuery(sqlText: string) {
    setRunning(true);
    setError(null);
    try {
      setResult(await props.executor.execute(sqlText));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  if (isTeacher && card.status === "draft") {
    return (
      <div className="sqlw">
        <CardEditor
          card={card}
          onChange={(next) => props.onCardChange?.(next)}
        />
      </div>
    );
  }

  const editorSql = canSolve ? draftSql : (solution?.sql ?? "");
  const fixed = fixedHighlight(card, solution);

  return (
    <div className="sqlw">
      <header className="sqlw-header">
        <span className="sqlw-status" data-status={card.status}>
          {STATUS_LABELS[card.status]}
        </span>
        <span className="sqlw-score">
          Баллы <strong>{calculateScore(card)}</strong> из {card.maxScore}
        </span>
      </header>
      <p className="sqlw-prompt">{card.prompt}</p>

      {!isTeacher && card.hints.length > 0 && (
        <div className="sqlw-hints">
          {card.hints.map((hint) =>
            card.usedHintIds.includes(hint.id) ? (
              <p key={hint.id} className="sqlw-hint-used">
                {hint.text}
              </p>
            ) : (
              <button
                key={hint.id}
                type="button"
                disabled={!canSolve}
                onClick={() => props.onUseHint(hint.id)}
              >
                Подсказка (−{hint.penalty} б.)
              </button>
            ),
          )}
        </div>
      )}

      <SqlEditor
        value={editorSql}
        readOnly={!canSolve}
        highlight={fixed?.range ?? null}
        onChange={setDraftSql}
        onSelectRange={setSelection}
      />
      {fixed && <p className="sqlw-muted">{fixed.caption}</p>}

      <div className="sqlw-actions">
        <button
          type="button"
          disabled={running || !editorSql.trim()}
          onClick={() => void runQuery(editorSql)}
        >
          {running ? "Выполняется…" : "Выполнить"}
        </button>
        {canSolve && (
          <button
            type="button"
            className="sqlw-primary"
            disabled={!draftSql.trim()}
            onClick={() => props.onSubmit(draftSql, selection)}
          >
            Отправить на проверку
          </button>
        )}
      </div>

      <ResultsTable result={result} error={error} />

      {canReview && (
        <div className="sqlw-review">
          <label>
            <span>Оценка</span>
            <input
              type="number"
              min={0}
              max={card.maxScore}
              value={reviewScore}
              onChange={(e) => setReviewScore(Number(e.target.value) || 0)}
            />
          </label>
          <label>
            <span>Комментарий</span>
            <textarea
              rows={2}
              placeholder="Комментарий"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </label>
          <div className="sqlw-actions">
            <button
              type="button"
              className="sqlw-primary"
              onClick={() =>
                props.onReview({
                  score: reviewScore,
                  comment: reviewComment,
                  highlight: selection,
                })
              }
            >
              Оценить
            </button>
            {props.onReturnForRevision && (
              <button
                type="button"
                onClick={() =>
                  props.onReturnForRevision?.(reviewComment, selection)
                }
              >
                Вернуть на доработку
              </button>
            )}
          </div>
        </div>
      )}

      {canSolve && solution?.revisionComment && (
        <div className="sqlw-revision">
          <strong>Комментарий преподавателя:</strong>
          <p>{solution.revisionComment}</p>
        </div>
      )}

      {solution?.review && (
        <div className="sqlw-review-result">
          <strong>Итог: {solution.review.score} б.</strong>
          {solution.review.comment && <p>{solution.review.comment}</p>}
        </div>
      )}
    </div>
  );
}
