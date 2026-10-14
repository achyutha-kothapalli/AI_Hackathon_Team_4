"""Fault-injection benchmark for the accuracy & safety harness.

    python -m evaluation.benchmark            (from backend/)

For every evaluation case, takes the correct answer (reference_output.json),
applies each fault from faults.py, runs the harness and records whether the
fault was detected. Also checks the uncorrupted answers raise no false alarms.
Writes evaluation/results/benchmark.md.
"""

import json
from collections import defaultdict
from pathlib import Path

from app.domains import get_domain
from app.harness import run_harness
from app.schemas.analysis import AnalysisResult

from .faults import clean_false_alarms, generate

CASES = Path(__file__).resolve().parent / "cases"
RESULTS = Path(__file__).resolve().parent / "results"


def load_case(folder: Path) -> tuple[dict, AnalysisResult]:
    expected = json.loads((folder / "expected.json").read_text(encoding="utf-8"))
    result = AnalysisResult.model_validate_json(
        (folder / "reference_output.json").read_text(encoding="utf-8")
    )
    return expected, result


def run(domain: str = "german_letter") -> dict:
    kg = get_domain(domain).knowledge()
    by_type: dict[str, list[bool]] = defaultdict(list)
    misses: list[str] = []
    false_alarms: list[str] = []
    expected_findings_ok: list[str] = []

    for folder in sorted(p for p in CASES.iterdir() if p.is_dir()):
        expected, reference = load_case(folder)
        clean = run_harness(reference, kg)
        for fa in clean_false_alarms(clean, set(expected["expected_findings"])):
            false_alarms.append(f"{folder.name}: {fa}")
        fired = {f.category.value for f in clean.findings}
        for cat in expected["expected_findings"]:
            ok = cat in fired
            expected_findings_ok.append(f"{folder.name}: {cat} {'✓' if ok else '✗'}")
            by_type[f"expected finding: {cat}"].append(ok)

        for fault in generate(reference):
            hit = fault.detected(run_harness(fault.result, kg))
            by_type[fault.name].append(hit)
            if not hit:
                misses.append(f"{folder.name}: {fault.name} — {fault.target}")

    total = sum(len(v) for v in by_type.values())
    caught = sum(sum(v) for v in by_type.values())
    return {
        "by_type": {k: (sum(v), len(v)) for k, v in by_type.items()},
        "caught": caught,
        "total": total,
        "misses": misses,
        "false_alarms": false_alarms,
        "expected_findings": expected_findings_ok,
    }


def to_markdown(r: dict) -> str:
    lines = [
        "# Harness fault-injection benchmark",
        "",
        f"**Detected {r['caught']} of {r['total']} injected faults "
        f"({100 * r['caught'] / max(r['total'], 1):.0f}%). "
        f"False alarms on correct answers: {len(r['false_alarms'])}.**",
        "",
        "| Fault type | Detected | Rate |",
        "|---|---|---|",
    ]
    for name, (hit, n) in r["by_type"].items():
        lines.append(f"| {name} | {hit}/{n} | {100 * hit / n:.0f}% |")
    lines += ["", "## Not detected", ""] + ([f"- {m}" for m in r["misses"]] or ["- none"])
    lines += ["", "## False alarms on correct answers", ""] + (
        [f"- {f}" for f in r["false_alarms"]] or ["- none"]
    )
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    outcome = run()
    report = to_markdown(outcome)
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "benchmark.md").write_text(report, encoding="utf-8", newline="\n")
    print(report)
    # Non-zero exit makes CI fail if a fault slips through or a false alarm appears.
    raise SystemExit(1 if outcome["misses"] or outcome["false_alarms"] else 0)
