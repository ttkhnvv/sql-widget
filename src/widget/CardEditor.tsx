import type { TaskCard } from "../types.js";
import { useState } from "react";

interface CardEditorProps {
  card: TaskCard;
  onChange(card: TaskCard): void;
}

/**
 * Форма редактирования карточки задания (преподаватель,
 * статус draft): формулировка, баллы, подсказки с пенальти,
 * назначение студента.
 */
export function CardEditor({ card, onChange }: CardEditorProps) {
  const [hintText, setHintText] = useState("");
  const [hintPenalty, setHintPenalty] = useState(1);

  function update(patch: Partial<TaskCard>) {
    onChange({ ...card, ...patch });
  }

  function addHint() {
    if (!hintText.trim()) return;
    const id = crypto.randomUUID();
    update({
      hints: [
        ...card.hints,
        { id, text: hintText.trim(), penalty: hintPenalty },
      ],
    });
    setHintText("");
    setHintPenalty(1);
  }

  function removeHint(id: string) {
    update({ hints: card.hints.filter((hint) => hint.id !== id) });
  }

  return (
    <div className="sqlw-card-editor">
      <label className="sqlw-field">
        <span>Формулировка задачи</span>
        <textarea
          rows={4}
          value={card.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
        />
      </label>
      <label className="sqlw-field">
        <span>Баллы за решение</span>
        <input
          type="number"
          min={0}
          value={card.maxScore}
          onChange={(e) => update({ maxScore: Number(e.target.value) || 0 })}
        />
      </label>
      <label className="sqlw-field">
        <span>Назначенный студент (id)</span>
        <input
          type="text"
          value={card.assigneeId ?? ""}
          onChange={(e) => update({ assigneeId: e.target.value || null })}
        />
      </label>
      <fieldset className="sqlw-field">
        <legend>Подсказки</legend>
        <ul className="sqlw-hint-list">
          {card.hints.map((hint) => (
            <li key={hint.id}>
              <span>
                {hint.text} (−{hint.penalty} б.)
              </span>
              <button type="button" onClick={() => removeHint(hint.id)}>
                Удалить
              </button>
            </li>
          ))}
        </ul>
        <div className="sqlw-hint-add">
          <input
            type="text"
            placeholder="Текст подсказки"
            value={hintText}
            onChange={(e) => setHintText(e.target.value)}
          />
          <input
            type="number"
            min={0}
            value={hintPenalty}
            onChange={(e) => setHintPenalty(Number(e.target.value) || 0)}
          />
          <button type="button" onClick={addHint}>
            Добавить
          </button>
        </div>
      </fieldset>
    </div>
  );
}
