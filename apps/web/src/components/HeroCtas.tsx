import { getTranslations } from "next-intl/server";

/** Hero buttons. Before launch there are no accounts: try the card here, or read about rooms. */
export async function HeroCtas() {
  const t = await getTranslations("hero");
  return (
    <div className="hero__ctas-wrap reveal">
      <div className="hero__ctas">
        <a href="#try" className="btn btn--large">
          {t("cta1")}
        </a>
        <a href="#pros" className="btn btn--ghost btn--large">
          {t("cta2")}
        </a>
      </div>
      <p className="hero__signin">{t("soon")}</p>
    </div>
  );
}
