"use client";

/**
 * The last resort: an error in the root layout itself.
 *
 * app/error.tsx renders inside the layout, so it cannot help when the layout is
 * what failed — and the root layout calls getSiteSettings(), which means a
 * database outage lands here rather than there.
 *
 * So this renders its own `<html>` and `<body>`, uses no component from the rest
 * of the codebase, and carries no import that could itself fail. Styling is
 * inline for the same reason: if the stylesheet did not load, a class name is
 * worth nothing.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en-KE">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#faf8f6",
          color: "#0f0f12",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.8125rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#c64200",
            }}
          >
            Hornbill Smart Security Services
          </p>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.875rem", lineHeight: 1.2 }}>
            The site is having a problem
          </h1>
          <p style={{ marginTop: "1rem", fontSize: "1.0625rem", color: "#6b6660" }}>
            We are almost certainly fixing it. In the meantime everything we do is a phone call
            away — prices, a quotation, a survey.
          </p>

          {/* Ink on brand orange: 5.88:1. Never white on this colour — CLAUDE.md §2.8. */}
          <p style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <a
              href="https://wa.me/254759293030"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.25rem",
                borderRadius: "0.625rem",
                background: "#f85a00",
                color: "#0f0f12",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              WhatsApp 0759 293 030
            </a>
            <a
              href="tel:+254759293030"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.25rem",
                borderRadius: "0.625rem",
                border: "1px solid #918a82",
                color: "#0f0f12",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Call 0759 293 030
            </a>
          </p>

          <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "#6b6660" }}>
            Mon–Sat 8am–6pm · security@hornbilltech.co.ke
          </p>

          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#6b6660" }}>
              Reference: <code>{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
