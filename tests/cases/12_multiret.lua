local function minmax(t)
  local lo, hi = t[1], t[1]
  for i = 2, #t do
    if t[i] < lo then lo = t[i] end
    if t[i] > hi then hi = t[i] end
  end
  return lo, hi
end
local a, b = minmax({5,3,9,1,7})
print(a, b)
