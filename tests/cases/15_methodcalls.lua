local obj = {}
obj.value = 5
function obj:get() return self.value end
function obj:add(n) self.value = self.value + n; return self end
obj:add(3):add(2)
print(obj:get())
