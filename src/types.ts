/**
 * Роль пользователя виджета.
 */
export type Role = "student" | "teacher";

/**
 * Состояние жизненного цикла карточки задания.
 */
export type CardStatus =
  "draft" | "assigned" | "in_progress" | "submitted" | "reviewed";

/**
 * Подсказка к заданию; пенальти уменьшает итоговый балл.
 */
export interface Hint {
  id: string;
  text: string;
  penalty: number;
}

/**
 * Карточка задания, созданная преподавателем.
 */
export interface TaskCard {
  id: string;
  /** Формулировка задачи. */
  prompt: string;
  /** Баллы за решение без подсказок. */
  maxScore: number;
  hints: Hint[];
  /** Идентификатор назначенного студента, null — не назначен. */
  assigneeId: string | null;
  status: CardStatus;
  /** Идентифаторы подсказок, раскрытых студентом. */
  usedHintIds: string[];
}

/**
 * Диапазон выделенных строк SQL-запроса, нумерация с 1.
 */
export interface SelectionRange {
  fromLine: number;
  toLine: number;
}

/**
 * Запрос по выделенным строкам: студент просит помощь или
 * преподаватель отмечает ошибочные строки.
 */
export interface SelectionRequest {
  id: string;
  cardId: string;
  authorRole: Role;
  range: SelectionRange;
  comment: string;
  /** Время создания, ISO 8601. */
  createdAt: string;
}

/**
 * Результат проверки решения преподавателем.
 */
export interface ReviewResult {
  score: number;
  comment: string;
}

/**
 * Решение студента: SQL-текст и результат проверки.
 */
export interface Solution {
  cardId: string;
  sql: string;
  review: ReviewResult | null;
}

/**
 * Результат исполнения SQL-запроса в виде таблицы.
 */
export interface SqlQueryResult {
  columns: string[];
  rows: (string | number | null)[][];
}

/**
 * Порт исполнения SQL: реализуется платформой (или моком).
 * Виджет не выполняет запросы сам.
 */
export interface SqlExecutor {
  execute(sql: string): Promise<SqlQueryResult>;
}

/**
 * Пропсы виджета SQL-задания.
 */
export interface SqlWidgetProps {
  card: TaskCard;
  role: Role;
  /** Текущее решение студента, если есть. */
  solution: Solution | null;
  executor: SqlExecutor;
  /** Студент отправляет решение на проверку. */
  onSubmit(sql: string): void;
  /** Студент раскрывает подсказку (списывает баллы). */
  onUseHint(hintId: string): void;
  /** Отправка запроса по выделенным строкам. */
  onSelectionRequest(request: SelectionRequest): void;
  /** Преподаватель завершает проверку. */
  onReview(result: ReviewResult): void;
}
