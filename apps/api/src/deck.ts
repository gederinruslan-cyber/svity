import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import type { CardMeta, QuestionMeta } from "@svity/core";
import type { CardView, Locale } from "@svity/contracts";
import { cards, questions, type Db } from "@svity/db";
import { sign, verifySignature } from "./crypto";

const IMAGES_DIR = new URL("../card-images/", import.meta.url);
const IMAGE_URL_TTL_S = 15 * 60;

interface DeckCard extends CardMeta {
  imageKey: string | null;
  isResource: boolean;
  questions: (QuestionMeta & { text: Record<string, string> })[];
}

export interface Deck {
  /** Cards that can be drawn: have an image and three questions. */
  playable: DeckCard[];
  byId: Map<number, DeckCard>;
}

/** The deck changes only on `pnpm deck:import`, so it's loaded once per process. */
export function deckLoader(db: Db) {
  let deck: Promise<Deck> | null = null;
  return () =>
    (deck ??= (async () => {
      const [cs, qs] = await Promise.all([db.select().from(cards), db.select().from(questions)]);
      const byId = new Map<number, DeckCard>();
      for (const c of cs) byId.set(c.id, { id: c.id, tone: c.tone, imageKey: c.imageKey, isResource: c.isResource, questions: [] });
      for (const q of qs) {
        byId.get(q.cardId)?.questions.push({
          index: q.index as 1 | 2 | 3,
          tone: q.tone,
          needsRequest: q.needsRequest,
          text: q.text,
        });
      }
      for (const c of byId.values()) c.questions.sort((a, b) => a.index - b.index);
      return { byId, playable: [...byId.values()].filter((c) => c.imageKey && c.questions.length === 3) };
    })());
}

/** Card images are never public: each URL is signed and expires (spec §3 "Защита карт"). */
export function imageSigner(opts: { secret: string; publicUrl: string }) {
  return {
    url(cardId: number, now = Date.now()) {
      const exp = Math.floor(now / 1000) + IMAGE_URL_TTL_S;
      return `${opts.publicUrl}/v1/cards/${cardId}/image?exp=${exp}&sig=${sign(`${cardId}.${exp}`, opts.secret)}`;
    },
    verify(cardId: number, exp: number, sig: string) {
      return exp * 1000 > Date.now() && verifySignature(`${cardId}.${exp}`, sig, opts.secret);
    },
  };
}
export type ImageSigner = ReturnType<typeof imageSigner>;

export function cardView(
  deck: Deck,
  signer: ImageSigner,
  cardId: number,
  questionIndex: number,
  locale: Locale,
): CardView {
  const card = deck.byId.get(cardId);
  const q = card?.questions.find((x) => x.index === questionIndex);
  return {
    id: cardId,
    imageUrl: signer.url(cardId),
    questionIndex,
    question: q?.text[locale] ?? q?.text.en ?? "",
    isShadow: card?.tone === "shadow" || q?.tone === "shadow",
  };
}

export function cardImageRoutes(getDeck: () => Promise<Deck>, signer: ImageSigner) {
  const app = new Hono();
  app.get("/:id/image", async (c) => {
    const id = Number(c.req.param("id"));
    const exp = Number(c.req.query("exp"));
    const sig = c.req.query("sig") ?? "";
    if (!Number.isInteger(id) || !signer.verify(id, exp, sig)) return c.body(null, 403);
    const card = (await getDeck()).byId.get(id);
    if (!card?.imageKey) return c.body(null, 404);
    const file = await readFile(new URL(card.imageKey, IMAGES_DIR));
    return c.body(file, 200, {
      "content-type": "image/webp",
      // Private and short-lived, like the URL itself.
      "cache-control": `private, max-age=${IMAGE_URL_TTL_S}`,
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
      "cross-origin-resource-policy": "same-site",
    });
  });
  return app;
}
