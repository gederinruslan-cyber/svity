import cs from "../messages/cs.json";
import de from "../messages/de.json";
import en from "../messages/en.json";
import es from "../messages/es.json";
import fr from "../messages/fr.json";
import it from "../messages/it.json";
import pl from "../messages/pl.json";
import uk from "../messages/uk.json";

export type Messages = typeof en;

type Tree = { [k: string]: unknown };
/** `base` with `over` laid on top, key by key (arrays and strings are replaced whole). */
function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = base[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object" && !Array.isArray(b)
        ? merge(b as Tree, v as Tree)
        : v;
  }
  return out;
}
// The six newer languages cover the public site; app-only text falls back to English.
const withEnglish = (m: Tree) => merge(en as Tree, m) as Messages;

export const messages = {
  en,
  uk,
  de: withEnglish(de),
  pl: withEnglish(pl),
  cs: withEnglish(cs),
  it: withEnglish(it),
  es: withEnglish(es),
  fr: withEnglish(fr),
} as const;
export * from "./helplines";
