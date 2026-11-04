.PHONY: check integration dev
check:
	npx tsc --noEmit
	node --experimental-strip-types --test tests/game.test.ts
	npm run build
integration:
	node tests/api.integration.mjs
dev:
	npm run dev -- --port 5180 --hostname 127.0.0.1
