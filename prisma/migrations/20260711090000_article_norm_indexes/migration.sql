-- Normalisierte Ausdrucks-Indizes (Großschreibung, ohne Whitespace) für
-- format-/leerzeichenunabhängige Teilenummer-Suche.
CREATE INDEX IF NOT EXISTS "Article_partNumber_norm_idx"
  ON "Article" (upper(regexp_replace("partNumber", '\s', '', 'g')));
CREATE INDEX IF NOT EXISTS "Article_partNumberFmt_norm_idx"
  ON "Article" (upper(regexp_replace("partNumberFmt", '\s', '', 'g')));
