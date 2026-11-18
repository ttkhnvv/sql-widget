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
  /** Идентификаторы подсказок, раскрытых студентом. */
  usedHintIds: string[];
}

/**
 * Диапазон выделенных строк SQL-запроса, нумерация с 1,
 * границы включительны.
 */
export interface SelectionRange {
  fromLine: number;
  toLine: number;
}

/**
 * Результат проверки решения преподавателем.
 */
export interface ReviewResult {
  score: number;
  comment: string;
  /** Строки, отмеченные преподавателем как ошибочные. */
  highlight?: SelectionRange | null;
}

/**
 * Решение студента: SQL-текст, результат проверки и возврат на
 * доработку (комментарий и строки, отмеченные преподавателем).
 */
export interface Solution {
  cardId: string;
  sql: string;
  review: ReviewResult | null;
  revisionComment?: string | null;
  /** Строки, отмеченные преподавателем при возврате на доработку. */
  revisionHighlight?: SelectionRange | null;
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
  /** Преподаватель редактирует карточку (статус draft). */
  onCardChange?(card: TaskCard): void;
  /** Студент отправляет решение на проверку. */
  onSubmit(sql: string): void;
  /** Студент раскрывает подсказку (списывает баллы). */
  onUseHint(hintId: string): void;
  /**
   * Преподаватель возвращает решение на доработку: комментарий
   * и выделенные им строки (студент увидит их только после этого).
   */
  onReturnForRevision?(comment: string, highlight: SelectionRange | null): void;
  /** Преподаватель завершает проверку. */
  onReview(result: ReviewResult): void;
}
