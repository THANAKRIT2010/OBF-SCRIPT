local t = {10,20,30}
local sum = 0
for i, v in ipairs(t) do sum = sum + v end
local keys = 0
for k, v in pairs({a=1,b=2,c=3}) do keys = keys + 1 end
print(sum, keys)
