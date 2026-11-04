.PHONY: check integration dev
check:
	npx tsc --noEmit
	node --experimental-strip-types --test tests/game.test.ts tests/stories.test.ts tests/manipulations.test.ts
	npm run build
integration:
	node tests/api.integration.mjs
	node --experimental-strip-types tests/story-api.integration.ts
dev:
	npm run dev -- --port 5180 --hostname 127.0.0.1
