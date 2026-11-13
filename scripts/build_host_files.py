#!/usr/bin/env python3
"""Writes the settings files other hosts need, from vercel.json.

vercel.json stays the one place where redirects and security headers are
written. This script copies them into:

  _headers, _redirects   Cloudflare Pages and Netlify
  .htaccess              Hostinger and other Apache / LiteSpeed hosts

So the same repo works on any of these hosts with no changes.
Run it after editing vercel.json:   python3 scripts/build_host_files.py
Check they are up to date:          python3 scripts/build_host_files.py --check
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOTE = "Made by scripts/build_host_files.py from vercel.json. Do not edit by hand."


def load():
    cfg = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
    return cfg.get("redirects", []), cfg.get("headers", [])


def glob_paths(source):
    """'/(.*)' -> ['/*'];  '/pages/(account|admin).html' -> two plain paths."""
    if source == "/(.*)":
        return ["/*"]
    m = re.fullmatch(r"([^()]*)\(([^()*.+?]+)\)([^()]*)", source)
    if m:
        return [m.group(1) + alt + m.group(3) for alt in m.group(2).split("|")]
    if re.search(r"[()*+?]", source):
        raise SystemExit(f"build_host_files: cannot translate header source {source!r}; add a rule for it")
    return [source]


def headers_file(headers):
    out = [f"# {NOTE}", ""]
    for block in headers:
        for path in glob_paths(block["source"]):
            out.append(path)
            out += [f"  {h['key']}: {h['value']}" for h in block["headers"]]
            out.append("")
    return "\n".join(out)


def redirects_file(redirects):
    out = [f"# {NOTE}"]
    for r in redirects:
        if re.search(r"[()*:]", r["source"] + r["destination"]):
            raise SystemExit(f"build_host_files: cannot translate redirect {r['source']!r}; add a rule for it")
        out.append(f"{r['source']} {r['destination']} {301 if r.get('permanent') else 302}")
    return "\n".join(out) + "\n"


def htaccess_file(redirects, headers):
    out = [f"# {NOTE}", "",
           "# Always use https",
           "<IfModule mod_rewrite.c>",
           "RewriteEngine On",
           "RewriteCond %{HTTPS} !=on",
           "RewriteCond %{HTTP:X-Forwarded-Proto} !https",
           "RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]",
           "</IfModule>", "",
           "# The page shown for addresses that do not exist",
           "ErrorDocument 404 /404.html", "",
           "# Old addresses",
           "<IfModule mod_alias.c>"]
    for r in redirects:
        out.append(f"Redirect {301 if r.get('permanent') else 302} {r['source']} {r['destination']}")
    out += ["</IfModule>", "", "# Security headers", "<IfModule mod_headers.c>"]
    for block in headers:
        paths = glob_paths(block["source"])
        lines = []
        for h in block["headers"]:
            value = h["value"].replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'Header always set {h["key"]} "{value}"')
        if paths == ["/*"]:
            out += lines
        else:
            names = "|".join(re.escape(p.rsplit("/", 1)[-1]) for p in paths)
            out.append(f'<FilesMatch "^({names})$">')
            out += ["  " + l for l in lines]
            out.append("</FilesMatch>")
    out += ["</IfModule>", "",
            "# Folders that are not part of the website",
            "<IfModule mod_alias.c>",
            "RedirectMatch 404 ^/(docs|scripts|supabase|\\.git|\\.github)(/|$)",
            "</IfModule>", ""]
    return "\n".join(out)


def main():
    redirects, headers = load()
    files = {"_headers": headers_file(headers), "_redirects": redirects_file(redirects),
             ".htaccess": htaccess_file(redirects, headers)}
    if "--check" in sys.argv:
        stale = [n for n, text in files.items()
                 if not (ROOT / n).exists() or (ROOT / n).read_text(encoding="utf-8") != text]
        if stale:
            raise SystemExit("Out of date: " + ", ".join(stale) + ". Run python3 scripts/build_host_files.py")
        print("Host files match vercel.json")
        return
    for name, text in files.items():
        (ROOT / name).write_text(text, encoding="utf-8")
        print("wrote", name)


if __name__ == "__main__":
    main()
