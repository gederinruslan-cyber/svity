import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Start } from "@/components/app/Auth";

export async function generateMetadata({ params }: PageProps<"/[locale]/start">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : "en", namespace: "app.meta" });
  return { title: t("start"), robots: { index: false } };
}

export default async function StartPage({ params }: PageProps<"/[locale]/start">) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  return <Start />;
}
