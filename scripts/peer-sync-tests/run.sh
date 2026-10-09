#!/bin/sh
# Tests de la synchro iPhone <-> iPad : SQLite réel, 2 à 3 appareils simulés. Node 22+ requis.
cd "$(dirname "$0")" || exit 1
[ -d node_modules/esbuild ] || npm install --no-save --silent esbuild >/dev/null 2>&1
node build.js && for f in test.js test2.js test3.js test4.js test5.js test6.js; do echo "== $f"; node "$f"; done
