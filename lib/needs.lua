-- What the radio needs on the norns, mpv (it plays the stations) and socat (it carries pollen's
-- commands to mpv), installed and removed through norns-deps (lib/deps.lua and lib/deps/,
-- vendored from github.com/vehka/norns-deps, MIT). Its screen lists what's missing and how big it
-- is, K3 installs it (apt, through sudo), and a manifest in pollen's data folder keeps what it
-- installed, so removing takes away only that: never a copy that was there before pollen.
--
--   N.missing()       { "mpv", "socat" } or fewer: what isn't installed
--   N.install(done)   the install screen; done(true) once something was installed
--   N.installed()     did pollen install anything (that's still there)?
--   N.remove(done)    the remove screen for what pollen installed; done(ok)
--
-- norns-deps asks the system about itself as it loads (the machine, apt, sudo), so it's loaded only
-- when a screen opens: never in the browser, where the engine's stand-in plays the radio.

local N = {}

N.DIR = _path.data .. "pollen/deps"
N.platform = nil -- the smoke test sets a pretend norns here, so nothing asks the real machine

local PROGRAMS = { "mpv", "socat" }
local function has(prog) return util.os_capture("command -v " .. prog) ~= "" end

function N.missing()
  local out = {}
  for _, p in ipairs(PROGRAMS) do if not has(p) then out[#out + 1] = p end end
  return out
end

local function deps()
  local D = include("lib/deps")
  local d = D.new { name = "pollen", dir = N.DIR, platform = N.platform }
  d:add { id = "mpv", label = "mpv", check_fn = function() return has("mpv") end,
    pkg = "mpv", recommends = false, size = "~100 MB",
    why = "plays the radio stations (it brings its ffmpeg libraries)" }
  d:add { id = "socat", label = "socat", check_fn = function() return has("socat") end,
    pkg = "socat", size = "1 MB", why = "carries pollen's commands to mpv" }
  return d
end

function N.install(done)
  deps():ensure(PROGRAMS, { on_done = function(ok, _, did_install) done(ok and did_install and true or false) end })
end

-- the manifest is there only while it lists something
function N.installed() return util.file_exists(N.DIR .. "/manifest.lua") end

function N.remove(done)
  deps():remove(nil, { on_done = function(ok) done(ok) end })
end

return N
