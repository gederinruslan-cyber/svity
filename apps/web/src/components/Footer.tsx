import { getLocale, getTranslations } from "next-intl/server";
import { siteLocales } from "@svity/contracts";
import { localeHref } from "@/i18n/navigation";
import { LANGUAGES } from "@/i18n/languages";
import { Globe, Lifebuoy, Star4 } from "./icons";

const CONTACT = "hello@svity.app";

export async function Footer() {
  const t = await getTranslations("footer");
  const locale = await getLocale();
  // Topics from "Write to the authors" in the product spec; each opens a pre-filled e-mail.
  const topics = [t("topicIdea"), t("topicCard"), t("topicBug"), t("topicThanks")];
  const columns: [string, [string, string][]][] = [
    [
      t("colApp"),
      [
        [`/${locale}/signup`, t("linkSignup")],
        [`/${locale}/signin`, t("linkSignin")],
        ["#try", t("linkTry")],
        ["#how", t("linkHow")],
        ["#deck", t("linkDeck")],
        ["#diary", t("linkDiary")],
        ["#shadow", t("linkShadow")],
        ["#safety", t("linkSafety")],
      ],
    ],
    [
      t("colPros"),
      [
        ["#pros", t("linkRoom")],
        ["#faq", t("linkFaq")],
      ],
    ],
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <p className="logo logo--footer">
              SVITY
              <Star4 size={10} className="logo__star" />
            </p>
            <p className="footer__tagline">{t("tagline")}</p>
            <p className="footer__about">{t("about")}</p>
          </div>

          {columns.map(([title, links]) => (
            <nav key={title} className="footer__col" aria-label={title}>
              <p className="footer__title">{title}</p>
              <ul>
                {links.map(([href, label]) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="footer__col">
            <p className="footer__title">{t("colWrite")}</p>
            <ul>
              {topics.map((topic) => (
                <li key={topic}>
                  <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(`Svity: ${topic}`)}`}>{topic}</a>
                </li>
              ))}
            </ul>
            <a className="footer__mail" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
          </div>
        </div>

        <aside className="footer__care glass" aria-labelledby="footer-care">
          <span className="footer__care-icon">
            <Lifebuoy size={20} />
          </span>
          <div>
            <p id="footer-care" className="footer__care-title">
              {t("crisisTitle")}
            </p>
            <p className="footer__care-text">{t("crisis")}</p>
          </div>
        </aside>

        <div className="footer__bar">
          <div className="footer__langs">
            <Globe size={16} />
            <span className="sr-only">{t("language")}</span>
            {siteLocales.map((l) => (
              <a
                key={l}
                href={localeHref(l, "/")}
                hrefLang={l}
                lang={l}
                className={l === locale ? "is-active" : ""}
                aria-current={l === locale ? "true" : undefined}
              >
                {LANGUAGES[l].name}
              </a>
            ))}
          </div>
          <p className="footer__rights">
            {t("rights", { year: new Date().getFullYear() })} · {t("made")}
          </p>
          <a href="#top" className="footer__top">
            <Star4 size={12} /> {t("top")}
          </a>
        </div>
      </div>
    </footer>
  );
}
