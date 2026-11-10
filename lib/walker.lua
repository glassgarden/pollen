-- The wind: where pollen goes next. Pure functions over a list of stations ({ lat, lon, ... });
-- the wind's own memory (its bearing, the stations visited) is a table the caller keeps.
--
--   W.next(kind, stations, from, mem, reach, skip) -> a station (or nil: none left)
--
-- kind: one of W.KINDS' ids. from: the station we're at (nil at first). reach: 0..1, how far a
-- move goes. skip(st): true for stations not to land on (dead ones).

local W = {}

W.KINDS = {
  { id = "breeze", name = "breeze" },        -- a hop in any direction, to a flower not visited yet
  { id = "trade", name = "trade wind" },     -- steadily along one bearing
  { id = "eddy", name = "eddy" },            -- a random walk: the bearing turns a little each move
  { id = "gust", name = "gust" },            -- anywhere at all (any country, then any flower in it)
  { id = "far", name = "far side" },         -- to the other side of the world, and back
}

local R_EARTH = 6371
local rad, deg = math.rad, math.deg
local sin, cos, asin, atan = math.sin, math.cos, math.asin, math.atan

function W.distance(a, b) -- km, along the surface (haversine)
  local dlat, dlon = rad(b.lat - a.lat), rad(b.lon - a.lon)
  local h = sin(dlat / 2) ^ 2 + cos(rad(a.lat)) * cos(rad(b.lat)) * sin(dlon / 2) ^ 2
  return 2 * R_EARTH * asin(math.min(1, math.sqrt(h)))
end

function W.bearing(a, b) -- degrees from north, the way from a to b
  local p1, p2, dl = rad(a.lat), rad(b.lat), rad(b.lon - a.lon)
  local y = sin(dl) * cos(p2)
  local x = cos(p1) * sin(p2) - sin(p1) * cos(p2) * cos(dl)
  return (deg(atan(y, x)) + 360) % 360
end

function W.travel(a, bearing, km) -- the point km away from a along a bearing
  local d, b = km / R_EARTH, rad(bearing)
  local p1, l1 = rad(a.lat), rad(a.lon)
  local p2 = asin(sin(p1) * cos(d) + cos(p1) * sin(d) * cos(b))
  local l2 = l1 + atan(sin(b) * sin(d) * cos(p1), cos(d) - sin(p1) * sin(p2))
  return { lat = deg(p2), lon = (deg(l2) + 540) % 360 - 180 }
end

function W.antipode(a) return { lat = -a.lat, lon = (a.lon + 360) % 360 - 180 } end

-- the station nearest a point, among those ok(st) allows
local function nearest(stations, point, ok)
  local best, bd = nil, math.huge
  for _, st in ipairs(stations) do
    if ok(st) then
      local d = W.distance(point, st)
      if d < bd then best, bd = st, d end
    end
  end
  return best
end

-- the station nearest a point a move aims at, at least half the move away from where it starts,
-- so a point out at sea doesn't snap back to the coast it left; with none that far that's also
-- within a move of the point (no overshooting to another continent), the nearest
local function toward(stations, from, point, km, ok)
  local far = nearest(stations, point, function(st) return ok(st) and W.distance(from, st) >= km / 2 end)
  if far and W.distance(point, far) <= km then return far end
  return nearest(stations, point, ok)
end

-- the distance a move covers: 50 km at the least reach, 10000 (across an ocean) at the most
function W.step_km(reach) return 50 * 200 ^ math.max(0, math.min(1, reach)) end

-- one at random among those ok(st) allows, in one pass
local function any_of(stations, ok)
  local pick, n = nil, 0
  for _, st in ipairs(stations) do
    if ok(st) then
      n = n + 1
      if math.random(n) == 1 then pick = st end
    end
  end
  return pick
end

function W.next(kind, stations, from, mem, reach, skip)
  mem.visited = mem.visited or {}
  local function ok(st) return st ~= from and not mem.visited[st] and not (skip and skip(st)) end
  local any = false
  for _, st in ipairs(stations) do if ok(st) then any = true; break end end
  if not any then -- every flower visited: start afresh
    mem.visited = {}
    for _, st in ipairs(stations) do if ok(st) then any = true; break end end
    if not any then return nil end
  end
  local pick
  if not from or kind == "gust" then
    -- a country first, then a flower in it: by flower alone, a few countries with thousands of
    -- stations would be nearly every gust
    local country, seen, n = nil, {}, 0
    for _, st in ipairs(stations) do
      if ok(st) and not seen[st.country] then
        seen[st.country] = true
        n = n + 1
        if math.random(n) == 1 then country = st.country end
      end
    end
    pick = any_of(stations, function(st) return ok(st) and st.country == country end)
  elseif kind == "breeze" then
    local km = W.step_km(reach) * (0.5 + 0.5 * math.random())
    pick = toward(stations, from, W.travel(from, math.random() * 360, km), km, ok)
  elseif kind == "trade" or kind == "eddy" then
    mem.bearing = mem.bearing or math.random() * 360
    if kind == "eddy" then mem.bearing = (mem.bearing + (math.random() - 0.5) * 120) % 360 end
    local km = W.step_km(reach)
    pick = toward(stations, from, W.travel(from, mem.bearing, km), km, ok)
  elseif kind == "far" then
    local target = W.antipode(from)
    if reach > 0 then target = W.travel(target, math.random() * 360, W.step_km(reach) * math.random() * 0.5) end
    pick = nearest(stations, target, ok)
  end
  if pick then mem.visited[pick] = true end
  return pick
end

return W
