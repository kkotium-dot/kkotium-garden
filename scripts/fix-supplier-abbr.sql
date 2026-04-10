-- Sprint B 3-1: Backfill supplier abbr values
-- Run via: psql $DATABASE_URL -f scripts/fix-supplier-abbr.sql
-- OR via Supabase SQL Editor

-- Step 1: Show current state (preview)
SELECT id, name, code, abbr, "platformCode"
FROM suppliers
WHERE abbr IS NULL OR abbr = ''
ORDER BY "platformCode", name;

-- Step 2: Generate abbr from code (takes first 3 uppercase alphanum chars of code)
-- E.g. "DMM-HV" -> "HV", "HIVIEW" -> "HIV", "FLOWERS" -> "FLO"
UPDATE suppliers
SET abbr = UPPER(SUBSTRING(REGEXP_REPLACE(code, '^[A-Z]+-', '', 'g'), 1, 4))
WHERE abbr IS NULL OR abbr = '';

-- Step 3: Handle any remaining nulls with fallback from name
UPDATE suppliers
SET abbr = UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'), 1, 4))
WHERE abbr IS NULL OR abbr = '';

-- Step 4: Handle duplicate abbr collisions by appending number
-- (run manually if Step 3 creates duplicates)
-- SELECT abbr, COUNT(*) FROM suppliers GROUP BY abbr HAVING COUNT(*) > 1;

-- Step 5: Verify result
SELECT id, name, code, abbr, "platformCode", active
FROM suppliers
ORDER BY "platformCode", name;
