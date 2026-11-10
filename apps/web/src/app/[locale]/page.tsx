import { ViewTransition } from "react";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Demo } from "@/components/Demo";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HowStory } from "@/components/HowStory";
import { RevealObserver } from "@/components/RevealObserver";
import { Sky } from "@/components/Sky";
import { Signup } from "@/components/Signup";
import {
  Deck,
  Diary,
  Faq,
  Hero,
  Languages,
  Principles,
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
          <Principles />
          <HowStory />
          <Deck />
          <Diary />
          <Shadow />
          <Pros />
          <Safety />
          <Languages />
          <Faq />
          <Signup />
        </main>
      </ViewTransition>
      <Footer />
      <RevealObserver />
    </>
  );
}
