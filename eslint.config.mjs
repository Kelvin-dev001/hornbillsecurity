import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * The service-role guard.
 *
 * CLAUDE.md §2.3: cost_price must never reach the browser. The service-role
 * Supabase client bypasses RLS, so it is the one import that could make that
 * happen by accident. Three layers stop it:
 *
 *   1. lib/supabase/admin.ts starts with `import "server-only"`, which turns a
 *      client-bundle import into a BUILD ERROR.
 *   2. The rule below fails lint for any import of it outside the allow-list.
 *   3. SUPABASE_SERVICE_ROLE_KEY may only be read inside that module.
 */
const ADMIN_CLIENT_MESSAGE =
  "lib/supabase/admin.ts uses the Supabase service-role key and bypasses RLS. " +
  "It may only be imported from app/api/**, app/admin/** or db/**. " +
  "Public pages use lib/supabase/server.ts with an explicit select list. See CLAUDE.md §2.3.";

const SERVICE_ROLE_ENV_MESSAGE =
  "SUPABASE_SERVICE_ROLE_KEY may only be read in lib/supabase/admin.ts. " +
  "Everything else uses the anon key under RLS. See CLAUDE.md §2.3.";

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "db/migrations/**"],
  },

  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin", "**/lib/supabase/admin", "**/supabase/admin"],
              message: ADMIN_CLIENT_MESSAGE,
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name='SUPABASE_SERVICE_ROLE_KEY']",
          message: SERVICE_ROLE_ENV_MESSAGE,
        },
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name=/^NEXT_PUBLIC_SUPABASE_SERVICE/]",
          message:
            "The service-role key must never carry a NEXT_PUBLIC_ prefix — that inlines it into the browser bundle.",
        },
      ],
      // Unused vars are an error, except deliberate `_`-prefixed discards.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Import allow-list: the module itself, route handlers, the admin portal and
  // the migration/seed scripts, none of which ship to the browser.
  {
    files: [
      "lib/supabase/admin.ts",
      "app/api/**/*.{ts,tsx}",
      "app/admin/**/*.{ts,tsx}",
      "db/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // The service-role key itself is read in exactly one file. Route handlers and
  // the admin portal may import the client, but they may not reach for the key.
  {
    files: ["lib/supabase/admin.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];

export default eslintConfig;
