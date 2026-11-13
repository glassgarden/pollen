-- What pollen can install on the norns, through norns-deps (lib/deps.lua and lib/deps/, vendored
-- from github.com/vehka/norns-deps, MIT). Its screen lists what's missing and how big it is, K3
-- installs it, and a manifest in pollen's data folder keeps what it installed, so removing takes
-- away only that: never a copy that was there before pollen.
--
-- The radio needs mpv (it plays the stations) and socat (it carries pollen's commands to mpv), from
-- apt through sudo:
--
--   N.missing()       { "mpv", "socat" } or fewer: what isn't installed
--   N.install(done)   the install screen; done(true) once something was installed
--   N.installed()     did pollen install either (that's still there)?
--   N.remove(done)    the remove screen for the mpv and socat pollen installed; done(ok)
--
-- mi-UGens are optional: with them the reverb is MiVerb, without them FreeVerb2. Offered only from
-- PARAMS, never at launch. The install downloads a pinned norns build (checked against its
-- sha256) and runs the install.sh inside it, which moves older mi-UGens installs aside;
-- SuperCollider has to restart to load them, which norns-deps' screen offers. terrarium and
-- fx_miUGens install the same build the same way:
--
--   N.mi_ok()         MiVerb is in Extensions (whoever put it there)
--   N.mi_install(done), N.mi_installed(), N.mi_remove(done): as above, for mi-UGens
--
-- norns-deps asks the system about itself as it loads (the machine, apt, sudo), so it's loaded only
-- when a screen opens: never in the browser, where the engine's stand-in answers for all of it.

local N = {}

N.DIR = _path.data .. "pollen/deps"
N.platform = nil -- the smoke test sets a pretend norns here, so nothing asks the real machine

local PROGRAMS = { "mpv", "socat" }
local function has(prog) return util.os_capture("command -v " .. prog) ~= "" end

local MI = "mi-UGens"
local MI_VERSION = "v1.2.0"
local MI_FILE = "mi-UGens-norns-" .. MI_VERSION .. ".tar.gz"
local MI_URL = "https://github.com/glassgarden/mi-UGens/releases/download/" .. MI_VERSION .. "/" .. MI_FILE
local MI_SHA256 = "f997afea8a38f1f43f2a86c639c6c1a8f841591e31ce3cf698f1bf97e44864b4"
local EXT = "/home/we/.local/share/SuperCollider/Extensions"

local function q(s) return "'" .. s:gsub("'", "'\\''") .. "'" end

function N.missing()
  local out = {}
  for _, p in ipairs(PROGRAMS) do if not has(p) then out[#out + 1] = p end end
  return out
end

function N.mi_ok()
  return util.os_capture("find " .. EXT .. " -name 'Mi*.sc' 2>/dev/null", true):match("MiVerb%.sc") ~= nil
end

local function deps()
  local D = include("lib/deps")
  local d = D.new { name = "pollen", dir = N.DIR, platform = N.platform }
  d:add { id = "mpv", label = "mpv", check_fn = function() return has("mpv") end,
    pkg = "mpv", recommends = false, size = "~100 MB",
    why = "plays the radio stations (it brings its ffmpeg libraries)" }
  d:add { id = "socat", label = "socat", check_fn = function() return has("socat") end,
    pkg = "socat", size = "1 MB", why = "carries pollen's commands to mpv" }
  -- unpacked outside dust (sclang compiles every class file it finds there), and the tarball
  -- kept until the install works, so a retry doesn't download it again
  local tarball = N.DIR .. "/downloads/" .. MI_FILE
  d:add { id = MI, label = "mi-UGens " .. MI_VERSION, size = "3 MB",
    why = "MiVerb, the reverb from Clouds and Rings",
    check_fn = N.mi_ok,
    restart = true, -- SuperCollider loads them as it starts
    -- a norns build (armhf): no use on a desktop or anything else
    install = { { when = { arch = "armv7l" }, steps = {
      { url = MI_URL, sha256 = MI_SHA256, label = "download " .. MI_VERSION },
      { cmd = table.concat({
          "d=$(mktemp -d) || exit 1",
          "trap 'rm -rf \"$d\"' EXIT",
          "tar -C \"$d\" -xzf " .. q(tarball) .. " || { echo 'bad tarball'; exit 1; }",
          "bash \"$d/install.sh\" \"$d/mi-UGens\" || exit 1",
          "rm -f " .. q(tarball),
        }, "\n"), step_label = "install" },
    } } },
    manual = "a norns-only build; see github.com/glassgarden/mi-UGens",
    -- install.sh puts them in Extensions/mi-UGens (older installs it moved aside stay in ~/mi-UGens-backup-*)
    uninstall = { { cmd = "rm -rf \"$HOME/.local/share/SuperCollider/Extensions/mi-UGens\"",
      step_label = "remove Extensions/mi-UGens" } } }
  return d
end
N.deps = deps -- for the smoke test

-- what the manifest lists (it's there only while it lists something), read without loading norns-deps
local function recorded(ids)
  local chunk = loadfile(N.DIR .. "/manifest.lua", "t", {})
  local ok, data = pcall(chunk or error)
  local listed = ok and type(data) == "table" and type(data.deps) == "table" and data.deps or {}
  for _, id in ipairs(ids) do if listed[id] then return true end end
  return false
end

function N.install(done)
  deps():ensure(PROGRAMS, { on_done = function(ok, _, did_install) done(ok and did_install and true or false) end })
end

function N.installed() return recorded(PROGRAMS) end

function N.remove(done)
  deps():remove(PROGRAMS, { on_done = function(ok) done(ok) end })
end

function N.mi_install(done)
  deps():ensure({ MI }, { on_done = function(ok) done(ok) end })
end

function N.mi_installed() return recorded({ MI }) end

function N.mi_remove(done)
  deps():remove({ MI }, { on_done = function(ok) done(ok) end })
end

return N
