import { useEffect, useState } from "react";
import { calculateScore } from "../score.js";
import { toSelectionRange } from "../selection.js";
import type {
  SelectionRange,
  SqlQueryResult,
  SqlWidgetProps,
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

/**
 * Виджет SQL-задания: карточка, редактор запроса, подсказки,
 * запросы помощи по выделенным строкам и проверка решения.
 */
export function SqlWidget(props: SqlWidgetProps) {
  const { card, role, solution } = props;
  const [draftSql, setDraftSql] = useState(solution?.sql ?? "");
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [comment, setComment] = useState("");
  const [reviewScore, setReviewScore] = useState(calculateScore(card));
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    setDraftSql(solution?.sql ?? "");
    setResult(null);
    setError(null);
  }, [card.id]);

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

  function sendSelectionRequest() {
    if (!selection) return;
    props.onSelectionRequest({
      id: crypto.randomUUID(),
      cardId: card.id,
      authorRole: role,
      range: selection,
      comment,
      createdAt: new Date().toISOString(),
    });
    setComment("");
    setSelection(null);
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
  const selectionPanel = selection && (
    <div className="sqlw-selection">
      <span>
        Строки {selection.fromLine}–{selection.toLine}
      </span>
      <input
        type="text"
        placeholder="Комментарий"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button type="button" onClick={sendSelectionRequest}>
        {isTeacher ? "Отметить ошибку" : "Попросить помощи"}
      </button>
    </div>
  );

  return (
    <div className="sqlw">
      <header className="sqlw-header">
        <span className="sqlw-status">{STATUS_LABELS[card.status]}</span>
        <span className="sqlw-score">
          Баллы: {calculateScore(card)} из {card.maxScore}
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
        onChange={setDraftSql}
        onSelectRange={(from, to) => setSelection(toSelectionRange(from, to))}
      />
      {selectionPanel}

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
            disabled={!draftSql.trim()}
            onClick={() => props.onSubmit(draftSql)}
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
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              props.onReview({
                score: reviewScore,
                comment: reviewComment,
              })
            }
          >
            Оценить
          </button>
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
