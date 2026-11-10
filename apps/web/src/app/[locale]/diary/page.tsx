import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AppHeader } from "@/components/app/AppHeader";
import { Diary } from "@/components/app/Diary";

export async function generateMetadata({ params }: PageProps<"/[locale]/diary">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : "en", namespace: "app.meta" });
  return { title: t("diary"), robots: { index: false } };
}

export default async function DiaryPage({ params }: PageProps<"/[locale]/diary">) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  return (
    <>
      <AppHeader />
      <main className="app-main">
        <Diary />
      </main>
    </>
  );
}
