#!/bin/sh
# Builds the prototype folder from the app's real files.
set -e
OUT=/home/claude/proto3; R=/home/claude/gioia-client-desk
mkdir -p $OUT; rm -rf $OUT/*
cp $R/public/style.css $R/public/logo.js $R/public/logic.js $R/public/app.js $R/lib/core.js $R/proto/mempool.js $R/proto/seed.js $R/proto/boot.js $OUT/
printf 'window.SEED_JSON = %s;\nwindow.PAY_DEFAULT = %s;\n' "$(cat /home/claude/build/seed.json)" "$(cat $R/lib/paydefault.json)" > $OUT/seeddata.js
sed -e 's#<title>GIOIA Dashboard</title>#<title>Client Desk · Phase 1 prototype</title>#' -e 's#href="/style.css"#href="style.css"#' \
  -e 's#<script src="/logic.js"></script>#<script src="logic.js"></script><script src="core.js"></script><script src="mempool.js"></script><script src="seed.js"></script><script src="seeddata.js"></script><script src="boot.js"></script>#' \
  -e 's#<script src="/logo.js"></script>#<script src="logo.js"></script>#' -e 's#<script src="/app.js"></script>#<script src="app.js"></script>#' $R/public/index.html > $OUT/index.html
