#!/bin/bash
for lvl in 1 2 3; do
  echo "##### LEVEL $lvl #####"
  fails=0
  for f in tests/cases/*.lua; do
    name=$(basename "$f" .lua)
    exp=$(lua5.4 "$f" 2>&1)
    if ! node bin/obfuscate.js "$f" -o "tests/out/${name}.lvl${lvl}.lua" --seed=777 --level=$lvl 2>tests/out/${name}.build.err; then
      echo "  $name: BUILD ERROR"; cat tests/out/${name}.build.err; fails=$((fails+1)); continue
    fi
    got=$(lua5.4 "tests/out/${name}.lvl${lvl}.lua" 2>&1)
    if [[ "$exp" != "$got" ]]; then
      echo "  $name: FAIL"; echo "    expected: $exp"; echo "    got:      $got"; fails=$((fails+1))
    fi
  done
  echo "  ($((21-fails))/21 passed)"
done
