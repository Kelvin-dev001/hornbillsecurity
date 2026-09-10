import type { NewFaq } from "@/db/schema";

/**
 * Site-wide FAQs.
 *
 * Every answer below is a fact already settled somewhere in the docs — the
 * deposit, the survey fee and its deliverable, quote validity, the warranty,
 * the notice period, the service area, the VAT treatment. None of it is
 * invented, and none of it claims anything CLAUDE.md §9 says we may not claim
 * yet: PSRA registration and the CA radio licence are both in progress and are
 * described as such, not as held.
 *
 * The figures are written as text rather than interpolated from site_settings
 * because the owner edits these rows in the admin portal, and a row that
 * silently rewrote itself when he changed a setting would be worse than one he
 * has to update deliberately. The seed is the starting point, not the source of
 * truth — which is why the admin portal has an FAQ editor.
 */
export type FaqSeedContext = {
  siteSurveyFee: number;
  depositPercent: number;
  quoteValidityDays: number;
  warrantyMonths: number;
  vatRate: string;
  mpesaPaybill: string;
  mpesaAccount: string;
  serviceAreaLabel: string;
  responsePromise: string;
};

const kes = (value: number) => `KES ${value.toLocaleString("en-KE")}`;

export function buildFaqs(context: FaqSeedContext): NewFaq[] {
  const rows: Omit<NewFaq, "sortOrder">[] = [
    // ── Prices ───────────────────────────────────────────────────────────────
    {
      group: "Prices",
      question: "Why do you publish your prices when nobody else does?",
      answer:
        "Because the alternative wastes everybody's time. The normal process in this market is three site visits, three quotes a week later, and no way to compare them because none of them itemises anything. We publish the whole bill of materials — every camera, every metre of cable, every connector, and the labour — so you can decide whether we are worth calling before you call. If we are more expensive than someone, you can see exactly which line it is.",
    },
    {
      group: "Prices",
      question: "Do your prices include VAT?",
      answer: `No. Every price on this site is VAT-exclusive, which is how quotations in this market are written. VAT at ${Number(context.vatRate)}% is added on the invoice and is shown as its own line on any quotation we send you.`,
    },
    {
      group: "Prices",
      question: "How often do prices change?",
      answer:
        "They are reviewed monthly, and the date of the last review is printed beside every price block on the site. Kenyan equipment pricing moves with the shilling and with shipping, so a price list with no date on it is not telling you anything.",
    },
    {
      group: "Prices",
      question: "Is the price I see the price I pay?",
      answer:
        "For the equipment, yes. What a published package cannot know is your site: an unusually long cable run, trenching, a pole, mains work or a UPS are all things a survey turns up, and they are quoted before the work starts, not added at the invoice. If a survey changes the number we tell you the same day.",
    },

    // ── Buying ───────────────────────────────────────────────────────────────
    {
      group: "Buying",
      question: "Can I buy equipment without installation?",
      answer:
        "The catalogue is published so you can check our numbers and understand what a system needs. What we sell is the installed system, because a large share of the faults we get called out to fix are bad terminations and wrong camera choices on kit bought over the counter.",
    },
    {
      group: "Buying",
      question: "How does the quotation work?",
      answer: `Build a system on the site or send us your site details, and you get a written quotation with every line priced. It is valid for ${context.quoteValidityDays} days from its date. Nothing appears on the invoice that was not on the quote.`,
    },
    {
      group: "Buying",
      question: "How do I pay, and when?",
      answer: `${context.depositPercent}% before installation begins, the balance on completion. M-Pesa Paybill ${context.mpesaPaybill}, account ${context.mpesaAccount}, or bank transfer. We are VAT registered, so you get a proper tax invoice.`,
    },

    // ── Site survey ──────────────────────────────────────────────────────────
    {
      group: "Site survey",
      question: "Do you charge for a site survey?",
      answer: `Yes — ${kes(context.siteSurveyFee)}, credited in full against your invoice if you go ahead. You get a written findings report and camera positions marked up, and that document is yours whether or not you use us. A free survey is a sales visit; this is an engineering one, and it is why our quotes do not move afterwards.`,
    },
    {
      group: "Site survey",
      question: "Is a survey compulsory?",
      answer:
        "For anything beyond a single standalone camera, yes. Quoting a CCTV installation off a phone call means guessing at cable routes, and a guess is how a quote turns into an argument halfway through the job.",
    },

    // ── Installation ─────────────────────────────────────────────────────────
    {
      group: "Installation",
      question: "How long does an installation take?",
      answer:
        "A four-camera residential system is normally one day. Eight cameras is one to two days depending on the cable routes. Older buildings with no existing conduit take longer, and that is the main thing the survey is establishing.",
    },
    {
      group: "Installation",
      question: "Can I view the cameras on my phone?",
      answer:
        "Yes, and setting it up is part of the handover rather than an extra. Before we leave we configure remote viewing on the phones of everyone who needs it and show you how to export a clip — because the day you actually need footage is not the day to be learning that.",
    },
    {
      group: "Installation",
      question: "What happens if something fails?",
      answer: `Workmanship is warranted for ${context.warrantyMonths} months. Equipment carries its manufacturer warranty, and because we are an authorised partner for the brands we lead with, a claim goes through the distributor rather than becoming your problem.`,
    },
    {
      group: "Installation",
      question: "How long will my footage be kept?",
      answer:
        "That is a choice, not a fixed number: it depends on how many cameras you have, at what resolution, and how big a drive you fit. Every package on this site states the retention it is sized for, and the builder recalculates the drive when you change the answer. Surveillance-rated drives are used throughout — a desktop drive in a recorder is a drive that fails in a year.",
    },

    // ── Coverage ─────────────────────────────────────────────────────────────
    {
      group: "Coverage",
      question: "Where do you work?",
      answer: `${context.serviceAreaLabel}. Our technicians live here, which is the difference between a survey this week and a survey when somebody is next travelling down. We serve Nairobi on request but we do not market there.`,
    },
    {
      group: "Coverage",
      question: "How quickly do you reply?",
      answer: context.responsePromise,
    },

    // ── The company ──────────────────────────────────────────────────────────
    {
      group: "The company",
      question: "Are you licensed?",
      answer:
        "We are a registered Kenyan company, VAT registered with KRA, and an authorised partner for the brands we install. Private Security Regulatory Authority registration and Communications Authority radio licensing are both in progress; we will say so on this page the day each is granted, and not before. Anybody in this industry claiming a licence should be asked for the number.",
    },
    {
      group: "The company",
      question: "Can I see work you have done?",
      answer:
        "We are collecting photographs and written case studies from recent installations, with the client's permission in each case, and they will appear on the projects page as they are cleared. We would rather show you nothing than show you a stock photograph of somebody else's building.",
    },
    {
      group: "The company",
      question: "Do you do maintenance contracts?",
      answer:
        "Yes — scheduled cleaning, checks, firmware and a fault response, priced per camera. It is the difference between a system that works in year three and a system that turns out to have stopped recording in month seven. Cancellation is three months' notice.",
    },
  ];

  return rows.map((row, index) => ({ ...row, sortOrder: index * 10, published: true }));
}
