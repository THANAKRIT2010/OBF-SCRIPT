local function makeAccount(balance)
  local function deposit(amt) balance = balance + amt end
  local function withdraw(amt) balance = balance - amt end
  local function getBalance() return balance end
  return deposit, withdraw, getBalance
end
local dep, wd, bal = makeAccount(100)
dep(50)
wd(30)
print(bal())
