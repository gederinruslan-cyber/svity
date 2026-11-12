"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session";

/** Hero buttons: start for new visitors, straight back to the card for signed-in ones. */
export function HeroCtas() {
  const t = useTranslations("hero");
  const session = useSession();
  return (
    <div className={`hero__ctas-wrap reveal ${session.status === "unknown" ? "is-pending" : ""}`}>
      <div className="hero__ctas">
        {session.status === "in" ? (
          <>
            <Link href="/today" className="btn btn--large">
              {t("ctaToday")}
            </Link>
            <Link href="/diary" className="btn btn--ghost btn--large">
              {t("ctaDiary")}
            </Link>
          </>
        ) : (
          <>
            <Link href="/signup" className="btn btn--large">
              {t("cta1")}
            </Link>
            <a href="#pros" className="btn btn--ghost btn--large">
              {t("cta2")}
            </a>
          </>
        )}
      </div>
      {session.status !== "in" && (
        <p className="hero__signin">
          {t("haveAccount")} <Link href="/signin">{t("signin")}</Link>
        </p>
      )}
    </div>
  );
}
