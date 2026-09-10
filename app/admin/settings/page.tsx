import {
  AdminHeading,
  Checkbox,
  Field,
  FormMessage,
  NumberInput,
  Panel,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { saveSiteSettingsAction } from "@/lib/admin/settings-actions";
import { formatAddress, getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Business details" };

/**
 * The single row every business fact on the site is read from.
 *
 * CLAUDE.md §9 and docs/02: none of this may be hardcoded in a component, which
 * is exactly what makes this page worth having — changing the phone number here
 * changes the header, the footer, every WhatsApp link, the quotation PDF and the
 * JSON-LD, and there is nowhere else to look.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, settings] = await Promise.all([searchParams, getSiteSettings()]);

  return (
    <>
      <AdminHeading
        title="Business details"
        description="Everything here appears on the public site. There is nowhere else these are written down."
      />

      <FormMessage status={status} />

      <form action={saveSiteSettingsAction} className="space-y-6">
        <Panel title="Who you are">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trading name" name="tradingName" required>
              <TextInput name="tradingName" defaultValue={settings.tradingName} required />
            </Field>
            <Field label="Legal entity" name="legalName" required>
              <TextInput name="legalName" defaultValue={settings.legalName} required />
            </Field>
            <Field label="Company registration" name="companyRegistrationNo">
              <TextInput name="companyRegistrationNo" defaultValue={settings.companyRegistrationNo} />
            </Field>
            <Field label="KRA PIN" name="kraPin">
              <TextInput name="kraPin" defaultValue={settings.kraPin} />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Contact"
          description="The WhatsApp number is what every commercial button on the site opens."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone, as displayed" name="phone" hint="0759293030">
              <TextInput name="phone" defaultValue={settings.phone} />
            </Field>
            <Field label="WhatsApp number" name="whatsappNumber" hint="254759293030 — no plus, no spaces.">
              <TextInput name="whatsappNumber" defaultValue={settings.whatsappNumber} />
            </Field>
            <Field label="Email" name="email">
              <TextInput name="email" type="email" defaultValue={settings.email} />
            </Field>
            <Field label="Business hours" name="businessHours">
              <TextInput name="businessHours" defaultValue={settings.businessHours} />
            </Field>
            <Field label="Response promise" name="responsePromise" className="sm:col-span-2">
              <TextInput name="responsePromise" defaultValue={settings.responsePromise} />
            </Field>
            <Field label="Short response label" name="responseTimeLabel" hint="For the trust bar.">
              <TextInput name="responseTimeLabel" defaultValue={settings.responseTimeLabel} />
            </Field>
            <Field label="Service area label" name="serviceAreaLabel">
              <TextInput name="serviceAreaLabel" defaultValue={settings.serviceAreaLabel} />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Address"
          description={`This must match your Google Business Profile character for character. Currently: ${formatAddress(settings)}`}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Street" name="addressStreet">
              <TextInput name="addressStreet" defaultValue={settings.addressStreet ?? ""} />
            </Field>
            <Field label="Area" name="addressArea">
              <TextInput name="addressArea" defaultValue={settings.addressArea ?? ""} />
            </Field>
            <Field label="Town" name="addressLocality">
              <TextInput name="addressLocality" defaultValue={settings.addressLocality ?? ""} />
            </Field>
            <Field label="County" name="addressRegion">
              <TextInput name="addressRegion" defaultValue={settings.addressRegion ?? ""} />
            </Field>
            <Field label="Country code" name="addressCountry" hint="KE">
              <TextInput name="addressCountry" defaultValue={settings.addressCountry ?? ""} />
            </Field>
          </div>
        </Panel>

        <Panel title="Commercial terms" description="These appear on every quotation and PDF.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="M-Pesa Paybill" name="mpesaPaybill">
              <TextInput name="mpesaPaybill" defaultValue={settings.mpesaPaybill} />
            </Field>
            <Field label="M-Pesa account" name="mpesaAccount">
              <TextInput name="mpesaAccount" defaultValue={settings.mpesaAccount} />
            </Field>
            <Field label="Deposit %" name="depositPercent">
              <NumberInput name="depositPercent" defaultValue={settings.depositPercent} min={0} max={100} />
            </Field>
            <Field label="VAT rate %" name="vatRate">
              <TextInput name="vatRate" defaultValue={settings.vatRate} inputMode="decimal" />
            </Field>
            <Field label="Site survey fee" name="siteSurveyFee" hint="KES, credited to the invoice.">
              <NumberInput name="siteSurveyFee" defaultValue={settings.siteSurveyFee} min={0} />
            </Field>
            <Field label="Quote validity, days" name="quoteValidityDays">
              <NumberInput name="quoteValidityDays" defaultValue={settings.quoteValidityDays} min={1} />
            </Field>
            <Field label="Warranty, months" name="warrantyMonths">
              <NumberInput name="warrantyMonths" defaultValue={settings.warrantyMonths} min={0} />
            </Field>
            <Field label="Cancellation notice, months" name="cancellationNoticeMonths">
              <NumberInput
                name="cancellationNoticeMonths"
                defaultValue={settings.cancellationNoticeMonths}
                min={0}
              />
            </Field>
            <Field
              label="What the survey buys"
              name="siteSurveyDeliverable"
              className="sm:col-span-2 lg:col-span-3"
              hint="Never present it as a bare fee — nine competitors offer a free survey."
            >
              <TextArea name="siteSurveyDeliverable" rows={2} defaultValue={settings.siteSurveyDeliverable} />
            </Field>
          </div>
        </Panel>

        <Panel title="Experience and credentials">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Years operating" name="yearsOperating">
              <NumberInput name="yearsOperating" defaultValue={settings.yearsOperating} min={0} />
            </Field>
            <Field label="Technicians" name="techniciansCount">
              <NumberInput name="techniciansCount" defaultValue={settings.techniciansCount} min={0} />
            </Field>
            <div className="space-y-3 sm:col-span-2">
              <Checkbox
                name="psraRegistered"
                label="PSRA registered"
                defaultChecked={settings.psraRegistered}
                hint="Leave off until it is confirmed. Nothing on the site claims it while this is off."
              />
              <Checkbox
                name="caRadioLicensed"
                label="Communications Authority radio licence held"
                defaultChecked={settings.caRadioLicensed}
                hint="Same — off until the licence is in hand."
              />
            </div>
          </div>
        </Panel>

        <Panel title="Social">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Facebook" name="facebookUrl">
              <TextInput name="facebookUrl" defaultValue={settings.facebookUrl ?? ""} />
            </Field>
            <Field
              label="Google review link"
              name="googleReviewUrl"
              hint="The “write a review” short link from the Mombasa Business Profile. It goes into the review request on every won job, and a request without it is one nobody acts on."
            >
              <TextInput
                name="googleReviewUrl"
                defaultValue={settings.googleReviewUrl ?? ""}
                placeholder="https://g.page/r/…/review"
              />
            </Field>
            <Field label="Instagram" name="instagramUrl">
              <TextInput name="instagramUrl" defaultValue={settings.instagramUrl ?? ""} />
            </Field>
            <Field label="TikTok" name="tiktokUrl">
              <TextInput name="tiktokUrl" defaultValue={settings.tiktokUrl ?? ""} />
            </Field>
            <Field label="YouTube" name="youtubeUrl">
              <TextInput name="youtubeUrl" defaultValue={settings.youtubeUrl ?? ""} />
            </Field>
          </div>
        </Panel>

        <Button type="submit" size="cta">
          Save business details
        </Button>
      </form>
    </>
  );
}
