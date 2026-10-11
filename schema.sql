-- Rebuild scenarios from blocked_exit and hazard_tick; version pins simulation rules.
CREATE TABLE IF NOT EXISTS runs (
    id uuid PRIMARY KEY,
    version integer NOT NULL,
    blocked_exit text NOT NULL CHECK (blocked_exit IN ('A', 'B', 'C')),
    commands jsonb NOT NULL,
    result jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Preserve existing saved rows; timed incidents add their schedule alongside the exit.
ALTER TABLE runs ADD COLUMN IF NOT EXISTS hazard_tick integer CHECK (hazard_tick BETWEEN 100 AND 200);

ALTER TABLE runs ADD COLUMN IF NOT EXISTS incident_count integer NOT NULL DEFAULT 1 CHECK (incident_count BETWEEN 1 AND 3);
