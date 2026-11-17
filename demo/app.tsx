import {
  Badge,
  Button,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SqlWidget } from "../src/index";
import type { SelectionRange, SqlExecutor } from "../src/index";
import {
  createSqlJsExecutor,
  MOCK_CARDS,
  MOCK_SCHEMA,
  MockPlatform,
} from "../src/mock/index";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

const STATUS_COLORS: Record<string, string> = {
  draft: "gray",
  assigned: "blue",
  in_progress: "yellow",
  submitted: "orange",
  reviewed: "green",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  assigned: "Назначено",
  in_progress: "В работе",
  submitted: "На проверке",
  reviewed: "Проверено",
};

const STEP_HINTS: Record<string, string> = {
  draft: "Преподаватель: заполните карточку и назначьте студента",
  assigned: "Студент: напишите запрос и отправьте на проверку",
  in_progress: "Студент: доработайте запрос с учётом комментария",
  submitted:
    "Преподаватель: выполните запрос студента, верните на " +
    "доработку или оцените. Выделенные строки видны обоим",
  reviewed: "Готово! Можно выбрать другое задание или создать новое",
};

function Screen({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Paper withBorder radius="md" className="screen">
      <div className="screen-bar">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
        <Text size="sm" c="dimmed" ml="sm">
          {title}
        </Text>
      </div>
      <div className="screen-body">{children}</div>
    </Paper>
  );
}

export function App() {
  const platform = useMemo(() => new MockPlatform(MOCK_CARDS), []);
  useSyncExternalStore(platform.subscribe, platform.getVersion);
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
    return <Text p="xl">Загрузка sql.js…</Text>;
  }
  const solution = platform.getSolution(cardId);

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
    <Stack p="lg" gap="md">
      <div className="header">
        <Title order={3}>SQL Widget — демо полного UX-flow</Title>
        <Badge color={STATUS_COLORS[card.status]} size="lg">
          {STATUS_LABELS[card.status]}
        </Badge>
      </div>
      <Text c="dimmed">{STEP_HINTS[card.status]}</Text>
      <div className="header">
        <Select
          value={cardId}
          onChange={(value) => value && setCardId(value)}
          data={platform.getCards().map((item) => ({
            value: item.id,
            label: item.prompt.slice(0, 40) || `Черновик ${item.id}`,
          }))}
          w={320}
          placeholder="Задание"
        />
        <Button onClick={createCard}>Новое задание</Button>
      </div>
      <div className="screens">
        <Screen title="Экран преподавателя — Платформа">
          <SqlWidget
            card={card}
            solution={solution}
            executor={executor}
            role="teacher"
            highlight={studentSel}
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
        <Screen title="Экран студента — Платформа">
          <SqlWidget
            card={card}
            solution={solution}
            executor={executor}
            role="student"
            highlight={teacherSel}
            onSubmit={(sqlText) => platform.submit(cardId, sqlText)}
            onUseHint={(hintId) => platform.useHint(cardId, hintId)}
            onReview={() => undefined}
            onSelectionChange={setStudentSel}
          />
        </Screen>
      </div>
    </Stack>
  );
}
