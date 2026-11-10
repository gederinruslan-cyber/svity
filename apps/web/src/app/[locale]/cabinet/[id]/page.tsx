import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AppHeader } from "@/components/app/AppHeader";
import { PsychologistSession } from "@/components/room/PsychologistSession";

export async function generateMetadata({ params }: PageProps<"/[locale]/cabinet/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : "en", namespace: "app.meta" });
  return { title: t("room"), robots: { index: false } };
}

export default async function PsychologistSessionPage({ params }: PageProps<"/[locale]/cabinet/[id]">) {
  const { locale, id } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  return (
    <>
      <AppHeader />
      <main className="app-main">
        <PsychologistSession id={id} />
      </main>
    </>
  );
}
