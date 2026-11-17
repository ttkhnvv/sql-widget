import type { TaskCard } from "../types.js";

/**
 * Готовые карточки заданий для демо и тестов.
 */
export const MOCK_CARDS: TaskCard[] = [
  {
    id: "card-select",
    prompt:
      "Выведи все строки таблицы users, у которых возраст " +
      "больше 18. Таблица доступна как users(id, name, age).",
    maxScore: 10,
    hints: [
      { id: "h1", text: "Используй WHERE", penalty: 2 },
      { id: "h2", text: "Сравнение: age > 18", penalty: 3 },
    ],
    assigneeId: "student-1",
    status: "assigned",
    usedHintIds: [],
  },
  {
    id: "card-join",
    prompt:
      "Посчитай количество заказов каждого клиента. Таблицы: " +
      "clients(id, name) и orders(id, client_id, total).",
    maxScore: 15,
    hints: [
      { id: "h1", text: "Нужен JOIN по client_id", penalty: 3 },
      { id: "h2", text: "GROUP BY clients.id", penalty: 4 },
    ],
    assigneeId: "student-1",
    status: "draft",
    usedHintIds: [],
  },
];

/**
 * SQL-скрипт, подготавливающий таблицы для MOCK_CARDS.
 */
export const MOCK_SCHEMA = `
CREATE TABLE users (id INTEGER, name TEXT, age INTEGER);
INSERT INTO users VALUES
  (1, 'Ann', 25), (2, 'Bob', 17), (3, 'Cid', 30);
CREATE TABLE clients (id INTEGER, name TEXT);
INSERT INTO clients VALUES (1, 'Ann'), (2, 'Bob');
CREATE TABLE orders (id INTEGER, client_id INTEGER,
  total INTEGER);
INSERT INTO orders VALUES
  (1, 1, 100), (2, 1, 50), (3, 2, 200);
`;
