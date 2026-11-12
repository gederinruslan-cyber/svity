import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Lifebuoy, Star4 } from "../icons";

const CONTACT = "hello@svity.app";

/** The signed-in footer: where else to go, a way to write to us, and the care note. */
export function AppFooter() {
  const t = useTranslations("app.footer");
  const tf = useTranslations("footer");
  return (
    <footer className="app-footer">
      <div className="container">
        <div className="app-footer__top">
          <div className="app-footer__brand">
            <Link href="/" className="logo logo--footer">
              SVITY
              <Star4 size={10} className="logo__star" />
            </Link>
            <p>{tf("tagline")}</p>
          </div>
          <nav className="app-footer__links" aria-label={t("label")}>
            <Link href="/">{t("about")}</Link>
            <Link href="/difficult-day">{t("difficult")}</Link>
            <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(`Svity: ${tf("topicIdea")}`)}`}>{tf("contact")}</a>
          </nav>
        </div>
        <p className="app-footer__care">
          <Lifebuoy size={16} />
          <span>{t("care")}</span>
        </p>
        <p className="app-footer__rights">{tf("rights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
