import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CountUp } from "./CountUp";
import { DeckGallery } from "./DeckGallery";
import { HeroFan } from "./HeroFan";
import { HeroCtas } from "./HeroCtas";
import { HeroQuestions } from "./HeroQuestions";
import { RoomMock } from "./RoomMock";
import {
  Check,
  DoorClose,
  Globe,
  Leaf,
  Lifebuoy,
  Lock,
  Mirror,
  Ornament,
  Star4,
} from "./icons";

// [left %, top %, size px] for the gold stars in the hero sky.
const TWINKLES: [number, number, number][] = [
  [6, 18, 9],
  [14, 62, 6],
  [22, 30, 12],
  [31, 82, 7],
  [44, 12, 8],
  [52, 70, 6],
  [58, 26, 10],
  [66, 88, 8],
  [73, 14, 6],
  [81, 52, 12],
  [88, 22, 7],
  [93, 74, 9],
  [37, 46, 6],
  [8, 90, 8],
];
// Indexes into TWINKLES, joined by a faint line that draws itself on load.
const CONSTELLATION = [0, 2, 4, 6, 8, 10, 9];

function Head({
  eyebrow,
  title,
  sub,
  id,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  id: string;
}) {
  return (
    <header className="section-head reveal">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="h2">
        {title}
      </h2>
      <Ornament />
      {sub && <p className="lead">{sub}</p>}
    </header>
  );
}

