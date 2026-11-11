import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ResetPassword } from "@/components/app/Auth";

// Reset links must never leak through the Referer header or search indexes.
export const metadata: Metadata = { robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ params, searchParams }: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  const token = (await searchParams).token;
  return <ResetPassword token={typeof token === "string" ? token : ""} />;
}
