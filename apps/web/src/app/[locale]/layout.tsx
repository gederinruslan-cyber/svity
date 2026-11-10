import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { palette, themeCss } from "@svity/tokens";
import { routing } from "@/i18n/routing";
import "../globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});
const sans = Manrope({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-sans" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: { uk: "/uk", en: "/en", "x-default": "/en" },
    },
    openGraph: { title: t("title"), description: t("description"), images: ["/brand/icon-512.png"] },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: palette.pearlIvory },
    { media: "(prefers-color-scheme: dark)", color: palette.night },
  ],
};

// Runs before first paint so the saved or time-based theme never flashes.
const themeScript = `(function(){var d=document.documentElement;try{var q=new URLSearchParams(location.search).get('theme');var p=(q==='day'||q==='evening')?q:(localStorage.getItem('svity-theme')||'auto');var h=new Date().getHours();d.dataset.themePref=p;d.dataset.theme=p==='auto'?(h>=18||h<6?'evening':'day'):p}catch(e){d.dataset.theme='day'}})()`;

const themeVars = `:root,[data-theme=day]{${themeCss("day")}}[data-theme=evening]{${themeCss("evening")}}`;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <Script id="svity-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
