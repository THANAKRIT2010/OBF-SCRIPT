local a = nil
local b = a or "default"
local c = 5 and 10
local d = false and error("never")
print(b, c, d)
if (1 == 1) and (2 == 2) then print("both") end
if (1 == 2) or (2 == 2) then print("either") end
