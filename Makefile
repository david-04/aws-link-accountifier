autorun : dist/tampermonkey/aws-link-accountifier.js

dist/tampermonkey/aws-link-accountifier.js : $(wildcard src/*.ts src/*/*.ts src/*/*/*.ts)
	tsc