export async function Hero() {
  const t = await getTranslations("hero");
  return (
    <section className="hero" id="top">
      <div className="hero__sky" aria-hidden="true">
        <span className="cloud cloud--1" />
        <span className="cloud cloud--2" />
        <span className="cloud cloud--3" />
        <svg
          className="constellation"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={CONSTELLATION.map(
              (i) => `${TWINKLES[i]![0]},${TWINKLES[i]![1]}`,
            ).join(" ")}
            pathLength={1}
          />
        </svg>
        {TWINKLES.map(([x, y, s], i) => (
          <span
            key={i}
            className="twinkle"
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${(i * 0.7) % 5}s`,
              } as React.CSSProperties
            }
          >
            <Star4 size={s} />
          </span>
        ))}
      </div>
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="eyebrow reveal">{t("eyebrow")}</p>
          <h1 className="h1 hero__title reveal">{t("title")}</h1>
          <p className="lead hero__lead reveal">{t("sub")}</p>
          <HeroCtas />
          <dl className="hero__facts reveal">
            {(["cards", "questions", "minutes"] as const).map((k) => (
              <div key={k}>
                <dt>{t(`facts.${k}N`)}</dt>
                <dd>{t(`facts.${k}`)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="hero__art">
          <HeroFan label={t("tryCard")} />
          <HeroQuestions />
        </div>
      </div>
    </section>
  );
}

export async function Principles() {
  const t = await getTranslations("principles");
  const tc = await getTranslations("cards");
  const td = await getTranslations("demo");
  const question = (tc.raw("21") as string[])[0];
  const items = [
    [Mirror, t("p1t"), t("p1")],
    [Leaf, t("p2t"), t("p2")],
    [Lock, t("p3t"), t("p3")],
    [Lifebuoy, t("p4t"), t("p4")],
  ] as const;
  return (
    // id="how": the header's and footer's "How it works" links land here.
    <section className="section about" id="how" aria-labelledby="principles-title">
      <div className="container">
        <Head id="principles-title" eyebrow={t("eyebrow")} title={t("title")} sub={t("lead")} />

        {/* How the mirror works: a real card, its question, your answer. */}
        <div className="about__mirror reveal">
          <div className="about__card">
            <Image src="/cards/demo-21.webp" alt={td("cardAlt", { n: 21 })} fill sizes="(max-width: 800px) 46vw, 240px" />
          </div>
          <ol className="about__steps">
            <li>
              <span className="about__n">1</span>
              <div>
                <h3 className="about__t">{t("a1t")}</h3>
                <p>{t("a1")}</p>
              </div>
            </li>
            <li>
              <span className="about__n">2</span>
              <div>
                <h3 className="about__t">{t("a2t")}</h3>
                <p className="about__q">{question}</p>
              </div>
            </li>
            <li>
              <span className="about__n">3</span>
              <div>
                <h3 className="about__t">{t("a3t")}</h3>
                <p>{t("a3")}</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="about__grid">
          {items.map(([Icon, title, body], i) => (
            <article key={i} className="panel glass reveal about__item" style={{ "--d": i } as React.CSSProperties}>
              <span className="about__icon">
                <Icon size={22} />
              </span>
              <h3 className="h3">{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <p className="about__note reveal">
          <Star4 size={10} className="about__note-star" /> {t("mak")}
        </p>
      </div>
    </section>
  );
}

export async function Deck() {
  const t = await getTranslations("deck");
  return (
    <section className="section deck" id="deck" aria-labelledby="deck-title">
      <div className="container">
        <Head
          id="deck-title"
          eyebrow={t("eyebrow")}
          title={t("title")}
          sub={t("sub")}
        />
        <dl className="stats reveal">
          <div>
            <dt>
              <CountUp to={117} />
            </dt>
            <dd>{t("stat1")}</dd>
          </div>
          <div>
            <dt>
              <CountUp to={3} />
            </dt>
            <dd>{t("stat2")}</dd>
          </div>
          <div>
            <dt>
              <CountUp to={2} />
            </dt>
            <dd>{t("stat3")}</dd>
          </div>
        </dl>
      </div>
      <DeckGallery />
    </section>
  );
}

export async function Diary() {
  const t = await getTranslations("diary");
  // November 2026 starts on a Sunday; Monday-first grid → 6 leading blanks.
  const withCards: Record<number, number> = {
    2: 1,
    3: 2,
    5: 4,
    6: 6,
    7: 7,
    9: 8,
    10: 9,
  };
  const today = 10;
  return (
    <section className="section" id="diary" aria-labelledby="diary-title">
      <div className="container diary">
        <div className="diary__copy">
          <Head
            id="diary-title"
            eyebrow={t("eyebrow")}
            title={t("title")}
            sub={t("sub")}
          />
          <article className="entry glass reveal">
            <span className="entry__thumb">
              <Image src="/cards/demo-25.webp" alt="" fill sizes="72px" />
            </span>
            <div>
              <p className="entry__meta">
                {t("entryDate")} · {t("entryCard")}
              </p>
              <p className="entry__q">{t("entryQuestion")}</p>
              <p className="entry__note">{t("entryNote")}</p>
              <p className="entry__feel">
                <span className="chip chip--sm">{t("entryBefore")}</span>
                <span aria-hidden="true">→</span>
                <span className="chip chip--sm chip--sage">
                  {t("entryAfter")}
                </span>
              </p>
            </div>
          </article>
        </div>
        <div className="mosaic glass reveal">
          <p className="mosaic__month">{t("month")}</p>
          <div className="mosaic__grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: 30 }, (_, i) => {
              const day = i + 1;
              const card = withCards[day];
              return (
                <span
                  key={day}
                  style={{ "--i": day } as React.CSSProperties}
                  className={`mosaic__day ${card ? "has-card" : ""} ${day === today ? "is-today" : ""} ${day > today ? "is-future" : ""}`}
                >
                  {card ? (
                    <Image
                      src={`/cards/gallery-${card}.webp`}
                      alt=""
                      fill
                      sizes="48px"
                    />
                  ) : (
                    day
                  )}
                </span>
              );
            })}
          </div>
          <p className="mosaic__count">{t("monthCount")}</p>
          <p className="mosaic__insight">{t("insight")}</p>
        </div>
      </div>
    </section>
  );
}

export async function Shadow() {
  const t = await getTranslations("shadow");
  return (
    <section
      className="section shadow"
      id="shadow"
      data-theme="evening"
      aria-labelledby="shadow-title"
    >
      <div className="container shadow__grid">
        <div className="shadow__art reveal" aria-hidden="true">
          <Image src="/brand/door.webp" alt="" width={320} height={320} />
        </div>
        <div>
          <Head
            id="shadow-title"
            eyebrow={t("eyebrow")}
            title={t("title")}
            sub={t("sub")}
          />
          <ul className="ticks reveal">
            {[t("i1"), t("i2"), t("i3")].map((x) => (
              <li key={x}>
                <Check />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export async function Pros() {
  const t = await getTranslations("pros");
  const features = [t("f1"), t("f2"), t("f3"), t("f4"), t("f5"), t("f6")];
  return (
    <section className="section" id="pros" aria-labelledby="pros-title">
      <div className="container pros">
        <div>
          <Head
            id="pros-title"
            eyebrow={t("eyebrow")}
            title={t("title")}
            sub={t("sub")}
          />
          <ul className="ticks reveal">
            {features.map((x) => (
              <li key={x}>
                <Check />
                {x}
              </li>
            ))}
          </ul>
          <a href="#join-pro" className="btn reveal">
            {t("cta")}
          </a>
        </div>

        <RoomMock />
      </div>
    </section>
  );
}

export async function Safety() {
  const t = await getTranslations("safety");
  const items = [
    [<Lifebuoy key="l" />, t("s1t"), t("s1")],
    [<Leaf key="f" />, t("s2t"), t("s2")],
    [<DoorClose key="d" />, t("s3t"), t("s3")],
  ] as const;
  return (
    <section className="section" id="safety" aria-labelledby="safety-title">
      <div className="container">
        <Head id="safety-title" eyebrow={t("eyebrow")} title={t("title")} />
        <div className="grid-3">
          {items.map(([icon, title, body], i) => (
            <article
              key={title}
              className="feature reveal"
              style={{ "--d": i } as React.CSSProperties}
            >
              <span className="feature__icon">{icon}</span>
              <h3 className="h3">{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const LANGS: [string, boolean][] = [
  ["Українська", true],
  ["English", true],
  ["Deutsch", false],
  ["Polski", false],
  ["Čeština", false],
  ["Italiano", false],
  ["Español", false],
  ["Français", false],
];

export async function Languages() {
  const t = await getTranslations("langs");
  return (
    <section className="section" aria-labelledby="langs-title">
      <div className="container">
        <Head
          id="langs-title"
          eyebrow={t("eyebrow")}
          title={t("title")}
          sub={t("sub")}
        />
        <ul className="langs reveal">
          {LANGS.map(([name, live]) => (
            <li key={name} className={`lang ${live ? "is-live" : ""}`}>
              <Globe size={16} />
              {name}
              {!live && <span className="lang__soon">{t("soon")}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function Faq() {
  const t = await getTranslations("faq");
  const qs = [1, 2, 3, 4, 5, 6, 7] as const;
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="container container--narrow">
        <Head id="faq-title" eyebrow={t("eyebrow")} title={t("title")} />
        <div className="faq reveal">
          {qs.map((n) => (
            <details key={n} className="faq__item">
              <summary>{t(`q${n}`)}</summary>
              <p>{t(`a${n}`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
