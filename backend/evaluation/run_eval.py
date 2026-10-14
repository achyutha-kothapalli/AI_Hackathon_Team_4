"""End-to-end evaluation against a real model (costs API credits).

    python -m evaluation.run_eval                       # uses ANALYZER from .env
    python -m evaluation.run_eval --analyzer reference  # free sanity check with the correct answers
    python -m evaluation.run_eval --analyzer claude --cases scam_inkasso

For every case in evaluation/cases/ it sends page_*.png to the analyzer, runs the
harness, and scores against expected.json:

  recall      ("nothing lost")      expected facts that the model extracted
  invented    ("nothing invented")  extracted facts whose quote or numbers are not in the true letter text
  caught      invented facts the harness flagged as ungrounded
  findings    expected safety findings (scam, injection, escalation) that fired
  false alarm critical scam/injection findings on a case that expects none

Add your own cases: a folder with page_0.png (page_1.png, ...) and expected.json.
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from app.analyzers import AnalysisRequest, PageImage, create_analyzer
from app.config import Settings
from app.harness import run_harness
from app.harness import text
from app.knowledge import load_knowledge
from app.profiles import get_profile
from app.schemas.analysis import AnalysisResult, KeyItem
from app.schemas.harness import Severity
from app.services.analysis_service import sniff_image_type

CASES = Path(__file__).resolve().parent / "cases"
RESULTS = Path(__file__).resolve().parent / "results"


def matches(expected: dict, item: KeyItem) -> bool:
    if item.kind.value != expected["kind"]:
        return False
    got = text.alnum(item.value + " " + item.source_quote)
    want_value, want_quote = text.alnum(expected["value"]), text.alnum(expected["quote"])
    return (want_value and want_value in got) or (want_quote and (want_quote in got or text.alnum(item.source_quote) in want_quote))


def invented(item: KeyItem, truth: str) -> bool:
    quote_ok = text.alnum(item.source_quote) and text.alnum(item.source_quote) in text.alnum(truth)
    numbers_ok = text.numbers(item.value) <= text.numbers(truth)
    return not (quote_ok and numbers_ok)


async def analyze(folder: Path, analyzer_name: str, target_language: str) -> AnalysisResult:
    if analyzer_name == "reference":
        return AnalysisResult.model_validate_json((folder / "reference_output.json").read_text(encoding="utf-8"))
    pages = []
    for p in sorted(folder.glob("page_*.*")):
        data = p.read_bytes()
        pages.append(PageImage(data=data, media_type=sniff_image_type(data) or "image/png"))
    os.environ["ANALYZER"] = analyzer_name
    analyzer = create_analyzer(Settings())
    return await analyzer.analyze(
        AnalysisRequest(pages=pages, profile=get_profile("german_letter"), target_language=target_language)
    )


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--analyzer", default=None, help="claude | trustedtokens | reference (default: from settings)")
    ap.add_argument("--cases", nargs="*", help="case folder names (default: all)")
    ap.add_argument("--language", default="English")
    args = ap.parse_args()
    analyzer_name = args.analyzer or Settings().analyzer
    if analyzer_name == "mock":
        sys.exit("The mock analyzer always returns the same answer; use --analyzer reference, claude or trustedtokens.")

    kg = load_knowledge("german_letters")
    rows, totals = [], {"expected": 0, "found": 0, "extracted": 0, "invented": 0, "caught": 0, "findings": 0, "findings_ok": 0, "false_alarms": 0}
    for folder in sorted(p for p in CASES.iterdir() if p.is_dir()):
        if args.cases and folder.name not in args.cases:
            continue
        expected = json.loads((folder / "expected.json").read_text(encoding="utf-8"))
        print(f"→ {folder.name} …", flush=True)
        result = await analyze(folder, analyzer_name, args.language)
        report = run_harness(result, kg)

        found = sum(1 for e in expected["expected_items"] if any(matches(e, i) for i in result.key_items))
        inv = [i for i in result.key_items if invented(i, expected["transcript"])]
        caught = sum(1 for i in inv if not report.item_checks[i.id].grounded)
        fired = {f.category.value for f in report.findings}
        f_ok = sum(1 for c in expected["expected_findings"] if c in fired)
        false_alarms = sum(
            1 for f in report.findings
            if f.severity == Severity.critical and f.category.value in ("scam", "injection")
            and f.category.value not in expected["expected_findings"]
        )
        row = {
            "case": folder.name,
            "class": f"{report.document_class.id} ({'✓' if report.document_class.id == expected['expected_class'] else '✗ expected ' + expected['expected_class']})",
            "recall": f"{found}/{len(expected['expected_items'])}",
            "invented": f"{len(inv)}/{len(result.key_items)}",
            "caught": f"{caught}/{len(inv)}" if inv else "–",
            "findings": f"{f_ok}/{len(expected['expected_findings'])}",
            "false_alarms": false_alarms,
        }
        rows.append(row)
        for k, v in (("expected", len(expected["expected_items"])), ("found", found), ("extracted", len(result.key_items)),
                     ("invented", len(inv)), ("caught", caught), ("findings", len(expected["expected_findings"])),
                     ("findings_ok", f_ok), ("false_alarms", false_alarms)):
            totals[k] += v

    t = totals
    md = [
        f"# Evaluation — analyzer `{analyzer_name}` — {datetime.now():%Y-%m-%d %H:%M}",
        "",
        f"- **Nothing lost (recall):** {t['found']}/{t['expected']} expected facts extracted "
        f"({100 * t['found'] / max(t['expected'], 1):.0f}%)",
        f"- **Nothing invented:** {t['invented']} of {t['extracted']} extracted facts not traceable to the letter; "
        f"harness flagged {t['caught']} of them",
        f"- **Safeguards:** {t['findings_ok']}/{t['findings']} expected safety findings fired; "
        f"{t['false_alarms']} false scam/injection alarms",
        "",
        "| Case | Class | Recall | Invented | Caught by harness | Expected findings | False alarms |",
        "|---|---|---|---|---|---|---|",
    ] + [f"| {r['case']} | {r['class']} | {r['recall']} | {r['invented']} | {r['caught']} | {r['findings']} | {r['false_alarms']} |" for r in rows]
    report_md = "\n".join(md) + "\n"
    RESULTS.mkdir(exist_ok=True)
    out = RESULTS / f"eval_{analyzer_name}_{datetime.now():%Y%m%d_%H%M}.md"
    out.write_text(report_md, encoding="utf-8")
    print("\n" + report_md + f"\nSaved to {out.relative_to(CASES.parent.parent)}")


if __name__ == "__main__":
    asyncio.run(main())
