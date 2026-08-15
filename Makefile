SHELL := /bin/zsh

.PHONY: doctor bootstrap dev build test test-e2e test-chain verify attack-suite demo-reset security-scan stop

doctor:
	./scripts/doctor.sh

bootstrap:
	./scripts/bootstrap.sh

dev:
	./scripts/start-local.sh

build:
	./scripts/build-wasm.sh
	npm run build

test:
	cd packages/AdhikaarCore && $(HOME)/.swiftly/bin/swift test
	npm run test -w @adhikaar/web -- --run
	cd contracts && forge test
	npx supabase test db

test-e2e:
	npm run test:e2e

test-chain:
	npm run test:e2e:chain

verify: build test test-e2e test-chain security-scan

attack-suite:
	npm run test -w @adhikaar/web -- --run src/security/attackSuite.test.ts

demo-reset:
	./scripts/demo-reset.sh

security-scan:
	./scripts/security-scan.sh

stop:
	./scripts/stop-local.sh
