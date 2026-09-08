#!/bin/bash
for f in tests/cases/*.lua; do
  name=$(basename "$f" .lua)
  exp=$(lua5.4 "$f" 2>&1)
  if ! node bin/obfuscate.js "$f" -o "tests/out/${name}.lua" --seed=777 2>tests/out/${name}.build.err; then
    echo "=== $name === BUILD ERROR"; cat tests/out/${name}.build.err
    continue
  fi
  got=$(lua5.4 "tests/out/${name}.lua" 2>&1)
  if [[ "$exp" == "$got" ]]; then
    echo "=== $name === PASS"
  else
    echo "=== $name === FAIL"
    echo "  expected: $exp"
    echo "  got:      $got"
  fi
done
