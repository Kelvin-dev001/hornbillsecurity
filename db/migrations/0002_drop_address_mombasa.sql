-- Superseded by the address components added in 0001. Run the seed after this
-- (`npm run db:seed`) so the row carries the structured address.
ALTER TABLE "site_settings" DROP COLUMN "address_mombasa";
