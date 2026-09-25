# new-obsidian-vault

Create an Obsidian vault wired to a shared, git-synced `.obsidian` config
(as a git submodule), then open it straight in Obsidian.

Useful if you keep your Obsidian settings, themes, and plugins in one
git repo and want every new vault to pick them up automatically instead
of starting from Obsidian's defaults.

## Usage

This is a private repo, not published to the npm registry, so install it
via the `github:` specifier:

```sh
npx github:ThaminduMiuranda/new-obsidian-vault <path>
```

With no `--config`, defaults to the `config` branch of this same repo
(the CLI code lives on `main`, the shared `.obsidian` settings live on
`config` — one repo, one place to invite collaborators).

To use your own config repo/branch instead:

```sh
npx github:ThaminduMiuranda/new-obsidian-vault <path> --config <git-url> [--branch <name>]
```

or set it once via an environment variable:

```sh
export OBSIDIAN_VAULT_CONFIG_REPO=git@github.com:you/obsidian-config.git
npx github:ThaminduMiuranda/new-obsidian-vault ~/Notes/MyVault
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

### Bringing an existing vault to another machine

Once a vault created by this tool is pushed to its own GitHub repo, don't
clone it with a plain `git clone` or `gh repo clone` — those don't fetch
submodule contents, so `.obsidian` comes down as an **empty folder**.
Obsidian will then happily write a fresh set of defaults into that empty
folder instead of erroring, which looks like your shared config silently
didn't apply.

Clone with submodules included:

```sh
git clone --recurse-submodules <your-vault-repo-url>
```

If you already cloned it plain and Obsidian already wrote defaults into
the empty `.obsidian`, quit Obsidian fully first, then:

```sh
rm -rf .obsidian            # PowerShell: Remove-Item -Recurse -Force .obsidian
git submodule update --init --recursive
```

then reopen the vault.

### Setting up a config repo

Your config repo is just a git repo whose root looks like an
`.obsidian` folder: `app.json`, `appearance.json`, `community-plugins.json`,
a `plugins/` directory, `themes/`, `snippets/`, etc. Point multiple
vaults' submodules at the same config repo to keep plugins, themes, and
hotkeys identical across all of them.

## License

MIT
