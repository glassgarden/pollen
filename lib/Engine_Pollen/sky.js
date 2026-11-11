// pollen's scene behind the device on the web page (norns-web's NornsWeb.sky; a norns never
// loads it): a field of grain at the hour it is where the station plays, pollen drifting over it
// on the wind, and a radio mast on the horizon.
//
// Live: the grains blow as fast as the wind's pace and as unsteadily as its reach; a new station
// is a gust (the field bends, the grains lift, the mast sends out rings), and the sky turns to
// the station's local hour (its sun time, from its longitude in the script's station cache).
// The grains glow brighter with what the reel is catching.
//
// Drawn in chunky pixels (one is 4 CSS pixels); the sky behind is painted once into its own
// canvas and again only when the hour moves, so a frame is one picture, the grains and the field.
(() => {
  const NW = window.NornsWeb;
  if (!NW) return;

  // the sky at the hours of a day: top, high, low, horizon (kept dark up high at every hour, so the
  // page's light text over it stays readable)
  const NIGHT = ["#0d0c1f", "#141331", "#1e1b3f", "#2b2450"];
  const DAWN = ["#1b1a3d", "#382b5b", "#86496b", "#ef9f5c"];
  const DAY = ["#1c2a50", "#283f6b", "#7d9fba", "#f1d89c"];
  const DUSK = ["#1d1b3a", "#3b2a55", "#8c4a5e", "#e8a052"];
  const HOURS = [[0, NIGHT], [4.5, NIGHT], [6.5, DAWN], [9, DAY], [16, DAY], [18.8, DUSK], [21, NIGHT], [24, NIGHT]];
  const STOPS = [0, 0.45, 0.78, 1];
  // how much light there is (0 night, 1 day) at those hours
  const LIGHT = [[0, 0], [4.5, 0], [6.5, 0.55], [9, 1], [16, 1], [18.8, 0.6], [21, 0], [24, 0]];

  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
  const css = (c, a = 1) => `rgba(${c.map((v) => Math.round(v)).join(",")},${a.toFixed(3)})`;
  const PAL = HOURS.map(([h, p]) => [h, p.map(rgb)]);
  function at(table, h, lerp) {
    for (let i = 1; i < table.length; i++)
      if (h <= table[i][0]) {
        const [h0, a] = table[i - 1], [h1, b] = table[i];
        return lerp(a, b, (h - h0) / (h1 - h0 || 1));
      }
    return table[table.length - 1][1];
  }
  const skyAt = (h) => at(PAL, h, (a, b, f) => a.map((c, i) => mix(c, b[i], f)));
  const lightAt = (h) => at(LIGHT, h, (a, b, f) => a + (b - a) * f);

  // seeded, so the field and the stars are the same on every visit
  const rand = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---- what's going on: the wind, the hour, the sound ----
  const live = {
    wind: 0.15, reach: 0.3, // smoothed from the params
    gust: 0,                // 1 at a new station, dying away
    hour: 19.3, target: 19.3, // shown and aimed-at hour (dusk until a station is known)
    lon: null,
    rings: [],              // the mast's rings, by start time
    last: 0,
  };
  const param = (id, dflt) => { const v = NW.param && NW.param(id); return typeof v === "number" ? v : dflt; };

  // where a station is, from the script's cache (lib/stations.lua writes one station a line)
  let places = null, placesRead = 0;
  function lonOf(url) {
    if (!places || (!places.has(url) && performance.now() - placesRead > 5000)) {
      placesRead = performance.now();
      const src = NW.readFile && NW.data && NW.readFile(NW.data + "stations_radiobrowser.lua");
      if (src) {
        places = new Map();
        const re = /lon=(-?[\d.]+),url="((?:[^"\\]|\\.)*)"/g;
        for (let m; (m = re.exec(src));) places.set(m[2].replace(/\\(.)/g, "$1"), +m[1]);
      }
    }
    return places && places.has(url) ? places.get(url) : null;
  }
  // the sun's hour at a longitude, now
  function sunHour(lon) {
    const d = new Date();
    const utc = d.getUTCHours() + d.getUTCMinutes() / 60;
    return (((utc + lon / 15) % 24) + 24) % 24;
  }

  // ---- one canvas's scene: its sky picture, field, stars and grains ----
  function build(view) {
    const { cols, rows, ground } = view;
    const r = rand(11);
    view.bg = view.bg || document.createElement("canvas");
    view.bg.width = cols; view.bg.height = rows;
    view.bgHour = null;
    // the field: a stalk every column or two, each its own height and color
    view.stalks = [];
    for (let x = 0; x < cols; x += 1 + (r() < 0.45 ? 1 : 0))
      view.stalks.push({ x, h: 2 + Math.floor(r() * 4) + (r() < 0.15 ? 2 : 0), tone: r(), ph: r() * 6.28 });
    view.stars = [];
    for (let i = 0; i < (cols * ground) / 300; i++)
      view.stars.push({ x: Math.floor(r() * cols), y: Math.floor(r() * ground * 0.7), l: 0.25 + r() * 0.6, tw: 0.4 + r() * 1.4, ph: r() * 6.28 });
    view.grains = [];
    for (let i = 0; i < (cols * ground) / 260; i++)
      view.grains.push({ x: r() * cols, y: r() * (ground - 3), z: r(), ph: r() * 6.28, f: 0.3 + r() * 0.9 });
    // the mast: left of the device on a wide page, on the horizon
    view.mast = { x: Math.round(cols * 0.14), h: Math.max(10, Math.min(22, Math.round(ground * 0.16))) };
  }

  // the sky, the sun or moon and the earth below the field, into the view's own picture
  function paintBg(view, h) {
    const { cols, rows, ground, bg } = view;
    const g = bg.getContext("2d");
    const pal = skyAt(h);
    for (let y = 0; y < Math.min(rows, ground); y++) {
      const v = y / Math.max(1, ground - 1);
      let i = 1;
      while (i < STOPS.length - 1 && v > STOPS[i]) i++;
      const f = (v - STOPS[i - 1]) / (STOPS[i] - STOPS[i - 1]);
      g.fillStyle = css(mix(pal[i - 1], pal[i], Math.min(1, Math.max(0, f))));
      g.fillRect(0, y, cols, 1);
    }
    // the sun by day, the moon by night, low over the horizon along one arc
    const day = h >= 5.5 && h <= 19.5;
    const p = day ? (h - 5.5) / 14 : (((h + 24 - 19.5) % 24) / 10);
    if (p >= 0 && p <= 1) {
      const x = Math.round(cols * (0.1 + 0.8 * p)), y = Math.round(ground - 3 - Math.sin(Math.PI * p) * ground * 0.32);
      const rad = day ? 3 : 2;
      g.fillStyle = day ? css(mix(rgb("#ffb35c"), rgb("#fff2c8"), Math.sin(Math.PI * p)), 0.95) : css(rgb("#e9e3cf"), 0.9);
      for (let dy = -rad; dy <= rad; dy++)
        for (let dx = -rad; dx <= rad; dx++)
          if (dx * dx + dy * dy <= rad * rad + 1 && y + dy < ground) g.fillRect(x + dx, y + dy, 1, 1);
      if (!day) { // a crescent: the night takes a bite out of it
        g.fillStyle = css(mix(pal[0], pal[1], (y / ground) / 0.45 > 1 ? 1 : (y / ground) / 0.45));
        for (let dy = -rad; dy <= rad; dy++)
          for (let dx = -rad; dx <= rad; dx++)
            if ((dx - 1) * (dx - 1) + dy * dy <= rad * rad - 1) g.fillRect(x + dx + 1, y + dy - 1, 1, 1);
      }
    }
    // the earth: dark and warm, with furrows
    const light = lightAt(h);
    for (let y = ground; y < rows; y++) {
      const v = (y - ground) / Math.max(1, rows - ground);
      g.fillStyle = css(mix(mix(rgb("#2b2016"), rgb("#3a2b1b"), light * 0.5), rgb("#120d0a"), Math.min(1, v * 1.4)));
      g.fillRect(0, y, cols, 1);
    }
    const r = rand(5);
    g.fillStyle = css(mix(rgb("#3e2f1f"), rgb("#5a4429"), light), 0.8);
    for (let y = ground + 3; y < Math.min(rows, ground + 12); y += 3)
      for (let x = Math.floor(r() * 20) - 10; x < cols; x += 18 + Math.floor(r() * 26))
        g.fillRect(x, y, 6 + Math.floor(r() * 14), 1);
    view.bgHour = h;
  }

  // the mast: a lattice tower, guyed, with a light on top that blinks
  function mast(g, view, t, h) {
    const { x, h: mh } = view.mast, base = view.ground;
    const light = lightAt(h);
    g.fillStyle = css(mix(rgb("#120f20"), rgb("#3a3048"), light * 0.6));
    for (let y = 0; y < mh; y++) {
      const w = y > mh * 0.6 ? 1 : 0; // a little wider near the ground
      g.fillRect(x - w, base - 1 - y, 1 + 2 * w, 1);
      if (y % 3 === 0 && y > 1) g.fillRect(x - 1, base - 1 - y, 3, 1); // cross-bars
    }
    // guy wires, as dots
    for (let i = 2; i < mh * 0.8; i += 2) {
      g.fillRect(x - Math.round(i * 0.6) - 1, base - 1 - mh + i + Math.round(mh * 0.2), 1, 1);
      g.fillRect(x + Math.round(i * 0.6) + 1, base - 1 - mh + i + Math.round(mh * 0.2), 1, 1);
    }
    const on = view.still || Math.floor(t / 900) % 2 === 0;
    if (on) { g.fillStyle = "rgba(255,72,60,0.95)"; g.fillRect(x, base - 1 - mh, 1, 1); }
    // the rings a station's arrival sends out
    for (const r0 of live.rings) {
      const age = (t - r0) / 2600;
      if (age < 0 || age > 1) continue;
      const rad = 2 + age * Math.min(60, view.cols * 0.3), a = (1 - age) * 0.55;
      g.fillStyle = css(rgb("#f2c14e"), a);
      const n = Math.ceil(rad * 4);
      for (let k = 0; k <= n; k++) {
        const ang = Math.PI * (k / n); // the upper half: the waves go up and out
        const px = Math.round(x + Math.cos(ang) * rad), py = Math.round(base - 1 - mh - Math.sin(ang) * rad * 0.8);
        if (py < base - 1) g.fillRect(px, py, 1, 1);
      }
    }
  }

  function step(t) {
    const dt = Math.min(0.25, live.last ? (t - live.last) / 1000 : 0);
    live.last = t;
    // the params, eased so a turned knob changes the wind smoothly
    const pace = param("wind_pace", 0), reach = param("wind_reach", 0.3);
    live.wind += (pace - live.wind) * Math.min(1, dt * 1.5);
    live.reach += (reach - live.reach) * Math.min(1, dt * 1.5);
    live.gust *= Math.exp(-dt / 1.6);
    // the hour follows the station's sun (and the clock, while it stays)
    if (live.lon !== null) live.target = sunHour(live.lon);
    let d = live.target - live.hour;
    if (d > 12) d -= 24; else if (d < -12) d += 24;
    live.hour = (live.hour + d * Math.min(1, dt / 2.2) + 24) % 24;
    live.rings = live.rings.filter((r0) => t - r0 < 2600);
    return dt;
  }

  let lastStep = -1, dtNow = 0;
  NW.sky = {
    fps: 15,
    layout(view) {
      if (!view.cols || !view.rows) return;
      build(view);
      paintBg(view, live.hour); // norns-web draws a frame right after (the only one, with reduced motion)
    },
    draw(g, t, view) {
      if (!view.cols) return;
      view.ctx = g;
      if (t !== lastStep) { dtNow = step(t); lastStep = t; } // once a frame, whichever sky draws
      const dt = dtNow, h = live.hour, { cols, rows, ground } = view;
      if (view.bgHour === null || Math.abs(view.bgHour - h) > 0.04) paintBg(view, h);
      g.clearRect(0, 0, cols, rows);
      g.drawImage(view.bg, 0, 0);
      const light = lightAt(h), still = view.still;
      // stars, at night
      if (light < 0.9)
        for (const s of view.stars) {
          const a = s.l * (1 - light) * (still ? 1 : 0.6 + 0.4 * Math.sin((t / 1000) * s.tw + s.ph));
          g.fillStyle = `rgba(232,226,214,${a.toFixed(2)})`;
          g.fillRect(s.x, s.y, 1, 1);
        }
      mast(g, view, t, h);
      // the field, bending with the wind (and over, in a gust)
      const sway = 0.3 + live.wind * 1.2 + live.gust * 2.2;
      const stalkC = mix(rgb("#4a3a1c"), rgb("#9a7a34"), 0.25 + light * 0.75);
      const earC = mix(rgb("#7a5f2a"), rgb("#e2c062"), 0.2 + light * 0.8);
      const rim = skyAt(h)[3];
      for (const s of view.stalks) {
        const off = still ? 0 : Math.round(Math.sin((t / 1000) * (0.8 + live.wind * 2.5) + s.x * 0.18 + s.ph * 0.3) * sway * 0.6 + sway * 0.5);
        g.fillStyle = css(mix(stalkC, rgb("#2a2012"), s.tone * 0.35));
        g.fillRect(s.x, ground - s.h + 1, 1, s.h - 1);
        g.fillStyle = css(mix(mix(earC, rim, 0.25), rgb("#5a4420"), s.tone * 0.3));
        g.fillRect(s.x + off, ground - s.h - 1, 1, 2);
      }
      g.fillStyle = css(mix(rgb("#5a4523"), rgb("#b8913f"), light), 1);
      g.fillRect(0, ground, cols, 1);
      // the pollen: drifting with the wind, bobbing with its reach, glowing with what's caught
      const lvl = (NW.pollen && NW.pollen.poll("amp_reel")) || 0;
      const glow = Math.min(1, 0.55 + lvl * 1.6);
      const speed = (1.5 + live.wind * 16) * (1 + live.gust * 3.5);
      const bob = 0.5 + live.reach * 3;
      const pc = mix(rgb("#f5d76e"), rgb("#fff4c2"), lvl > 0.3 ? 0.6 : 0.2);
      for (const p of view.grains) {
        if (!still) {
          p.x += speed * (0.35 + 0.65 * p.z) * dt;
          p.y += (Math.sin((t / 1000) * p.f + p.ph) * bob - live.gust * 5 * p.z) * dt;
          if (p.x >= cols) { p.x -= cols; p.y = Math.random() * (ground - 3); }
          if (p.y < 0) p.y += ground - 3; else if (p.y > ground - 3) p.y -= ground - 3;
        }
        g.fillStyle = css(pc, (0.2 + 0.55 * p.z) * glow);
        g.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
      }
    },
    // the stand-in, on a loadfile: a new station on its way
    tune(url) {
      live.gust = 1;
      live.rings.push(performance.now(), performance.now() + 450, performance.now() + 900);
      const lon = lonOf(String(url));
      if (lon !== null) live.lon = lon;
    },
  };
})();
