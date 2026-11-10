import en from "../messages/en.json";
import uk from "../messages/uk.json";

export const messages = { en, uk } as const;
export type Messages = typeof en;
export * from "./helplines";
