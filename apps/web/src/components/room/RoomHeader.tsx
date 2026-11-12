"use client";

import { LangMenu } from "../LangMenu";
import { Star4 } from "../icons";
import { HelpButton } from "../app/HelpSheet";

/** The client's room header: no app tabs (a guest has no account), but always the help button (spec §11). */
export function RoomHeader() {
  return (
    <header className="app-header room-header">
      <div className="container app-header__inner">
        <span className="logo" aria-label="Svity">
          SVITY
          <Star4 size={10} className="logo__star" />
        </span>
        <div className="app-header__end">
          <LangMenu />
          <HelpButton />
        </div>
      </div>
    </header>
  );
}
