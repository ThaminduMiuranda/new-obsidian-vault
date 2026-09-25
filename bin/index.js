#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawn } = require("child_process");
const readline = require("readline");

// Default shared config: the `config` branch of this same repo.
// Override with --config (and optionally --branch) to use your own.
const DEFAULT_CONFIG_REPO = "git@github.com:ThaminduMiuranda/new-obsidian-vault.git";
const DEFAULT_CONFIG_BRANCH = "config";

function usage(exitCode) {
  const msg = `
new-obsidian-vault <path> [github-repo-name]

Creates an Obsidian vault wired to a shared, git-synced config
(the vault's .obsidian folder is added as a git submodule), then
opens the vault in Obsidian.

Options:
  --config <git-url>   Git URL of your shared .obsidian config repo.
                        (or set OBSIDIAN_VAULT_CONFIG_REPO)
                        Defaults to ${DEFAULT_CONFIG_REPO}
  --branch <name>       Branch of the config repo to use.
                        Defaults to "${DEFAULT_CONFIG_BRANCH}" for the default
                        config repo, "main" otherwise.
  -h, --help            Show this help.

Example:
  new-obsidian-vault ~/Notes/MyVault --config git@github.com:you/obsidian-config.git
`;
  (exitCode ? console.error : console.log)(msg.trim());
  process.exit(exitCode || 0);
}

function parseArgs(argv) {
  const args = {
    config: process.env.OBSIDIAN_VAULT_CONFIG_REPO || null,
    branch: null,
    positional: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") usage(0);
    else if (a === "--config") args.config = argv[++i];
    else if (a.startsWith("--config=")) args.config = a.slice("--config=".length);
    else if (a === "--branch") args.branch = argv[++i];
    else if (a.startsWith("--branch=")) args.branch = a.slice("--branch=".length);
    else args.positional.push(a);
  }
  if (!args.config) {
    args.config = DEFAULT_CONFIG_REPO;
    if (!args.branch) args.branch = DEFAULT_CONFIG_BRANCH;
  }
  if (!args.branch) args.branch = "main";
  return args;
}

function gitInherit(gitArgs, cwd) {
  execFileSync("git", gitArgs, { cwd, stdio: "inherit" });
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

// obsidian://open?path=... only resolves vaults Obsidian already knows about
// (from its own vault registry). A brand-new vault isn't in that list yet,
// so register it ourselves before firing the URI.
function registerVaultLinux(vaultPath) {
  const candidates = [
    path.join(os.homedir(), ".var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json"),
    path.join(os.homedir(), ".config/obsidian/obsidian.json"),
    path.join(os.homedir(), "snap/obsidian/current/.config/obsidian/obsidian.json"),
  ];
  const configPath = candidates.find((p) => fs.existsSync(p));
  if (!configPath) return false;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return false;
  }
  data.vaults = data.vaults || {};
  if (Object.values(data.vaults).some((v) => v.path === vaultPath)) return true;

  const id = crypto.randomBytes(8).toString("hex");
  data.vaults[id] = { path: vaultPath, ts: Date.now() };
  fs.writeFileSync(configPath, JSON.stringify(data));
  return true;
}

async function main() {
  const { config, branch, positional } = parseArgs(process.argv.slice(2));
  const [rawPath, repoNameArg] = positional;

  if (!rawPath) usage(1);
  if (config.startsWith("-")) {
    console.error(`Refusing config repo starting with '-': ${config}\nThis would be parsed as a git option, not a URL.`);
    process.exit(1);
  }
  if (branch.startsWith("-")) {
    console.error(`Refusing branch starting with '-': ${branch}\nThis would be parsed as a git option, not a branch name.`);
    process.exit(1);
  }

  const vaultPath = path.resolve(rawPath);
  const repoName = repoNameArg || path.basename(vaultPath);

  fs.mkdirSync(vaultPath, { recursive: true });

  const gitDir = path.join(vaultPath, ".git");
  if (fs.existsSync(gitDir)) {
    console.error("Already a git repo. Nothing to do.");
    process.exit(1);
  }

  const obsidianDir = path.join(vaultPath, ".obsidian");
  let backupDir = null;
  if (fs.existsSync(obsidianDir)) {
    const isSubmoduleCheckout = fs.existsSync(path.join(obsidianDir, ".git"));
    if (isSubmoduleCheckout) {
      console.log(".obsidian already a git checkout. Skipping backup.");
    } else {
      backupDir = path.join(vaultPath, `.obsidian.default-backup.${Date.now()}`);
      console.log(`Default .obsidian found (from Obsidian's own vault creation) — moving to ${path.basename(backupDir)}`);
      fs.renameSync(obsidianDir, backupDir);
    }
  }

  gitInherit(["init", "-b", "main"], vaultPath);
  fs.writeFileSync(
    path.join(vaultPath, ".gitignore"),
    ".obsidian/workspace.json\n.obsidian/workspace-mobile.json\n.trash/\n"
  );
  gitInherit(["submodule", "add", "-b", branch, "--", config, ".obsidian"], vaultPath);
  gitInherit(["add", ".gitignore", ".gitmodules", ".obsidian"], vaultPath);
  gitInherit(["commit", "-m", "init: vault with shared obsidian config"], vaultPath);

  console.log(`\nVault ready at ${vaultPath}`);
  console.log("Create a GitHub repo for the vault itself, then run:");
  console.log(`  git -C "${vaultPath}" remote add origin <your-vault-repo-url>`);
  console.log(`  git -C "${vaultPath}" push -u origin main`);

  if (backupDir && fs.existsSync(backupDir)) {
    const reply = await ask(`\nDelete backup ${path.basename(backupDir)}? [y/N] `);
    if (/^y(es)?$/i.test(reply.trim())) {
      fs.rmSync(backupDir, { recursive: true, force: true });
      console.log(`Deleted ${path.basename(backupDir)}`);
    } else {
      console.log(`Kept ${path.basename(backupDir)}`);
    }
  }

  if (process.platform === "linux") {
    try {
      registerVaultLinux(vaultPath);
    } catch {
      // best-effort; URI open below still works for already-known vaults
    }
  }

  const uri = `obsidian://open?path=${encodeURIComponent(vaultPath)}`;
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  console.log(`\nOpening vault in Obsidian...`);
  try {
    const child = spawn(opener, [uri], { stdio: "ignore", detached: true });
    child.unref();
  } catch {
    console.log(`Could not auto-open. Open manually: ${uri}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
