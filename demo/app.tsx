import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SqlWidget } from "../src/index";
import type { CardStatus, SelectionRange, SqlExecutor } from "../src/index";
import {
  createSqlJsExecutor,
  MOCK_CARDS,
  MOCK_SCHEMA,
  MockPlatform,
} from "../src/mock/index";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { ThemeSwitch, useTheme } from "./theme";

const STEPS: { status: CardStatus; label: string }[] = [
  { status: "draft", label: "Черновик" },
  { status: "assigned", label: "Назначено" },
  { status: "in_progress", label: "В работе" },
  { status: "submitted", label: "На проверке" },
  { status: "reviewed", label: "Проверено" },
];

const STEP_HINTS: Record<CardStatus, string> = {
  draft: "Преподаватель: заполните карточку и назначьте студента",
  assigned: "Студент: напишите запрос и отправьте на проверку",
  in_progress: "Студент: доработайте запрос с учётом комментария",
  submitted:
    "Преподаватель: выполните запрос студента, верните на " +
    "доработку или оцените. Подсвеченные при отправке строки " +
    "видны обоим",
  reviewed: "Готово. Можно выбрать другое задание или создать новое",
};

function Stepper({ status }: { status: CardStatus }) {
  const current = STEPS.findIndex((step) => step.status === status);
  return (
    <ol className="stepper" aria-label="Этапы задания">
      {STEPS.map((step, index) => (
        <li
          key={step.status}
          className="step"
          data-state={
            index < current ? "done" : index === current ? "current" : "todo"
          }
          aria-current={index === current ? "step" : undefined}
        >
          <span className="step-mark" aria-hidden="true" />
          {step.label}
        </li>
      ))}
    </ol>
  );
}

function Screen({ role, children }: PropsWithChildren<{ role: string }>) {
  return (
    <section className="screen" aria-label={`Экран: ${role}`}>
      <div className="screen-bar">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="screen-title">{role}</span>
      </div>
      <div className="screen-body">{children}</div>
    </section>
  );
}

export function App() {
  const platform = useMemo(() => new MockPlatform(MOCK_CARDS), []);
  useSyncExternalStore(platform.subscribe, platform.getVersion);
  const [theme, setTheme] = useTheme();
  const [cardId, setCardId] = useState(MOCK_CARDS[1].id);
  const [executor, setExecutor] = useState<SqlExecutor | null>(null);
  const [studentSel, setStudentSel] = useState<SelectionRange | null>(null);
  const [teacherSel, setTeacherSel] = useState<SelectionRange | null>(null);

  useEffect(() => {
    let cancelled = false;
    createSqlJsExecutor({ wasmUrl: sqlWasmUrl, schema: MOCK_SCHEMA })
      .then((created) => {
        if (!cancelled) setExecutor(created);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const card = platform.getCard(cardId);
  if (!card || !executor) {
    return <p className="loading">Загрузка sql.js…</p>;
  }
  const solution = platform.getSolution(cardId);
  const isAfterSubmit =
    card.status === "submitted" || card.status === "reviewed";

  function createCard() {
    const id = `card-${Date.now().toString(36)}`;
    platform.updateCard({
      id,
      prompt: "",
      maxScore: 10,
      hints: [],
      assigneeId: null,
      status: "draft",
      usedHintIds: [],
    });
    setCardId(id);
  }

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>SQL-задания</h1>
          <p className="lede">
            Демо без платформы: два экрана с общим состоянием.
          </p>
        </div>
        <ThemeSwitch theme={theme} onChange={setTheme} />
      </header>

      <div className="progress">
        <Stepper status={card.status} />
        <p className="step-hint">{STEP_HINTS[card.status]}</p>
      </div>

      <div className="toolbar">
        <select
          className="card-select"
          aria-label="Задание"
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
        >
          {platform.getCards().map((item) => (
            <option key={item.id} value={item.id}>
              {item.prompt.slice(0, 40) || `Черновик ${item.id}`}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={createCard}>
          Новое задание
        </button>
      </div>

      <div className="screens">
        <Screen role="Преподаватель">
          <SqlWidget
            card={card}
            solution={solution}
            executor={executor}
            role="teacher"
            highlight={isAfterSubmit ? null : studentSel}
            onCardChange={(next) => platform.updateCard(next)}
            onSubmit={() => undefined}
            onUseHint={() => undefined}
            onReturnForRevision={(comment) =>
              platform.returnForRevision(cardId, comment)
            }
            onReview={(result) => platform.review(cardId, result)}
            onSelectionChange={setTeacherSel}
          />
        </Screen>
        <Screen role="Студент">
          <SqlWidget
            card={card}
            solution={solution}
            executor={executor}
            role="student"
            highlight={teacherSel}
            onSubmit={(sqlText) => platform.submit(cardId, sqlText, studentSel)}
            onUseHint={(hintId) => platform.useHint(cardId, hintId)}
            onReview={() => undefined}
            onSelectionChange={setStudentSel}
          />
        </Screen>
      </div>
    </main>
  );
}
