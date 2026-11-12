import { notFound } from "next/navigation";
import { roomsOpen } from "@svity/contracts";

/** Session rooms stay closed until the psychologists' beta. */
export default function RoomsGate({ children }: { children: React.ReactNode }) {
  if (!roomsOpen) notFound();
  return children;
}
