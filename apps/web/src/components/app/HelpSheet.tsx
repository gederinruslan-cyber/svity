"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  EMERGENCY_NUMBER,
  FIND_A_HELPLINE,
  guessCountry,
  helplineCountries,
  helplines,
  type HelplineCountry,
} from "@svity/i18n";
import { Close, Lifebuoy } from "../icons";
import { Breathing } from "./Breathing";

const COUNTRY_KEY = "svity-help-country";

/**
 * "I need help now" (spec §11): a lifebuoy button in the header of every app screen.
 * Opens a sheet with 112, the support line for the chosen country, findahelpline.com and a
 * one-minute breath. Works without the network: everything here is bundled.
 */
export function HelpButton({ timezone, className = "" }: { timezone?: string; className?: string }) {
  const t = useTranslations("app.help");
  const dialog = useRef<HTMLDialogElement>(null);
  const [breathing, setBreathing] = useState(false);

  const open = () => {
    setBreathing(false);
    dialog.current?.showModal();
  };

  return (
    <>
      <button type="button" className={`help-btn ${className}`} onClick={open} aria-label={t("open")} title={t("open")}>
        <Lifebuoy size={20} />
      </button>
      <dialog
        ref={dialog}
        className="help-sheet"
        aria-labelledby="help-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close(); // tap on the backdrop
        }}
      >
        <div className="help-sheet__inner">
          <button type="button" className="icon-btn help-sheet__close" onClick={() => dialog.current?.close()} aria-label={t("close")}>
            <Close size={18} />
          </button>
          {breathing ? <Breathing autoStart /> : <HelpContent timezone={timezone} onBreathe={() => setBreathing(true)} />}
        </div>
      </dialog>
    </>
  );
}

function HelpContent({ timezone, onBreathe }: { timezone?: string; onBreathe: () => void }) {
  const t = useTranslations("app.help");
  const locale = useLocale();
  const [country, setCountry] = useState<HelplineCountry | "">("");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(COUNTRY_KEY);
    } catch {}
    const known = helplineCountries.find((c) => c === saved);
    setCountry(known ?? guessCountry(timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, locale) ?? "");
  }, [timezone, locale]);

  const names = new Intl.DisplayNames([locale], { type: "region" });
  const lines = country ? helplines[country] : [];
  const tel = (n: string) => `tel:${n.replace(/\s/g, "")}`;

  return (
    <>
      <h2 id="help-title" className="h3">
        {t("title")}
      </h2>
      <a className="help-sheet__emergency" href={tel(EMERGENCY_NUMBER)}>
        <span>{t("danger", { number: EMERGENCY_NUMBER })}</span>
        <strong>{t("call", { number: EMERGENCY_NUMBER })}</strong>
      </a>

      <label className="field-label" htmlFor="help-country">
        {t("country")}
      </label>
      <select
        id="help-country"
        className="field"
        value={country}
        onChange={(e) => {
          const v = e.target.value as HelplineCountry | "";
          setCountry(v);
          try {
            localStorage.setItem(COUNTRY_KEY, v);
          } catch {}
        }}
      >
        <option value="">{t("other")}</option>
        {helplineCountries.map((c) => (
          <option key={c} value={c}>
            {names.of(c)}
          </option>
        ))}
      </select>

      {lines.length > 0 && (
        <ul className="help-sheet__lines" aria-label={t("lines")}>
          {lines.map((l) => (
            <li key={l.phone}>
              <a href={tel(l.phone)} className="help-line">
                <span className="help-line__name">{l.name}</span>
                <span className="help-line__phone">{l.phone}</span>
                {l.hours && <span className="help-line__hours">{l.hours}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
      {lines.some((l) => !l.verified) && <p className="app-hint">{t("unverified")}</p>}

      <a className="help-sheet__find" href={FIND_A_HELPLINE} target="_blank" rel="noopener noreferrer">
        {t("find")} ↗
      </a>
      <button type="button" className="btn btn--block" onClick={onBreathe}>
        {t("breathe")}
      </button>
      <p className="app-hint help-sheet__note">{t("notService")}</p>
    </>
  );
}
