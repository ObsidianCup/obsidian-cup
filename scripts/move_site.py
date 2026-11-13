#!/usr/bin/env python3
"""Changes the website's address everywhere, for moving to a new host or domain.

    python3 scripts/move_site.py https://obsidiancup.com
    python3 scripts/move_site.py https://obsidiancup.com --dry-run   (only shows what would change)

The current address is kept in site.json. Published legal texts and old
notes are left alone (agreed texts must not change after people agreed).
The login function keeps the old address as well, so both work during a move.
Afterwards the script lists the steps a person must do in Supabase and elsewhere.
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "node_modules", "legal"}          # legal/: published versions, never edited
SKIP_FILES = {"supabase/seed/legal_documents.sql", "docs/legal/legal-texts-en-v1.md",
              "docs/HANDOVER.md", "docs/WEBSITE-AUDIT-2026-11.md", "docs/REGISTRATION-WHAT-IF-AUDIT.md",
              "scripts/move_site.py", "docs/MOVING-HOSTS.md"}
TEXT = {".html", ".js", ".mjs", ".ts", ".json", ".xml", ".txt", ".md", ".css", ".yml", ".py", ".sql"}
EDGE = "supabase/functions/login-with-code/index.ts"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if len(args) != 1 or not re.fullmatch(r"https://[a-z0-9.-]+\.[a-z]{2,}", args[0]):
        raise SystemExit("Give the new address like this: python3 scripts/move_site.py https://obsidiancup.com")
    new = args[0]
    old = json.loads((ROOT / "site.json").read_text())["url"]
    if new == old:
        raise SystemExit(f"The site is already set to {old}")
    old_host, new_host = old.split("//")[1], new.split("//")[1]

    changed = []
    for path in sorted(ROOT.rglob("*")):
        rel = path.relative_to(ROOT).as_posix()
        if not path.is_file() or path.suffix not in TEXT or rel in SKIP_FILES:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts):
            continue
        text = path.read_text(encoding="utf-8")
        if old_host not in text:
            continue
        if rel == EDGE:   # allow both addresses while moving
            out = text.replace(f"'{old}'", f"'{new}', '{old}'") if f"'{new}'" not in text else text
        else:
            out = text.replace(old, new).replace(old_host, new_host)
        if out != text:
            changed.append((rel, text.count(old_host)))
            if not dry:
                path.write_text(out, encoding="utf-8")

    for rel, n in changed:
        print(f"{'would change' if dry else 'changed'} {rel} ({n})")
    if not dry:
        subprocess.run([sys.executable, str(ROOT / "scripts" / "build_host_files.py")], check=True)
    print(f"\n{len(changed)} files {'would change' if dry else 'changed'}: {old} -> {new}")
    print("\nNow follow docs/MOVING-HOSTS.md, part 3 (the steps only a person can do).")


if __name__ == "__main__":
    main()
