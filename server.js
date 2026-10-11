const express = require("express");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const sim = require("./public/simulation");
const review = require("./public/review");

const app = express();
const PORT = process.env.PORT || 3000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.locals.db = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
// Neon closes idle connections when its compute suspends; an unhandled pool error would crash the server.
app.locals.db?.on("error", (err) => console.error("Database connection error:", err.message));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/aframe", express.static(path.join(__dirname, "node_modules/aframe/dist")));

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "CrowdClear" });
});

// Replays the submitted commands with the shared simulation. Returns the final state only if every
// command was accepted at its recorded tick, so a stored run always replays exactly.
function replay(blockedExit, commands, hazardTick = null) {
    if (hazardTick !== null && (!Number.isInteger(hazardTick) || hazardTick < 100 || hazardTick > 200)) return null;
    if (!["A", "B", "C"].includes(blockedExit)) return null;
    // Redirects can repeat between exits, so cap the list to bound replay cost.
    if (!Array.isArray(commands) || commands.length > 100 || !commands.every((c) => c && typeof c === "object")) return null;
    const state = sim.createState({ blockedExit: hazardTick === null ? blockedExit : null, hazardTick });
    while (!sim.isDone(state)) sim.step(state, commands);
    const sent = commands.map(({ tick, action, target }) => ({ tick, action, target }));
    return state.blockedExit === blockedExit && JSON.stringify(state.commands) === JSON.stringify(sent) ? state : null;
}

app.use("/api/runs", (req, res, next) => {
    if (req.app.locals.db) return next();
    res.status(503).json({ error: "Saving is not set up on this server." });
});

app.post("/api/runs", async (req, res) => {
    const { id, version, blockedExit, hazardTick = null, commands, result } = req.body ?? {};
    const state = typeof id === "string" && UUID.test(id) && version === sim.VERSION ? replay(blockedExit, commands, hazardTick) : null;
    if (!state) return res.status(400).json({ error: "This is not a valid drill record." });
    const actual = review.result(state);
    if (!Object.keys(actual).every((key) => result?.[key] === actual[key])) {
        return res.status(422).json({ error: "The server's replay did not reproduce this result." });
    }
    // The client picks the id, so a retried save hits the conflict instead of storing a duplicate.
    const values = [id, version, blockedExit, hazardTick, JSON.stringify(state.commands), JSON.stringify(actual)];
    const { rows } = await req.app.locals.db.query(
        "INSERT INTO runs (id, version, blocked_exit, hazard_tick, commands, result) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id",
        values,
    );
    if (rows.length) return res.status(201).json({ id });
    // A separate query sees the winning insert even when the conflicting request was concurrent.
    const existing = await req.app.locals.db.query(
        "SELECT id FROM runs WHERE id = $1 AND version = $2 AND blocked_exit = $3 AND hazard_tick IS NOT DISTINCT FROM $4 AND commands = $5::jsonb AND result = $6::jsonb",
        values,
    );
    if (!existing.rows.length) return res.status(409).json({ error: "This id already belongs to a different drill record." });
    res.json({ id });
});

app.get("/api/runs/:id", async (req, res) => {
    const { rows } = UUID.test(req.params.id)
        ? await req.app.locals.db.query(`SELECT id, version, blocked_exit AS "blockedExit", hazard_tick AS "hazardTick", commands, result FROM runs WHERE id = $1`, [req.params.id])
        : { rows: [] };
    if (!rows.length) return res.status(404).json({ error: "No saved drill matches this link." });
    if (rows[0].hazardTick === null) delete rows[0].hazardTick;
    res.json(rows[0]);
});

// Latest breathing reading from the local Presage helper (sensor/presage.mjs). Biometric, so it stays in memory
// on this machine and is never saved. Reading and posting require the same machine's socket; Render's proxy does not qualify.
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
let breathing = null;
app.use("/api/breathing", (req, res, next) => {
    if (!LOOPBACK.has(req.socket.remoteAddress)) return res.status(403).json({ error: "Readings are only available on this machine." });
    next();
});
app.post("/api/breathing", (req, res) => {
    const { rate = null, confidence = 0, stable = false, hint = "" } = req.body ?? {};
    const valid = (rate === null || (typeof rate === "number" && rate >= 0 && rate <= 80))
        && typeof confidence === "number" && confidence >= 0 && confidence <= 100 && typeof hint === "string" && hint.length <= 200;
    if (!valid) return res.status(400).json({ error: "This is not a breathing reading." });
    breathing = { rate, confidence, stable: !!stable, hint, at: Date.now() };
    res.status(204).end();
});
app.get("/api/breathing", (req, res) => {
    res.json(breathing && Date.now() - breathing.at < 5000 ? { available: true, ...breathing } : { available: false });
});

// Express's default handler sends stack traces outside production; keep database errors server-side.
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: "The server could not complete this request." });
});

if (require.main === module) {
    app.locals.db?.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"))
        .catch((err) => console.error("Database setup failed; saves will report errors:", err.message));
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`CrowdClear running at http://localhost:${PORT}`);
    });
}

module.exports = app;
