const { test, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const app = require("../server");

let server;
let base;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://localhost:${server.address().port}`;
});

after(() => {
    server.close();
    // fetch keeps sockets alive; without this the run hangs ~30s before exiting
    server.closeAllConnections();
});

test("health endpoint answers ok", async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok", app: "CrowdClear" });
});

test("index serves the scene and every local script and stylesheet it references", async () => {
    const res = await fetch(base);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /<a-scene/);

    const assets = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(assets.includes("/game.js"), "index.html should load /game.js");
    for (const asset of assets) {
        const assetRes = await fetch(base + asset);
        assert.equal(assetRes.status, 200, `${asset} should be served`);
    }
});

test("browser scripts have no syntax errors", () => {
    const dir = path.join(__dirname, "..", "public");
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
        // Compiles without running, so DOM globals aren't needed
        new vm.Script(fs.readFileSync(path.join(dir, file), "utf8"), { filename: file });
    }
});
