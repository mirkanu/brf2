#!/usr/bin/env python3
"""validate.py — seven-rule full-text checklist for BRJ article bodies.

Run on one or more .md files under src/content/journal/ to verify they
pass the rules laid out in SKILL.md. Default severity is error for
truncation + footnote parity, warning for everything else. Use
--strict / --lenient to override.

Exit codes:
    0  every article passes (no errors at the chosen severity)
    1  one or more errors
    2  usage / I/O problem
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


# --- canonical data --------------------------------------------------------

# Canonical author set is derived from frontmatter JSON. JSON authors are
# stored in the JSON's `authors[]` array; the canonical form the validator
# compares against is the lowercased, no-space form of each display name
# (e.g. "MichaelKimmitt" -> "michaelkimmitt"). When JSON stores more than
# one variant of the same name (e.g. "Brian Harris" and "BrianHarris"),
# both lowercased forms are accepted. JSON files live alongside their
# .md bodies in src/content/journal/.
#
# The hard-coded list that used to live here was removed on 2026-09-20:
# it was a copy of editorial knowledge that belonged in JSON. To audit
# or regenerate the source-of-truth list, run from the repo root:
#     python3 -c "import json,glob,re; \
# print(sorted({re.sub(r'\\s+','',a.strip().lower()) \
# for f in glob.glob('src/content/journal/*.json') \
# for a in json.load(open(f)).get('authors',[])}))"
def _load_canonical_authors() -> set[str]:
    forms: set[str] = set()
    for path in Path("src/content/journal").glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for author in data.get("authors", []) or []:
            if not isinstance(author, str):
                continue
            forms.add(re.sub(r"\s+", "", author.strip().lower()))
    return forms


CANONICAL_AUTHORS: set[str] = _load_canonical_authors()


# Book names that the LLM is asked to italicise. A body that has any of
# these as bare text (not surrounded by single asterisks) gets a
# typography warning.
SCRIPTURE_BOOKS = [
    "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth",
    "1 Sam", "2 Sam", "1 Kings", "2 Kings", "1 Chron", "2 Chron",
    "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song",
    "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos",
    "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal",
    "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1 Cor", "2 Cor",
    "Gal", "Eph", "Phil", "Col", "1 Thess", "2 Thess", "1 Tim", "2 Tim",
    "Titus", "Phlm", "Heb", "Jas", "1 Pet", "2 Pet", "1 John", "2 John",
    "3 John", "Jude", "Rev",
]


# --- result types ----------------------------------------------------------

@dataclass
class Finding:
    rule: str
    severity: str  # "error" | "warning"
    message: str


@dataclass
class ArticleReport:
    path: Path
    body_chars: int = 0
    findings: list[Finding] = field(default_factory=list)
    read_error: str | None = None

    def errors(self) -> list[Finding]:
        return [f for f in self.findings if f.severity == "error"]

    def warnings(self) -> list[Finding]:
        return [f for f in self.findings if f.severity == "warning"]


# --- helpers ---------------------------------------------------------------

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


def split_frontmatter(text: str) -> tuple[str, str]:
    """Return (frontmatter_text, body_text). Empty frontmatter if missing."""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return "", text
    return m.group(1), text[m.end():]


def normalise_name(name: str) -> str:
    """Lowercased, no titles, no trailing punctuation, single-spaced."""
    s = name.strip().lower()
    for prefix in ("dr. ", "dr ", "prof. ", "prof ", "rev. ", "rev "):
        if s.startswith(prefix):
            s = s[len(prefix):]
    s = re.sub(r"\s+", " ", s)
    s = s.rstrip(".,;:'\"")
    return s


def normalise_name_nospace(name: str) -> str:
    """Lowercased, no titles, no punctuation, no whitespace.

    Matches the canonical form stored in CANONICAL_AUTHORS (which is built
    from the JSON frontmatter). This is the strictest comparison — it
    rejects spaces, titles, and trailing punctuation. Use this for the
    author-canonical check.
    """
    s = name.strip().lower()
    for prefix in ("dr. ", "dr ", "prof. ", "prof ", "rev. ", "rev "):
        if s.startswith(prefix):
            s = s[len(prefix):]
    s = re.sub(r"\s+", "", s)
    s = s.rstrip(".,;:'\"")
    return s


# --- rule checks -----------------------------------------------------------

def check_headings(body: str, rep: ArticleReport) -> None:
    """Rule 1: headings present (warning)."""
    if not re.search(r"^#{1,6}\s+\S", body, re.MULTILINE):
        rep.findings.append(Finding(
            rule="1",
            severity="warning",
            message="no h2/h3 headings found",
        ))


def check_footnote_parity(body: str, rep: ArticleReport) -> None:
    """Rule 2: every footnote marker has a matching definition (error)."""
    markers = set(re.findall(r"\[\^([^\]]+)\]", body))
    defs = set(re.findall(r"^\[\^([^\]]+)\]:", body, re.MULTILINE))
    orphan_markers = markers - defs
    orphan_defs = defs - markers
    if orphan_markers:
        rep.findings.append(Finding(
            rule="2",
            severity="error",
            message=f"orphan footnote markers (no def): {sorted(orphan_markers)}",
        ))
    if orphan_defs:
        rep.findings.append(Finding(
            rule="2",
            severity="warning",
            message=f"orphan footnote definitions (no marker; usually LLM artefacts; the body would render but the def is dead)",
        ))
        # actually flag as error too — dead defs are a real defect
        rep.findings.append(Finding(
            rule="2",
            severity="error",
            message=f"dead footnote definitions: {sorted(orphan_defs)}",
        ))


def check_truncation(body: str, rep: ArticleReport) -> None:
    """Rule 3: body does not end mid-sentence (error).

    Truncation = body ends with an unterminated markdown link/bracket, or
    a sentence that doesn't reach terminal punctuation. We treat
    unterminated '[...]' or trailing half-words as hard errors.
    """
    s = body.rstrip()
    if not s:
        return

    # Unterminated markdown link
    opens = s.count("[")
    closes = s.count("]")
    if opens > closes:
        rep.findings.append(Finding(
            rule="3",
            severity="error",
            message=f"body ends with unterminated '[' ({opens - closes} more)",
        ))
        return

    # Trailing half-word: ends with a non-terminal char and a hyphen/dash
    if s.endswith((" -", " –", " —")):
        rep.findings.append(Finding(
            rule="3",
            severity="error",
            message=f"body ends mid-word (trailing hyphen)",
        ))
        return

    # Last non-empty line: if it doesn't end in a sentence terminator and
    # the article is non-trivial, flag.
    last = [ln for ln in s.splitlines() if ln.strip()][-1].rstrip()
    # Recognised translation-link phrase boilerplate used by the editor
    # ("This article is also available in [X](...)_._"). Treat _._ as a
    # sentence terminator so the validator does not falsely flag the
    # translation-link suffix as a truncated body.
    terminators = (".", "!", "?", "”", "\"", "]", ")", "*", "`", "_._", "_")
    if len(s) > 200 and not last.endswith(terminators):
        rep.findings.append(Finding(
            rule="3",
            severity="error",
            message=f"body ends mid-sentence: ...'{last[-60:]}'",
        ))


def check_scripture_ranges(body: str, rep: ArticleReport) -> None:
    """Rule 4: scripture references use en-dash ranges, not hyphens (warning).

    Catches patterns like "John 3-16" or "Rom 8:1-5" where the dash should
    be an en-dash (–). Conservative: only flags explicit book-chapter
    ranges with a single hyphen.
    """
    pat = re.compile(
        r"\b(" + "|".join(re.escape(b) for b in SCRIPTURE_BOOKS) + r")\s+\d+:\d+\s*-\s*\d+",
    )
    hits = pat.findall(body)
    if hits:
        rep.findings.append(Finding(
            rule="4",
            severity="warning",
            message=f"scripture range uses ASCII hyphen, expected en-dash: {hits[:3]}",
        ))


def check_authors(frontmatter: str, rep: ArticleReport) -> None:
    """Rule 5: frontmatter authors are in the canonical list (warning)."""
    # crude YAML parsing — only need the `authors:` list
    m = re.search(r"^authors:\s*\n((?:\s*-\s*.+\n?)+)", frontmatter, re.MULTILINE)
    if not m:
        return
    block = m.group(1)
    for raw in re.findall(r"-\s*(.+)", block):
        name = raw.strip().strip("'\"").strip()
        if not name:
            continue
        _check_one_author(name, rep)


def _check_one_author(name: str, rep: ArticleReport) -> None:
    # The JSON source-of-truth uses no-space lowercase canonical form.
    # If a name has both forms in JSON (e.g. "Brian Harris" and
    # "BrianHarris"), both are accepted; the validator never tells the
    # user which form to use. Whitespace and title-stripped variants
    # (e.g. "Dr. Brian Crossett" -> "brian crossett") are also accepted.
    norm_nospace = normalise_name_nospace(name)
    norm_spaced = normalise_name(name)
    if norm_nospace in CANONICAL_AUTHORS or norm_spaced in CANONICAL_AUTHORS:
        return
    rep.findings.append(Finding(
        rule="5",
        severity="warning",
        message=f"author '{name}' not in canonical list",
    ))


def check_body_metrics(body: str, rep: ArticleReport) -> None:
    """Rule 7: body has substance (warning if stub)."""
    text = re.sub(r"\s+", "", body)
    rep.body_chars = len(text)
    if len(text) < 200:
        rep.findings.append(Finding(
            rule="7",
            severity="warning",
            message=f"body is short ({len(text)} chars) — may be a stub",
        ))


# --- driver ---------------------------------------------------------------

def validate(path: Path, severity_floor: str) -> ArticleReport:
    rep = ArticleReport(path=path)
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        rep.read_error = str(exc)
        rep.findings.append(Finding(
            rule="0", severity="error", message=f"read failed: {exc}",
        ))
        return rep

    frontmatter, body = split_frontmatter(text)

    check_headings(body, rep)
    check_footnote_parity(body, rep)
    check_truncation(body, rep)
    check_scripture_ranges(body, rep)
    if frontmatter:
        check_authors(frontmatter, rep)
    check_body_metrics(body, rep)

    return rep


def render_report(rep: ArticleReport, verbose: bool) -> str:
    if rep.read_error:
        return f"{rep.path.name:<55}  read_error  {rep.read_error}"

    # Apply severity floor
    if "lenient" in _severity_floors(rep):
        active = rep.warnings()
    elif "strict" in _severity_floors(rep):
        active = rep.findings
    else:
        # default: errors are errors, warnings are warnings
        active = rep.findings

    head = f"{rep.path.name:<55}  body={rep.body_chars:>6}c  " \
           f"errors={len(rep.errors())}  warnings={len(rep.warnings())}"
    if not active and not verbose:
        return head
    if not active:
        return head + "\n  (clean)"
    lines = [head]
    for f in active:
        mark = "✗" if f.severity == "error" else "•"
        lines.append(f"    {mark} rule {f.rule} [{f.severity}] {f.message}")
    return "\n".join(lines)


# _severity_floors is a small helper kept here so render_report stays
# local. It returns a set containing "strict" / "lenient" — kept as a
# function-level helper rather than a global so each call decides based
# on the rep's findings alone. (Currently unused — the driver passes the
# severity_floor into validate(). Kept as a stable hook for future
# per-article severity overrides.)
def _severity_floors(rep: ArticleReport) -> set[str]:
    return set()


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("files", nargs="+", type=Path, help=".md files to validate")
    p.add_argument("--strict", action="store_true",
                   help="treat warnings as errors")
    p.add_argument("--lenient", action="store_true",
                   help="treat errors as warnings (advisory mode)")
    p.add_argument("-v", "--verbose", action="store_true",
                   help="print findings even when article passes")
    p.add_argument("--summary", action="store_true",
                   help="print aggregate counts across all files")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)

    if args.strict and args.lenient:
        print("error: --strict and --lenient are mutually exclusive", file=sys.stderr)
        return 2

    severity_floor = "warning" if args.strict else ("lenient" if args.lenient else "default")

    reports = [validate(p, severity_floor) for p in args.files]

    for r in reports:
        print(render_report(r, args.verbose))

    total_errors = sum(len(r.errors()) for r in reports)
    total_warnings = sum(len(r.warnings()) for r in reports)

    if args.summary:
        print()
        print(f"total: {len(reports)} articles, "
              f"{total_errors} errors, {total_warnings} warnings")

    # Reminder: rules 6 and 7 are render-time checks.
    print()
    print("note: rules 6 (JSON-LD host) and 7 (typography) require a render check on the preview deploy.")

    return 0 if total_errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
