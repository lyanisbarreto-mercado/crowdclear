-- The initial state is rebuilt from blocked_exit: createState() has no other input, and version pins the rules.
CREATE TABLE IF NOT EXISTS runs (
    id uuid PRIMARY KEY,
    version integer NOT NULL,
    blocked_exit text NOT NULL CHECK (blocked_exit IN ('A', 'B', 'C')),
    commands jsonb NOT NULL,
    result jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
