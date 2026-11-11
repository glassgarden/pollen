// The norns screen's pictures for the manual and the page's "What's inside" (doc/img), from the
// real script in norns-web: it plays a live station, and the script is driven through the REPL
// with its own enc() and key(), as the controls would. Each shot is the 128x64 screen, 4 times
// over in whole pixels, in the white screen color.
//
//   make manual-shots     (npm install in tools/manual first; needs a Chromium, as pdf.mjs;
//                          and the network: the stations are live, so every run differs)
//
// Text on the screen is drawn by norns-web's stand-in for the norns font: the shots with words
// (a part's name, the knobs' names, the station) are close, not exact. Retake them on a norns
// if they need to be exact (maiden: screen.export_png("/home/we/dust/data/pollen/x.png")).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const imgDir = path.join(root, "doc/img");

function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const cache = path.join(os.homedir(), ".cache/ms-playwright");
  const builds = fs.existsSync(cache) ? fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort() : [];
  for (const b of builds.reverse()) {
    const exe = path.join(cache, b, "chrome-linux/chrome");
    if (fs.existsSync(exe)) return exe;
  }
  throw new Error("no Chromium found: set CHROMIUM=/path/to/chrome (or: npx playwright install chromium)");
}

const freePort = () => new Promise((ok) => {
  const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); });
});

// a lively picture to start from: grains enough to see, two heads, some space
const BASE = { scatter_density: 0.55, scatter_size: 0.35, tint_spread: 0.45, catch_position: 0.35,
  air_space: 0.45, catch_heads: 2 };
// the parts, in E1's order, and what each shot sets first (so its picture shows what it does)
const PARTS = [
  { name: "wind", set: {} },
  { name: "catch", set: { catch_heads: 3, catch_position: 0.55 } },
  { name: "scatter", set: { scatter_density: 0.8, scatter_size: 0.25 } },
  { name: "tint", set: { tint_spread: 0.75, tint_pitch: 0.7 } },
  { name: "tone", set: { tone_color: 0.3, tone_drive: 0.4 } },
  { name: "air", set: { air_space: 0.8 } },
];

const port = await freePort();
const server = spawn("node", [path.join(root, "tools/norns-web/serve.mjs"), root, String(port)], { stdio: "ignore" });
const browser = await chromium.launch({ executablePath: findChromium(), args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  await new Promise(r => setTimeout(r, 800));
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://localhost:${port}/?screen=white`);
  await page.waitForFunction(() => document.querySelector("#oled")
    .getContext("2d").getImageData(0, 0, 128, 64).data.some((v, i) => i % 4 === 0 && v > 0), null, { timeout: 30000 });
  const lua = (code) => page.evaluate((c) => {
    document.querySelector("#repl").value = c;
    document.querySelector("#repl-form").requestSubmit();
  }, code);
  const set = (t) => lua(Object.entries(t).map(([k, v]) => `params:set("${k}", ${v})`).join(" "));
  // the screen, 4 times over, in whole pixels
  const shot = async (name) => {
    const png = await page.evaluate(() => {
      const src = document.querySelector("#oled"), out = document.createElement("canvas");
      out.width = 512; out.height = 256;
      const g = out.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.drawImage(src, 0, 0, 512, 256);
      return out.toDataURL("image/png").split(",")[1];
    });
    fs.writeFileSync(path.join(imgDir, `${name}.png`), Buffer.from(png, "base64"));
    console.log(`doc/img/${name}.png`);
  };
  const wait = (s) => page.waitForTimeout(s * 1000);

  await set(BASE);
  await page.click("#sound"); // the radio plays once the page's sound is on
  console.log("waiting for a station to play...");
  await page.waitForFunction(() => /pollen: .+ \(.+\), https?:\/\//.test(document.querySelector("#log").textContent),
    null, { timeout: 120000 });
  await wait(1.5);
  await shot("arrive"); // its name and place, as you arrive
  await wait(14); // the name gone, the reel filling
  await shot("hero");

  for (const [i, P] of PARTS.entries()) {
    await set(P.set);
    await wait(3);
    // pick the part with E1, then nudge both knobs and back, so their names and bars show
    await lua(`enc(1, -9) enc(1, ${i}) enc(2, 1) enc(2, -1) enc(3, 1) enc(3, -1)`);
    await wait(0.4);
    await shot(P.name);
    await set(BASE);
  }

  // hold K1: the peek
  await lua("key(1, 1)");
  await wait(0.5);
  await shot("peek");
  await lua("key(1, 0)");
  await wait(1);
  // hold K2 + E2: a variety (the wind's kind) shows its name
  await lua("enc(1, -9) key(2, 1) enc(2, 1)");
  await wait(0.4);
  await shot("variety");
  await lua("enc(2, -1) key(2, 0)");
} finally {
  await browser.close();
  server.kill();
}
