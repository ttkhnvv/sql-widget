import { canTransition } from "../lifecycle.js";
import type {
  CardStatus,
  ReviewResult,
  SelectionRequest,
  Solution,
  TaskCard,
} from "../types.js";

const ORDER: CardStatus[] = [
  "draft",
  "assigned",
  "in_progress",
  "submitted",
  "reviewed",
];

/** Задержка, имитирующая сетевой запрос, мс. */
const LATENCY_MS = 300;

type Listener = () => void;

/**
 * In-memory имитация платформы: хранит карточки, решения и
 * запросы по выделенным строкам, обновляется асинхронно.
 */
export class MockPlatform {
  private cards: TaskCard[];
  private solutions = new Map<string, Solution>();
  private requests: SelectionRequest[] = [];
  private listeners = new Set<Listener>();
  private version = 0;

  constructor(cards: TaskCard[]) {
    this.cards = cards.map((card) => structuredClone(card));
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  getCards(): TaskCard[] {
    return this.cards.map((card) => structuredClone(card));
  }

  getCard(cardId: string): TaskCard | undefined {
    const card = this.cards.find((c) => c.id === cardId);
    return card ? structuredClone(card) : undefined;
  }

  getSolution(cardId: string): Solution | null {
    const solution = this.solutions.get(cardId);
    return solution ? structuredClone(solution) : null;
  }

  getRequests(cardId: string): SelectionRequest[] {
    return this.requests
      .filter((request) => request.cardId === cardId)
      .map((request) => structuredClone(request));
  }

  /** Мгновенно: задержка сделала бы ввод текста мучительным. */
  updateCard(card: TaskCard): void {
    const index = this.cards.findIndex((c) => c.id === card.id);
    if (index < 0) return;
    this.cards[index] = structuredClone(card);
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  useHint(cardId: string, hintId: string): void {
    this.apply(() => {
      const card = this.find(cardId);
      if (!card || card.usedHintIds.includes(hintId)) return;
      card.usedHintIds.push(hintId);
      this.advance(card, "in_progress");
    });
  }

  startWork(cardId: string): void {
    this.apply(() => {
      const card = this.find(cardId);
      if (card) this.advance(card, "in_progress");
    });
  }

  submit(cardId: string, sql: string): void {
    this.apply(() => {
      const card = this.find(cardId);
      if (!card) return;
      this.advance(card, "in_progress");
      this.advance(card, "submitted");
      this.solutions.set(cardId, { cardId, sql, review: null });
    });
  }

  review(cardId: string, result: ReviewResult): void {
    this.apply(() => {
      const card = this.find(cardId);
      const solution = this.solutions.get(cardId);
      if (!card || !solution) return;
      this.advance(card, "reviewed");
      this.solutions.set(cardId, {
        cardId,
        sql: solution.sql,
        review: result,
      });
    });
  }

  addSelectionRequest(request: SelectionRequest): void {
    this.apply(() => {
      this.requests.push(structuredClone(request));
    });
  }

  private find(cardId: string): TaskCard | undefined {
    return this.cards.find((card) => card.id === cardId);
  }

  private advance(card: TaskCard, to: CardStatus): void {
    let index = ORDER.indexOf(card.status);
    const target = ORDER.indexOf(to);
    while (index < target) {
      const next = ORDER[index + 1];
      if (!canTransition(card.status, next)) return;
      card.status = next;
      index += 1;
    }
  }

  private apply(mutate: () => void): void {
    setTimeout(() => {
      mutate();
      this.version += 1;
      this.listeners.forEach((listener) => listener());
    }, LATENCY_MS);
  }
}
