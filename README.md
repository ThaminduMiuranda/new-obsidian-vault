# new-obsidian-vault

Create an Obsidian vault wired to a shared, git-synced `.obsidian` config
(as a git submodule), then open it straight in Obsidian.

Useful if you keep your Obsidian settings, themes, and plugins in one
git repo and want every new vault to pick them up automatically instead
of starting from Obsidian's defaults.

## Usage

```sh
npx new-obsidian-vault <path> --config <git-url-of-your-config-repo>
```

or set the config repo once via an environment variable:

```sh
export OBSIDIAN_VAULT_CONFIG_REPO=git@github.com:you/obsidian-config.git
npx new-obsidian-vault ~/Notes/MyVault
```

Safe to run either before or after creating the vault in Obsidian's own
UI — if a default `.obsidian` folder already exists, it's backed up
(you're asked before it's deleted) and replaced with the submodule.

### What it does

1. Creates the vault directory (if it doesn't exist).
2. Backs up any existing default `.obsidian` folder.
3. `git init`s the vault.
4. Adds your config repo as a submodule at `.obsidian`.
5. Adds a `.gitignore` for per-device files (`workspace.json`, `.trash/`).
6. Commits.
7. Opens the vault in Obsidian.

### Setting up a config repo

Your config repo is just a git repo whose root looks like an
`.obsidian` folder: `app.json`, `appearance.json`, `community-plugins.json`,
a `plugins/` directory, `themes/`, `snippets/`, etc. Point multiple
vaults' submodules at the same config repo to keep plugins, themes, and
hotkeys identical across all of them.

## License

MIT
