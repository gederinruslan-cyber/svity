import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AppHeader } from "@/components/app/AppHeader";
import { SessionSummaryPage } from "@/components/room/SessionSummaryPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/diary/session/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : "en", namespace: "app.meta" });
  return { title: t("diary"), robots: { index: false } };
}

export default async function SessionSummaryPagePage({ params }: PageProps<"/[locale]/diary/session/[id]">) {
  const { locale, id } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  return (
    <>
      <AppHeader />
      <main className="app-main">
        <SessionSummaryPage id={id} />
      </main>
    </>
  );
}
