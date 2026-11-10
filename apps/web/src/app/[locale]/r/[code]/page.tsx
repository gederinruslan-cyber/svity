import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ClientRoom } from "@/components/room/ClientRoom";
import { RoomHeader } from "@/components/room/RoomHeader";

export async function generateMetadata({ params }: PageProps<"/[locale]/r/[code]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : "en", namespace: "app.meta" });
  // The link is a secret: keep it out of search engines and referrers.
  return { title: t("room"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function RoomPage({ params }: PageProps<"/[locale]/r/[code]">) {
  const { locale, code } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  return (
    <>
      <RoomHeader />
      <main className="app-main room-main">
        <ClientRoom code={code} />
      </main>
    </>
  );
}
