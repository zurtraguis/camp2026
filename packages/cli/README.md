# create-vibecoding-harness

Bootstrap a new VibeCoding harness project. Versioned. Comes with tracks, stacks, telemetry, and snapshots.

## Use

```bash
npx create-vibecoding-harness@latest my-app --stack=nextjs --track=standard
cd my-app
npm install
# open in editor → /kickoff
```

## Options

| Flag                  | Default     | Description                              |
|-----------------------|-------------|------------------------------------------|
| `--stack=<id>`        | `nextjs`    | `nextjs` \| `api-only` \| `mobile` \| `cli` |
| `--track=<id>`        | `standard`  | `lite` \| `standard` \| `enterprise`     |
| `--from-dir=<path>`   | —           | copy from local dir (dev/offline)        |
| `--from-tarball=<p>`  | —           | extract local `.tar.gz`                  |
| `--from-release=<v>`  | `latest`    | download GitHub Release tarball          |
| `--force`             | `false`     | overwrite existing destination           |

## Companion CLI: `vibecoding`

After bootstrap, the project ships with `vibecoding`:

```bash
vibecoding doctor    # run verify:all
vibecoding status    # show current phase
vibecoding events    # telemetry summary
vibecoding snapshot list
vibecoding upgrade   # apply pending migrations
```

## Tracks

- **lite** — 9 phases, side-projects/MVP.
- **standard** — 14 phases, SaaS B2B/B2C.
- **enterprise** — 16 phases (adds compliance + DPA).

See `docs/internal/TRACKS.md` after bootstrap.

## License

MIT.
