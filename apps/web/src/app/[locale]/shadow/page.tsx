import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AppHeader } from "@/components/app/AppHeader";
import { AppFooter } from "@/components/app/AppFooter";
import { ShadowFlow } from "@/components/app/ShadowFlow";

export async function generateMetadata({ params }: PageProps<"/[locale]/shadow">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : "en", namespace: "app.meta" });
  return { title: t("shadow"), robots: { index: false } };
}

export default async function ShadowFlowPage({ params }: PageProps<"/[locale]/shadow">) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  return (
    <>
      <AppHeader />
      <main className="app-main">
        <ShadowFlow />
      </main>
      <AppFooter />
    </>
  );
}
