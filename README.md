# <img src="doc/img/icon.svg" alt="" width="40" height="40" align="top"> pollen

𓇢𓆸 The world's radio, carried on the wind, scattered as grains. A live granular instrument for
[monome norns](https://monome.org/docs/norns/).

**[Try it in your browser](https://pollen.glassgarden.cc/)**: the real script, on
[norns-web](https://github.com/carlosedp/norns-web).

**[Read the manual](https://github.com/glassgarden/pollen/blob/main/doc/MANUAL.md)** for how to play it, part by part
(also as a [PDF](https://raw.githubusercontent.com/glassgarden/pollen/main/doc/pollen-manual.pdf)).

Pollen grains and radio waves both cross the planet through the sky and land far from where they
started. pollen will tune into live radio stations around the globe, wander from one to the next on
the wind, and catch each one on a reel that it scatters as grains, in the spirit of Make Noise
Morphagene and Endorphin.es Evil Pet. See [doc/DESIGN.md](doc/DESIGN.md) for the idea and
[doc/SPEC.md](doc/SPEC.md) for the plumbing.

> **Version 0.2 (in development).** The radio plays: stations from radio-browser.info, the wind
> carrying you between them, each one caught on the reel and scattered as grains. The globe view
> and the seed vault come next. The engine passes its tests on a real SuperCollider server and the
> radio plays in the browser, but nothing has run on a norns yet.

## Install

From the maiden REPL:

```
;install https://github.com/glassgarden/pollen
```

The radio needs **mpv** and **socat** on the norns. The first time pollen opens without them, a
screen lists them with their sizes and **K3 installs both** (through
[norns-deps](https://github.com/vehka/norns-deps); mpv brings its ffmpeg libraries along); then
pollen starts again with the radio. K2 says "not now": pollen plays the norns input instead, and
**PARAMS > radio > install mpv and socat** offers them again.

**To uninstall them**, use **PARAMS > radio > remove mpv and socat** before deleting pollen: it
removes exactly what pollen installed (a copy that was already there is left alone). The
libraries mpv brought along stay; `sudo apt autoremove` over ssh takes those too (read its list
first). By hand, instead: `sudo apt install -y --no-install-recommends mpv socat`, and `sudo apt
remove mpv socat`. mi-UGens are optional: with them, the reverb is MiVerb, the reverb
from Clouds and Rings; without them, FreeVerb2.

## Controls

| Control      | Does                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| E1           | choose a part: wind, catch, scatter, tint, tone, air                                                                       |
| E2, E3       | that part's two macros (their names and bars show for a moment while you turn them)                                        |
| K3           | its gesture: drift (wind), press the reel (catch), a burst (scatter), backwards (tint), a fade (tone), hold the haze (air) |
| hold K2 + E2 | its variety: the wind (wind), reel length (catch), grain envelope (scatter), scale (tint), media (tone)                    |
| hold K2 + E3 | the heads: how many (catch), how far apart in pitch (tint)                                                                 |
| hold K1      | peek: every part and where its macros are, and the station                                                                 |
| hold K1 + K2 | back to the station before                                                                                                 |

Each part has two macros (E2 on the left, E3 on the right), a gesture (K3) and a variety (hold
K2, turn E2). The small squares along the top right of the screen show which part E1 is on. The bars beside the names show where each macro is.

**wind**: when and where the radio moves to the next station.

- _pace_ (E2): how often it moves on by itself. All the way left (where it starts) it only moves
  when you drift (K3); then every 10, 5, 2 or 1 minutes, or every 30 seconds.
- _reach_ (E3): how far a move goes. Left stays close, a city or two away; right crosses
  oceans and continents.
- K3 _drift_: move on to the next station now.
- variety, _the wind_: a breeze hops off in any direction, a trade wind keeps one
  direction, an eddy wanders, a gust goes anywhere, the far side goes to the other side of the
  world and back.

**catch**: the reel, the loop of tape the radio is recorded onto and the grains are read from.

- _position_ (E2): where on the reel the grains are read. Left is just behind the recording, so you
  hear the station almost live; right reaches back into what was caught seconds ago, and the
  grains come from a wider stretch of it.
- _feedback_ (E3): how much of the grains is recorded back onto the reel with the radio. Left: the
  reel holds only the radio. Right: the grains pile up on themselves into smears and drones.
- K3 _press_: stop recording, so the reel holds what it has and the grains keep playing it (K3
  again releases it).
- variety, _reel length_: 4, 8, 15, 30 or 60 seconds of tape.
- hold K2 + E3, _heads_: how many places on the reel the grains are read from, 1 to 4. The heads
  sit evenly spread along the reel behind the first (which position moves), so you hear the
  station now and seconds ago at once. Each has its bracket under the tape.

**scatter**: the grains themselves.

- _density_ (E2): how many: from one every two seconds to 40 a second, looser in time and wider
  in stereo as there are more.
- _size_ (E3): how long each one is: from 20 ms, a click or a buzz, to 2 s, a long overlapping
  wash.
- K3 _burst_: four times as many for a moment.
- variety, _envelope_: the shape of each grain. Bell is smooth, pluck starts sharp and dies away,
  block is square and clicky.

**tint**: the pitch of the grains.

- _pitch_ (E2): from two octaves down (left) to two up (right); the middle plays them as
  recorded. It snaps to the notes of the scale.
- _spread_ (E3): how much each grain's pitch wanders from that, up to an octave. Past the middle,
  some grains also play backwards.
- K3 _flip_: most grains play backwards (K3 again turns them around).
- variety, _scale_: octaves, fifths, major, minor, chromatic, or free (no snapping).
- hold K2 + E3, _heads apart_: with more than one head, each plays the next note of the scale up
  from the one before it: in unison, or one to four steps of the scale apart (a chord, in major or
  minor). Free counts semitones; nothing goes more than two octaves above the first head.

**tone**: the color of the sound.

- _color_ (E2): one filter knob, like a DJ mixer's. The middle is open. Turn left and a low-pass
  closes, darker and muffled. Turn right and a high-pass opens, thinner. It rings more toward
  either end.
- _drive_ (E3): saturation, from clean to crunchy.
- K3 _fade_: like a shortwave signal fading: for a moment the sound sinks and darkens, then
  comes back.
- variety, _media_: what the sound passes through, after Beads: digital (clean), vintage (a
  lo-fi sampler), clean tape, dirty tape.

**air**: the space around it, and the final mix.

- _space_ (E2): how much of the grains goes to the reverb, and how big the room is.
- _mix_ (E3): left is the radio alone, as it plays; right is the grains alone; between them, both.
- K3 _haze_: hold the reverb's tail so it hangs on (K3 again lets it go).

**The wind** picks the next station: a _breeze_ hops off in any direction, a _trade wind_
carries on along one bearing, an _eddy_ wanders, a _gust_ goes anywhere, the _far side_ jumps to
the other side of the world and back. While the next station loads, the last one keeps playing. Once it's really playing, the two
crossfade over one pass of the reel, so the head writes the new station over the old a little
more each moment and the grains travel from one place to the other. (In PARAMS, _handover_ can
instead press the reel while tuning and crossfade quickly, and _static while tuning_ adds some
hiss.) A station that doesn't play in time is skipped. Its name and place show as you arrive (and on a K1 peek).

The screen has two halves. On the left, the globe: every station is a dot, the one playing is at
the middle sending out radio waves as loud as it is, the wind's last moves are its trail, and
while tuning the station being tried blinks at the end of a dotted path. On the right, the reel
laid flat like tape: the waveform of what it caught, with the write head sweeping it (the newest
sound brightest behind it; what isn't caught yet is a dotted line). The bracket under the tape is
where the grains are read from (position). The grains leave the tape from there, up when they play
forwards and down when backwards, faster the higher they're pitched; silence throws none. Pressed,
the head stops and the whole tape holds evenly lit. The haze over it is the reverb. Picking a part or turning its knobs lights its piece of the picture for a moment (wind the
globe, with a ring as far as a move can reach; catch the tape; scatter and tint the grains, tint
with its scale as ticks beside the tape; tone the waveform; air the haze) and dims the rest. A
wind with a pace drifts faint streaks over the globe, and the mix leans the brightness from the
station's waves to the grains. Every
macro, variety and gesture is also in PARAMS, so it saves with PSETs and can be MIDI-mapped.
pollen picks up where it left off: the settings are kept on the way out (`last.pset` in its data
folder, apart from the numbered PSETs) and read at the next start.

## How it's built

```
pollen.lua               the script: parts, params, controls, the picture
lib/sound.lua            every macro -> engine parameter mapping (where the sound is tuned)
lib/view.lua             the screen: the globe and the stations, the tape and the grains
lib/radio.lua            the radio: tuning a station (press, static, load, crossfade, release)
lib/stations.lua         the stations, from radio-browser.info, cached on the norns
lib/needs.lua            mpv and socat: the install and remove screens (lib/deps/: norns-deps, vendored)
lib/player.lua           two mpv players, over JACK into the engine, driven through socat
lib/walker.lua           the wind: where to go next (great circles, nearest, antipodes)
lib/json.lua             JSON, decode and encode
lib/Engine_Pollen.sc     the engine: writer -> reel -> grains -> filter, drive, media, reverb, limiter
lib/Engine_Pollen.js     the same engine for the browser (norns ignores it)
lib/Engine_Pollen/       MiVerb as WebAssembly (from norns-mi-UGens), and sky.js, the page's field and sky
tools/norns-web/         the script in a browser (a git subtree of carlosedp/norns-web)
test/                    the Lua smoke test, the browser engine's offline render, the engine on scsynth
docs/                    SPEC.md (the plumbing) and DESIGN.md (the idea and the decisions)
```

## Development

`make` lists the tasks:

```
make web       # the script in a browser, reloading on save: http://localhost:8800/
make test      # the Lua smoke test and the browser engine's offline render
make test-sc   # the SuperCollider engine on a real scsynth, in a container (podman or docker)
make deploy    # copy to a norns over ssh (NORNS=we@<ip> if norns.local doesn't resolve)
```

`tools/norns-web` is a git subtree: `make norns-web-pull` updates it, `make norns-web-push
BRANCH=...` sends changes back.

## License and credits

pollen is made by [glassgarden.](https://glassgarden.cc). © 2026 glassgarden. / Voltage Foundry Modular.

- **The code** is free software under the GNU GPL v3.0 (see [LICENSE](LICENSE)).
- **Ideas from** Émilie Gillet's Mutable Instruments Clouds and Beads (their code is MIT): the
  media stage follows Beads' four. Inspired by Make Noise Morphagene and Endorphin.es Evil Pet.
- **The reverb**, when installed, is MiVerb from Volker Böhm's
  [mi-UGens](https://github.com/v7b1/mi-UGens) (GPL-3.0); the browser carries it as WebAssembly,
  built by [norns-mi-UGens](https://github.com/glassgarden/norns-mi-UGens) (`lib/Engine_Pollen/BUILDINFO`).
- [wasmoon](https://github.com/ceifa/wasmoon) (MIT) is vendored in `tools/norns-web`.
- [norns-deps](https://github.com/vehka/norns-deps) (MIT, by vehka) is vendored in `lib/deps.lua`
  and `lib/deps/`; it installs and removes mpv and socat.
- **The stations** come from [radio-browser.info](https://www.radio-browser.info), a community
  database; pollen fetches its list at most once a week and identifies itself when it does. The
  streams are the stations' own; pollen plays them live and never redistributes them.
- Mutable Instruments, Make Noise, Endorphin.es, monome, norns and Radio Garden are trademarks of
  their owners, named only to say what pollen works with or was inspired by. No affiliation or
  endorsement is implied.

## To do on hardware

- [ ] the install screen: mpv and socat from a fresh norns (how big mpv really is with
      `--no-install-recommends`, for its `size` in `lib/needs.lua`), then remove them again

- [ ] the engine loads and sounds; CPU on a CM3 with the densest grains and the radio playing
- [ ] mpv into SuperCollider over JACK: `jack_lsp -c` while a station plays should show
      `pollen_a:out_0 -> SuperCollider:in_1` (`P.JACK_TO` in `lib/player.lua` if the names differ)
- [ ] mpv's CPU with two players, and how long a station takes to start
- [ ] the first fetch and parse of the stations on a norns (about 2 MB of JSON)
- [ ] tune the macros by ear (`lib/sound.lua`)
