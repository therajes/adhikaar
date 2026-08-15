# Local setup

Requirements are installed without `sudo`: Homebrew, Colima, Docker CLI, Swiftly Swift 6.3.3, matching `swift-6.3.3-RELEASE_wasm` SDK, Binaryen, Foundry, Node 24, and Supabase CLI.

```bash
make bootstrap
make dev
```

Open `http://127.0.0.1:5173`. Use `/verify` for the receiver and `/representative` for the employee. Copy `.env.example` to `.env.local` for hosted configuration; never commit credentials. Use `make stop` to stop local Supabase and the Anvil process started by the project.
