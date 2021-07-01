local arguments_raw = { ... }
local arguments = ""

for index, value in ipairs(arguments_raw) do
  arguments = arguments .. value .. " "
end

arguments = arguments:sub(1, -2)

local index = 1
local exit = false
local namedTokens = {}
local indexTokens = {}

while exit ~= true do
  if string.sub(arguments, index, index) == "-" then
    index = index + 1
    if string.sub(arguments, index, index) == "-" then
      index = index + 1
      local key = ""
      while string.sub(arguments, index, index) ~= " " and string.sub(arguments, index, index) ~= "" do
        key = key .. string.sub(arguments, index, index)
        index = index + 1
      end
      index = index + 1
      local value = ""
      while string.sub(arguments, index, index) ~= " " and string.sub(arguments, index, index) ~= "" do
        value = value .. string.sub(arguments, index, index)
        index = index + 1
      end
      namedTokens[key] = value
    else
      while string.sub(arguments, index, index) ~= " " and string.sub(arguments, index, index) ~= "" do
        table.insert(indexTokens, string.sub(arguments, index, index))
        index = index + 1
      end
    end
  end
  if string.sub(arguments, index, index) == "" then
    exit = true
  end
  index = index + 1
end

if namedTokens["host"] == nil then
  namedTokens["host"] = "localhost"
end

if namedTokens["port"] == nil then
  namedTokens["port"] = 3434
end

local endpoint = "http"

if namedTokens["s"] then
  endpoint = endpoint .. "s"
end

endpoint = endpoint .. "://" .. namedTokens["host"] .. ":" .. namedTokens["port"] .. "/"

local response, errorReason, errorResponse = http.get(endpoint .. "turtlejs-client", { HOST = _HOST, CC_DEFAULT_SETTINGS = _CC_DEFAULT_SETTINGS, VERSION = os.version(), COMPUTER_ID = os.getComputerID(), COMPUTER_LABEL = os.getComputerLabel() }, true)

if response == nil then
  error(errorReason)
end

fs.delete("/turtlejs/prog/turtlejs-client/")

local primaryFileNameLength0 = response.read()
local primaryFileNameLength1 = response.read()

if primaryFileNameLength0 == nil or primaryFileNameLength1 == nil then
  error("Failed to parse: ended on name length")
end

local primaryFileNameLength = primaryFileNameLength0 + (primaryFileNameLength1 * 256)
local primaryFileName = response.read(primaryFileNameLength)

local continue = true

while continue do
  local nameLength0 = response.read()
  local nameLength1 = response.read()

  if nameLength0 == nil or nameLength1 == nil then
    error("Failed to parse: ended on name length")
  end

  local nameLength = nameLength0 + (nameLength1 * 256)
  local name = response.read(nameLength)
  local file = fs.open("/turtlejs/prog/turtlejs-client/" .. name, "wb")

  local fileLength0 = response.read()
  local fileLength1 = response.read()
  local fileLength2 = response.read()
  local fileLength3 = response.read()

  if fileLength0 == nil or fileLength1 == nil or fileLength2 == nil or fileLength3 == nil then
    error("Failed to parse: ended on file length")
  end

  local fileLength = fileLength0 + (fileLength1 * 256) + (fileLength2 * 65536) + (fileLength3 * 16777216)
  local i = 0

  while i < fileLength do
    i = i + 1

    file.write(response.read())
  end

  local hasEnded = response.read()

  if hasEnded == 1 then
    continue = false
  end
end


local r = require("cc.require")
namedTokens["host"] = nil
namedTokens["port"] = nil
local env = setmetatable({ arguments = { namedTokens = namedTokens, indexTokens = indexTokens } }, { __index = _ENV })
env.require, env.package = r.make(env, "/turtlejs/prog/turtlejs-client/")
env.require(primaryFileName)
