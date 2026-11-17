import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  Text,
} from "@radix-ui/themes";
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

type RadixColor = "gray" | "blue" | "yellow" | "orange" | "green";

const STATUS_COLORS: Record<string, RadixColor> = {
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
    "доработку или оцените. Подсвеченные при отправке строки " +
    "видны обоим",
  reviewed: "Готово! Можно выбрать другое задание или создать новое",
};

function Screen({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Card variant="classic" className="screen">
      <div className="screen-bar">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
        <Text size="2" color="gray" className="screen-title">
          {title}
        </Text>
      </div>
      <Box className="screen-body">{children}</Box>
    </Card>
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
    return (
      <Box p="4">
        <Text>Загрузка sql.js…</Text>
      </Box>
    );
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
    <Box p={{ initial: "3", sm: "5" }} maxWidth="1400px" mx="auto">
      <Flex direction="column" gap="3">
        <Flex align="center" gap="3" wrap="wrap">
          <Heading size="5">SQL Widget — демо полного UX-flow</Heading>
          <Badge color={STATUS_COLORS[card.status]} size="2">
            {STATUS_LABELS[card.status]}
          </Badge>
        </Flex>
        <Text size="2" color="gray">
          {STEP_HINTS[card.status]}
        </Text>
        <Flex align="center" gap="3" wrap="wrap">
          <Select.Root value={cardId} onValueChange={setCardId}>
            <Select.Trigger className="card-select" />
            <Select.Content>
              {platform.getCards().map((item) => (
                <Select.Item key={item.id} value={item.id}>
                  {item.prompt.slice(0, 40) || `Черновик ${item.id}`}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Button onClick={createCard}>Новое задание</Button>
        </Flex>
        <Flex
          direction={{ initial: "column", lg: "row" }}
          gap="4"
          align="start"
        >
          <Box className="screen-col">
            <Screen title="Экран преподавателя — Платформа">
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
          </Box>
          <Box className="screen-col">
            <Screen title="Экран студента — Платформа">
              <SqlWidget
                card={card}
                solution={solution}
                executor={executor}
                role="student"
                highlight={teacherSel}
                onSubmit={(sqlText) =>
                  platform.submit(cardId, sqlText, studentSel)
                }
                onUseHint={(hintId) => platform.useHint(cardId, hintId)}
                onReview={() => undefined}
                onSelectionChange={setStudentSel}
              />
            </Screen>
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
}
