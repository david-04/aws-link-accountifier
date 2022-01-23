autorun : dist/tampermonkey/aws-link-accountifier.js

dist/tampermonkey/aws-link-accountifier.js : $(wildcard src/* src/*/* src/*/*/*)
	tsc
