local function fib(n)
  if n < 2 then return n end
  return fib(n-1) + fib(n-2)
end
print(fib(10))
local function fact(n)
  if n == 0 then return 1 end
  return n * fact(n-1)
end
print(fact(6))
