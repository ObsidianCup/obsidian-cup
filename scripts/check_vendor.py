#!/usr/bin/env python3
"""Checks that the libraries in js/vendor are exactly the published ones.

js/vendor/SHA256SUMS holds the fingerprint of each file, taken from the
official npm packages (13 Nov 2026). Run:  python3 scripts/check_vendor.py
When a library is updated on purpose, replace its line in SHA256SUMS with the
fingerprint of the new official file.
"""
import hashlib
import pathlib
import sys

vendor = pathlib.Path(__file__).resolve().parent.parent / "js" / "vendor"
wanted = dict(reversed(line.split()) for line in (vendor / "SHA256SUMS").read_text().splitlines() if line.strip())
found = {p.name for p in vendor.glob("*.js")}
bad = [name for name in sorted(found | set(wanted))
       if name not in found or name not in wanted
       or hashlib.sha256((vendor / name).read_bytes()).hexdigest() != wanted[name]]
if bad:
    print("Vendor files changed or not listed: " + ", ".join(bad))
    sys.exit(1)
print(f"Vendor files match ({len(found)})")
