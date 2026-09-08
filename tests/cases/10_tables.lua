local t = {1,2,3, x=10, y=20}
t[4] = 4
t.z = 30
print(t[1], t[2], t[3], t[4], t.x, t.y, t.z)
local nested = { a = { b = { c = 99 } } }
print(nested.a.b.c)
