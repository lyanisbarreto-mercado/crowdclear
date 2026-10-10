-- Initial state is not stored: createState() takes no seed, and version pins the simulation rules.
CREATE TABLE IF NOT EXISTS runs (
    id uuid PRIMARY KEY,
    version integer NOT NULL,
    commands jsonb NOT NULL,
    result jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
