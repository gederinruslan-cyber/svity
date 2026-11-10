import type { Locale } from "@svity/contracts";

export interface Mailer {
  sendSignInLink(to: string, link: string, locale: Locale): Promise<void>;
}

/** Local development: the link is printed to the API console instead of being e-mailed. */
export const consoleMailer: Mailer = {
  async sendSignInLink(to, link) {
    console.log(`\n✉️  Sign-in link for ${to}:\n   ${link}\n`);
  },
};
