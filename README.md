# Obsidian Vault Config

Shared Obsidian configuration (themes, plugins, settings) tracked as a git
repository, intended to be used as a `.obsidian` submodule inside an Obsidian
vault repo.

## Adding this as a submodule to a vault

From the root of the vault repo:

```bash
git submodule add https://github.com/ThaminduMiuranda/obsidian_vault_config.git .obsidian
git config -f .gitmodules submodule.".obsidian".branch main
git add .gitmodules .obsidian
git commit -m "Add .obsidian config as a submodule"
```

The `branch = main` setting tells `git submodule update --remote` to track
the `main` branch of this repo when updating.

## Updating the submodule

To pull in the latest config changes from this repo and update the vault's
reference to it:

```bash
git submodule update --remote .obsidian
git add .obsidian
git commit -m "Update .obsidian submodule"
```

When cloning the vault fresh (or pulling someone else's submodule bump),
initialize/sync the submodule with:

```bash
git submodule update --init --remote
```
