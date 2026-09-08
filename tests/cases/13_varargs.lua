local function sum(...)
  local s = 0
  local n = select('#', ...)
  for i = 1, n do
    s = s + select(i, ...)
  end
  return s, n
end
print(sum(1,2,3,4,5))
