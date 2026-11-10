import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Verify } from "@/components/app/Verify";

// Sign-in links must never leak through the Referer header or search indexes.
export const metadata: Metadata = { robots: { index: false }, referrer: "no-referrer" };

export default async function VerifyPage({ params, searchParams }: PageProps<"/[locale]/signin/verify">) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  const token = (await searchParams).token;
  return <Verify token={typeof token === "string" ? token : ""} />;
}
