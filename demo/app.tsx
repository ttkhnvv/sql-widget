import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SqlWidget } from "../src/index";
import type { SqlExecutor } from "../src/index";
import {
  createSqlJsExecutor,
  MOCK_CARDS,
  MOCK_SCHEMA,
  MockPlatform,
} from "../src/mock/index";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import "./styles.css";

export function App() {
  const platform = useMemo(() => new MockPlatform(MOCK_CARDS), []);
  useSyncExternalStore(platform.subscribe, platform.getVersion);
  const [cardId, setCardId] = useState(MOCK_CARDS[0].id);
  const [executor, setExecutor] = useState<SqlExecutor | null>(null);

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
    return <main className="page">Загрузка sql.js…</main>;
  }
  const solution = platform.getSolution(cardId);
  const requests = platform.getRequests(cardId);

  return (
    <main className="page">
      <h1>SQL Widget — демо-стенд</h1>
      <p className="subtitle">
        Mock-платформа: две роли рядом, состояние общее.
      </p>
      <label>
        Задание:{" "}
        <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
          {platform.getCards().map((item) => (
            <option key={item.id} value={item.id}>
              {item.id}
            </option>
          ))}
        </select>
      </label>
      <div className="panels">
        <section>
          <h2>Преподаватель</h2>
          <SqlWidget
            card={card}
            role="teacher"
            solution={solution}
            executor={executor}
            onCardChange={(next) => platform.updateCard(next)}
            onSubmit={() => undefined}
            onUseHint={() => undefined}
            onSelectionRequest={(request) =>
              platform.addSelectionRequest(request)
            }
            onReview={(result) => platform.review(cardId, result)}
          />
        </section>
        <section>
          <h2>Студент</h2>
          <SqlWidget
            card={card}
            role="student"
            solution={solution}
            executor={executor}
            onSubmit={(sqlText) => platform.submit(cardId, sqlText)}
            onUseHint={(hintId) => platform.useHint(cardId, hintId)}
            onSelectionRequest={(request) =>
              platform.addSelectionRequest(request)
            }
            onReview={() => undefined}
          />
        </section>
      </div>
      <h2>Запросы по выделенным строкам</h2>
      <ul>
        {requests.map((request) => (
          <li key={request.id}>
            {request.authorRole === "student" ? "Студент" : "Преподаватель"}:
            строки {request.range.fromLine}–{request.range.toLine}
            {request.comment ? `, «${request.comment}»` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
