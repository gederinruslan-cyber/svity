import type { Locale } from "@svity/contracts";

export interface Mailer {
  sendPasswordReset(to: string, link: string, locale: Locale): Promise<void>;
}

/** Local development: the link is printed to the API console instead of being e-mailed. */
export const consoleMailer: Mailer = {
  async sendPasswordReset(to, link) {
    console.log(`\n✉️  Password reset link for ${to}:\n   ${link}\n`);
  },
};
