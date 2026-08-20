-- Apply once to an existing My1RM D1 database whose records table predates
-- session-scoped ranking deduplication. Fresh databases use schema.sql instead.
-- Precondition: run PRAGMA table_info(records) and continue only when
-- session_id is absent; SQLite cannot make ADD COLUMN idempotent.
ALTER TABLE records
  ADD COLUMN session_id TEXT CHECK (length(session_id) BETWEEN 20 AND 80);

CREATE UNIQUE INDEX IF NOT EXISTS idx_records_session
  ON records (session_id)
  WHERE session_id IS NOT NULL;
