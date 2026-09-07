import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { SiteSettings } from "@/db/schema";
import { formatKes } from "@/lib/money";
import { formatAddress, formatVatRate } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/seo/origin";
import type { SavedQuote } from "./read";

/**
 * The quotation PDF.
 *
 * Every company detail comes from site_settings and every URL from
 * lib/seo/origin — CLAUDE.md §9 and §3. Nothing on this document is typed in,
 * including the paybill, the deposit percentage and the survey fee, because a
 * PDF is the one artefact that outlives a website change and gets forwarded to
 * people who never visit the site.
 *
 * Colours come from docs/04. Never white on --brand-orange (3.25:1); the header
 * band is --ink with --brand-gold, which measures 11.98:1.
 */

const INK = "#0f0f12";
const MUTED = "#6b6660";
const LINE = "#e6e2de";
const PAPER_WARM = "#faf8f6";
const GOLD = "#ffc400";
const ACTION = "#c64200";

const styles = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 48, paddingHorizontal: 32, fontSize: 9, color: INK },

  letterhead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  brand: { fontSize: 16, fontWeight: 700 },
  brandLegal: { fontSize: 8, color: MUTED, marginTop: 2 },
  contact: { fontSize: 8, color: MUTED, textAlign: "right", lineHeight: 1.5 },

  codeBand: {
    backgroundColor: INK,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  codeLabel: { color: "#ffffff", fontSize: 8, opacity: 0.8 },
  code: { color: GOLD, fontSize: 18, fontWeight: 700, letterSpacing: 2 },
  codeMeta: { color: "#ffffff", fontSize: 8, textAlign: "right", lineHeight: 1.6 },

  panels: { flexDirection: "row", gap: 10, marginBottom: 12 },
  // alignItems: flex-start stops the shorter panel's lines being stretched apart
  // to match the taller one.
  panel: { flex: 1, borderWidth: 1, borderColor: LINE, padding: 9, alignItems: "flex-start" },
  panelTitle: { fontSize: 7, color: MUTED, textTransform: "uppercase", marginBottom: 3 },
  panelLine: { lineHeight: 1.4 },

  groupHeading: {
    backgroundColor: PAPER_WARM,
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 7,
    textTransform: "uppercase",
    fontWeight: 700,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
  },
  cellItem: { width: "44%" },
  cellQty: { width: "14%", textAlign: "right" },
  cellUnit: { width: "20%", textAlign: "right" },
  cellTotal: { width: "22%", textAlign: "right" },
  sku: { fontSize: 7, color: ACTION, marginTop: 1 },
  note: { fontSize: 7, color: MUTED, marginTop: 1 },

  totals: { marginTop: 8, alignSelf: "flex-end", width: "56%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: INK,
    color: "#ffffff",
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  grandValue: { color: GOLD, fontWeight: 700, fontSize: 12 },

  terms: { marginTop: 14, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
  termsTitle: { fontSize: 8, fontWeight: 700, marginBottom: 4 },
  termsLine: { fontSize: 8, color: MUTED, lineHeight: 1.6, marginBottom: 2 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
  },
});

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function QuotationDocument({
  quote,
  settings,
}: {
  quote: SavedQuote;
  settings: SiteSettings;
}) {
  return (
    <Document
      title={`Quotation ${quote.code} — ${settings.tradingName}`}
      author={settings.legalName}
      subject={`Security system quotation for ${quote.customerName}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          <View>
            <Text style={styles.brand}>{settings.tradingName}</Text>
            <Text style={styles.brandLegal}>
              {settings.legalName} · Reg {settings.companyRegistrationNo} · KRA{" "}
              {settings.kraPin}
            </Text>
          </View>
          <View>
            <Text style={styles.contact}>{formatAddress(settings)}</Text>
            <Text style={styles.contact}>{settings.phone}</Text>
            <Text style={styles.contact}>{settings.email}</Text>
          </View>
        </View>

        <View style={styles.codeBand}>
          <View>
            <Text style={styles.codeLabel}>QUOTATION</Text>
            <Text style={styles.code}>{quote.code}</Text>
          </View>
          <View>
            <Text style={styles.codeMeta}>Issued {formatDate(quote.createdAt)}</Text>
            <Text style={styles.codeMeta}>Valid until {formatDate(quote.validUntil)}</Text>
          </View>
        </View>

        <View style={styles.panels}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Prepared for</Text>
            <Text style={styles.panelLine}>{quote.customerName}</Text>
            <Text style={styles.panelLine}>
              {quote.area}, {quote.county}
            </Text>
            <Text style={styles.panelLine}>{quote.propertyType}</Text>
          </View>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>This quotation online</Text>
            <Text style={styles.panelLine}>{absoluteUrl(`/q/${quote.code}`)}</Text>
            <Text style={[styles.panelLine, { color: MUTED, marginTop: 3 }]}>
              The same prices, for {settings.quoteValidityDays} days.
            </Text>
          </View>
        </View>

        <View style={styles.headRow}>
          <Text style={styles.cellItem}>Item</Text>
          <Text style={styles.cellQty}>Qty</Text>
          <Text style={styles.cellUnit}>Unit price</Text>
          <Text style={styles.cellTotal}>Total</Text>
        </View>

        {quote.groups.map((group) => (
          <View key={group.lineType} wrap={false}>
            <Text style={styles.groupHeading}>{group.label}</Text>
            {group.lines.map((line, index) => (
              <View key={`${group.lineType}-${index}`} style={styles.row}>
                <View style={styles.cellItem}>
                  <Text>{line.name}</Text>
                  {line.sku ? <Text style={styles.sku}>{line.sku}</Text> : null}
                  {line.note ? <Text style={styles.note}>{line.note}</Text> : null}
                </View>
                <Text style={styles.cellQty}>
                  {line.quantity} {line.unit}
                </Text>
                <Text style={styles.cellUnit}>{formatKes(line.unitPrice)}</Text>
                <Text style={styles.cellTotal}>{formatKes(line.extended)}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal, excluding VAT</Text>
            <Text>{formatKes(quote.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: MUTED }}>VAT at {quote.vatRate}%</Text>
            <Text style={{ color: MUTED }}>{formatKes(quote.vatAmount)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={{ fontWeight: 700 }}>Total including VAT</Text>
            <Text style={styles.grandValue}>{formatKes(quote.total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: MUTED }}>
              {quote.depositPercent}% deposit to begin
            </Text>
            <Text>{formatKes(quote.deposit)}</Text>
          </View>
        </View>

        <View style={styles.terms}>
          <Text style={styles.termsTitle}>Terms</Text>
          <Text style={styles.termsLine}>
            Valid {settings.quoteValidityDays} days from issue. Prices in KES, exclusive of VAT
            except where the total states otherwise. Workmanship warranty{" "}
            {settings.warrantyMonths} months.
          </Text>
          <Text style={styles.termsLine}>
            {quote.depositPercent}% deposit before installation begins. M-Pesa Paybill{" "}
            {settings.mpesaPaybill}, Account {settings.mpesaAccount}.
          </Text>
          <Text style={styles.termsLine}>
            Site survey {formatKes(settings.siteSurveyFee)}: {settings.siteSurveyDeliverable}
          </Text>
          <Text style={styles.termsLine}>
            Quantities are an indicative estimate confirmed at survey. Cable runs, containment
            and labour vary with the building, and the survey is where they stop being an
            estimate.
          </Text>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${settings.legalName} · ${settings.email} · ${settings.phone} · ` +
            `VAT ${formatVatRate(settings.vatRate)}% · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function renderQuotationPdf(
  quote: SavedQuote,
  settings: SiteSettings,
): Promise<Buffer> {
  return renderToBuffer(<QuotationDocument quote={quote} settings={settings} />);
}

export function quotationFilename(quote: SavedQuote, settings: SiteSettings): string {
  const business = settings.tradingName.replace(/[^A-Za-z0-9]+/g, "-");
  return `${business}-quotation-${quote.code}.pdf`;
}
