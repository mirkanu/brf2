#!/usr/bin/env python3
"""Build a Markdown body file from a journal article PDF.

Usage: python3 build-body.py <pdf> <out.md> [--title "..."]

The output is a single Markdown document with the article title as H1 and the
section subheads promoted to H2. Verse quotations are emitted as blockquotes.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


HEADER_LINES = (
    "British Reformed Journal",
    "Editorial: More Loving Than God?",
)


def extract_text(pdf: Path) -> str:
    out = subprocess.run(
        ["pdftotext", str(pdf), "-"],
        check=True, capture_output=True, text=True,
    )
    return out.stdout


def clean(text: str) -> str:
    text = text.replace("\f", "\n")
    lines = [ln.rstrip() for ln in text.split("\n")]
    cleaned: list[str] = []
    for ln in lines:
        s = ln.strip()
        if not s:
            cleaned.append("")
            continue
        if s.isdigit() and len(s) <= 3:
            continue
        if s in HEADER_LINES:
            continue
        # Page numbers crammed into the same text stream as a paragraph
        # (pdftotext sometimes emits lines like "...This de2" where the 2
        # is the running page number). Strip a trailing 1-3 digit page
        # number that is glued to the end of a line of mixed content.
        s_glued = re.sub(r"(?<=[a-zA-Z)\)\d{1,3}$", "", s)
        s = s_glued
        cleaned.append(s)
    # Re-glue hyphenated word breaks: "word-\nNEXT" -> "wordNEXT"
    glued: list[str] = []
    i = 0
    while i < len(cleaned):
        ln = cleaned[i]
        if ln.endswith("-") and i + 1 < len(cleaned) and cleaned[i + 1] and cleaned[i + 1][0].islower():
            glued.append(ln[:-1] + cleaned[i + 1])
            i += 2
            continue
        glued.append(ln)
        i += 1
    cleaned = glued
    # Collapse runs of blank lines to a single blank line
    out: list[str] = []
    blank = False
    for ln in cleaned:
        if not ln:
            if not blank:
                out.append("")
            blank = True
        else:
            out.append(ln)
            blank = False
    while out and out[0] == "":
        out.pop(0)
    while out and out[-1] == "":
        out.pop()
    return "\n".join(out)


SUBHEAD_LINE_RE = re.compile(r"^[A-Z][^.]*$")
VERSE_REF_RE = re.compile(r"\([A-Z1-3][A-Za-z0-9.]+\s+\d")
ENDS_WITH_VERSE_RE = re.compile(r"\([A-Z1-3][A-Za-z0-9.]+\s+\d[^)]*\)\.?$")


def looks_like_subhead(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if len(s) > 80:
        return False
    if any(ch in s for ch in ".!?,;:"):
        return False
    if VERSE_REF_RE.search(s):
        return False
    if " " not in s:
        return False
    if s.startswith("(") and s.endswith(")"):
        return False
    if not s[0].isupper():
        return False
    return True


def is_verse_blockquote(lines: list[str]) -> bool:
    if not lines:
        return False
    last = lines[-1].strip()
    if not ENDS_WITH_VERSE_RE.search(last):
        return False
    for ln in lines[:-1]:
        if "." in ln:
            return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--title", default=None)
    args = parser.parse_args()

    raw = extract_text(args.pdf)
    cleaned = clean(raw)
    lines = cleaned.split("\n")

    out_lines: list[str] = []
    if args.title:
        out_lines.append(f"# {args.title}")
        out_lines.append("")

    blocks: list[tuple[str, list[str]]] = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            i += 1
            continue

        # Collect this run of non-blank lines.
        run: list[str] = []
        while i < len(lines) and lines[i].strip():
            run.append(lines[i])
            i += 1

        # Drop the article title and byline (first two non-blank lines).
        if not blocks:
            # We expect: title, author, subhead. Drop title and author.
            # First non-blank line(s) consumed: drop them, then treat the
            # third as a subhead.
            if len(run) == 1:
                # title only — drop
                continue
            if len(run) == 2:
                # title + author only — drop both, nothing else
                continue
            # title + author + subhead (or more)
            subhead_line = run[2]
            if looks_like_subhead(subhead_line):
                blocks.append(("h2", [subhead_line]))
                # Anything after the subhead on the same paragraph-run becomes
                # body. Split off the rest.
                if len(run) > 3:
                    rest = run[3:]
                    if is_verse_blockquote(rest):
                        blocks.append(("bq", rest))
                    else:
                        blocks.append(("p", rest))
            continue

        if len(run) == 1 and looks_like_subhead(run[0]):
            blocks.append(("h2", run))
        elif is_verse_blockquote(run):
            blocks.append(("bq", run))
        else:
            blocks.append(("p", run))

    for kind, content in blocks:
        if kind == "h2":
            out_lines.append(f"## {content[0].strip()}")
            out_lines.append("")
        elif kind == "bq":
            for ln in content:
                out_lines.append(f"> {ln.strip()}")
            out_lines.append("")
        else:
            joined = " ".join(line.strip() for line in content)
            out_lines.append(joined)
            out_lines.append("")

    while out_lines and out_lines[-1] == "":
        out_lines.pop()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(out_lines) + "\n")
    print(f"wrote {args.out} ({args.out.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
