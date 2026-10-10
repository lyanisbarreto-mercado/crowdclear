const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/aframe", express.static(path.join(__dirname, "node_modules/aframe/dist")));

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "CrowdClear" });
});

if (require.main === module) {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`CrowdClear running at http://localhost:${PORT}`);
    });
}

module.exports = app;