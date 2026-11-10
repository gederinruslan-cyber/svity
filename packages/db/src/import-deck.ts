/** Loads deck/deck.json into `cards` and `questions`. Safe to re-run: rows are upserted. */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { cards, createDb, questions } from "./index";

interface DeckFile {
  cards: { id: number; image: string | null; tone: "light" | "neutral" | "shadow"; isResource: boolean }[];
  questions: {
    card: number;
    index: number;
    text: Record<string, string>;
    tone: "light" | "neutral" | "shadow";
    needsRequest: boolean;
  }[];
}

const deck: DeckFile = JSON.parse(readFileSync(new URL("../deck/deck.json", import.meta.url), "utf8"));
const db = createDb(process.env.DATABASE_URL ?? "postgres://svity:svity@localhost:5433/svity");

await db.transaction(async (tx) => {
  await tx
    .insert(cards)
    .values(deck.cards.map((c) => ({ id: c.id, imageKey: c.image, tone: c.tone, isResource: c.isResource })))
    .onConflictDoUpdate({
      target: cards.id,
      set: { imageKey: sql`excluded.image_key`, tone: sql`excluded.tone`, isResource: sql`excluded.is_resource` },
    });
  await tx
    .insert(questions)
    .values(
      deck.questions.map((q) => ({
        cardId: q.card,
        index: q.index,
        text: q.text,
        tone: q.tone,
        needsRequest: q.needsRequest,
      })),
    )
    .onConflictDoUpdate({
      target: [questions.cardId, questions.index],
      set: { text: sql`excluded.text`, tone: sql`excluded.tone`, needsRequest: sql`excluded.needs_request` },
    });
});

const playable = deck.cards.filter((c) => c.image && deck.questions.some((q) => q.card === c.id)).length;
console.log(`deck: ${deck.cards.length} cards, ${deck.questions.length} questions, ${playable} playable`);
process.exit(0);
