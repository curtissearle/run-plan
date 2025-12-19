install:
	yarn install

dev:
	yarn run dev

lint:
	npx tsc --noEmit
	yarn run lint

build:
	yarn run build

test: lint build