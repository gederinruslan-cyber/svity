import { ViewTransition } from "react";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Demo } from "@/components/Demo";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RevealObserver } from "@/components/RevealObserver";
import { Sky } from "@/components/Sky";
import {
  Deck,
  Diary,
  Faq,
  Hero,
  Pros,
  Safety,
  Shadow,
} from "@/components/sections";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);

  return (
    <>
      <Sky />
      <Header />
      <ViewTransition>
        <main>
          <Hero />
          <Demo />
          <Deck />
          <Diary />
          <Shadow />
          <Pros />
          <Safety />
          <Faq />
        </main>
      </ViewTransition>
      <Footer />
      <RevealObserver />
    </>
  );
}
