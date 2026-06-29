# Migrations

Each migration is an idempotent ESM module: `<from>-to-<to>.mjs` exporting `up(projectRoot)`.

Example:

```js
// 3.0.0-to-3.1.0.mjs
export async function up(root) {
  // mutate config, add new files, etc. Idempotent.
}
```

`vibecoding upgrade` reads `.harness-config.json.version`, walks migrations sequentially up to the CLI's bundled version, and updates the version field at the end.
