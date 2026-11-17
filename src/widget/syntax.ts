import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const style = HighlightStyle.define([
  {
    tag: [tags.keyword, tags.bool, tags.null],
    color: "var(--sqlw-syn-keyword)",
    fontWeight: "600",
  },
  {
    tag: [tags.string, tags.special(tags.string)],
    color: "var(--sqlw-syn-string)",
  },
  { tag: tags.number, color: "var(--sqlw-syn-number)" },
  { tag: tags.typeName, color: "var(--sqlw-syn-type)" },
  {
    tag: tags.standard(tags.name),
    color: "var(--sqlw-syn-builtin)",
  },
  {
    tag: tags.comment,
    color: "var(--sqlw-syn-comment)",
    fontStyle: "italic",
  },
]);

/**
 * Подсветка синтаксиса SQL на CSS-переменных темы (--sqlw-syn-*),
 * чтобы цвета менялись вместе со светлой/тёмной темой.
 */
export const syntaxExtension = syntaxHighlighting(style);
