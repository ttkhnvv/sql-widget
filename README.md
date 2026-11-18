# sql-widget

Виджет SQL-заданий для платформы совместного обучения
(Miro-подобной). Преподаватель создаёт карточку задания
(формулировка, баллы, подсказки с пенальти), назначает студента;
студент пишет SQL-запрос, отправляет на проверку и может попросить
помощь по выделенным строкам; преподаватель при проверке отмечает
ошибочные строки и выставляет баллы.

Модуль спроектирован максимально лёгким: виджет не исполняет SQL
сам и не хранит состояние — всё это делает платформа через
интерфейсы-порты.

## Установка

```sh
npm install sql-widget
```

Peer-зависимости: `react` >= 18.

## Использование

```tsx
import { SqlWidget } from "sql-widget";
import type { SqlExecutor, TaskCard } from "sql-widget";

const executor: SqlExecutor = {
  // платформа сама решает, где выполнять запросы
  execute: async (sql) => {
    const res = await fetch("/api/sql", {
      method: "POST",
      body: JSON.stringify({ sql }),
    });
    return res.json(); // { columns, rows }
  },
};

<SqlWidget
  card={card}
  role="student"
  solution={solution}
  executor={executor}
  onSubmit={(sql) => api.submit(card.id, sql)}
  onUseHint={(hintId) => api.useHint(card.id, hintId)}
  onReturnForRevision={(comment, lines) =>
    api.returnForRevision(card.id, comment, lines)
  }
  onReview={(result) => api.review(card.id, result)}
  onCardChange={(next) => api.saveCard(next)}
/>;
```

Виджет управляемый: состояние карточки хранит платформа.
Итоговый балл считается как `maxScore` минус пенальти раскрытых
подсказок (`calculateScore`, тоже экспортируется).

## Mock-режим (без платформы)

Точка входа `sql-widget/mock` содержит mock-реализации портов:

```ts
import {
  createSqlJsExecutor, // SQL на sql.js (SQLite в WASM)
  MOCK_CARDS, // готовые карточки заданий
  MOCK_SCHEMA, // таблицы SQLite для них
  MockPlatform, // in-memory хранилище состояния
} from "sql-widget/mock";
```

`createSqlJsExecutor` принимает `wasmUrl` — URL файла
`sql-wasm.wasm` (в сборках Vite:
`import url from "sql.js/dist/sql-wasm.wasm?url"`).

## Демо-стенд

```sh
npm install
npm run demo
```

Откроется страница с двумя панелями (преподаватель и студент)
и общим состоянием: отправка решения, подсказки со списанием
баллов, проверка и запросы по выделенным строкам видны сразу
с обеих ролей.

## Разработка

| Команда             | Назначение                   |
| ------------------- | ---------------------------- |
| `npm run build`     | сборка ESM + типы в `dist/`  |
| `npm run typecheck` | проверка типов               |
| `npm run lint`      | ESLint                       |
| `npm test`          | Vitest (логика + компоненты) |
| `npm run demo`      | демо-стенд (Vite)            |
