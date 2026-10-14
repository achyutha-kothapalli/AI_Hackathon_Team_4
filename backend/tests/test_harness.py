"""Accuracy & safety harness: knowledge graph, text helpers, checks, benchmark."""

import json
from datetime import date
from pathlib import Path

import pytest

from app.domains import get_domain
from app.harness import run_harness, text
from app.knowledge import KnowledgeError, KnowledgeGraph
from app.knowledge.models import Ontology, RuleSet
from app.schemas.analysis import AnalysisResult
from evaluation import benchmark

CASES = Path(__file__).resolve().parents[1] / "evaluation" / "cases"
KG = get_domain("german_letter").knowledge()


def case(name: str) -> AnalysisResult:
    return AnalysisResult.model_validate_json(
        (CASES / name / "reference_output.json").read_text(encoding="utf-8")
    )


# ------------------------------------------------------------------ knowledge graph
def test_knowledge_files_load_and_validate():
    assert KG.graph.number_of_nodes() > 40
    assert all(KG.has_class(c) for c in ("bussgeldbescheid", "inkasso", "mahnbescheid"))


def test_rules_are_inherited_through_the_ontology():
    lineage = KG.lineage("bussgeldbescheid")
    assert lineage[0] == "bussgeldbescheid" and lineage[-1] == "official_letter"
    assert "payment_demand" in lineage and "administrative_decision" in lineage
    ids = {r.id for r in KG.rules_for("bussgeldbescheid")}
    assert {"L-PERIOD-OWIG", "C-OBJECTION-DEADLINE", "C-PAYMENT-AMOUNT", "S-UNUSUAL-PAYMENT-METHOD"} <= ids
    assert "L-PERIOD-AO" not in ids  # tax rule must not leak into fines
    assert KG.has_attr("bussgeldbescheid", "is_authority") and not KG.has_attr("inkasso", "is_authority")


def test_classification_prefers_model_then_keywords():
    assert KG.classify("irrelevant", "steuerbescheid").source == "model"
    by_kw = KG.classify("Mahnbescheid des Mahngericht", "made-up-id")
    assert by_kw.id == "mahnbescheid" and by_kw.source == "keywords"
    assert KG.classify("hello", None).id == "official_letter"


def test_invalid_knowledge_is_rejected():
    folder = get_domain("german_letter").folder
    onto = json.loads((folder / "ontology.json").read_text(encoding="utf-8"))
    rules = json.loads((folder / "rules.json").read_text(encoding="utf-8"))
    rules["rules"][0]["applies_to"] = "no_such_class"
    with pytest.raises(KnowledgeError, match="no_such_class"):
        KnowledgeGraph(Ontology.model_validate(onto), RuleSet.model_validate(rules))
    onto["classes"][0]["parents"] = ["bussgeldbescheid"]  # root -> descendant: cycle
    with pytest.raises(KnowledgeError, match="cycle"):
        KnowledgeGraph(Ontology.model_validate(onto), RuleSet.model_validate({"version": "1", "rules": []}))


def test_knowledge_endpoint_payload_is_json():
    data = KG.to_json()
    json.dumps(data)
    assert any(e["rel"] == "applies_to" for e in data["edges"])


# ------------------------------------------------------------------ text helpers
def test_text_helpers():
    assert text.numbers("innerhalb von zwei Wochen") == {2}
    assert {2, 11, 2026} <= text.numbers("2. November 2026")
    assert 1234.56 in text.amounts("Betrag: 1.234,56 EUR") and 98.5 in text.amounts("98,50 EUR")
    assert date(2026, 11, 2) in text.dates("bis spätestens 02.11.2026")
    assert date(2026, 11, 2) in text.dates("am 2. November 2026")
    assert text.find_ibans("IBAN DE29 1001 0010 0987 6543 21, Verwendungszweck") == ["DE29100100100987654321"]
    assert text.iban_valid("DE29100100100987654321") and not text.iban_valid("DE30100100100987654321")


# ------------------------------------------------------------------ harness on the sample letters
def test_genuine_letter_is_clean():
    report = run_harness(case("bussgeldbescheid"), KG)
    assert report.document_class.id == "bussgeldbescheid"
    assert report.summary.grounded_items == report.summary.total_items == 8
    assert report.summary.critical == report.summary.warnings == 0
    assert not report.scam_suspected
    assert report.escalation is not None  # mentions Erzwingungshaft -> point to help


def test_scam_letter_is_flagged():
    report = run_harness(case("scam_inkasso"), KG)
    assert report.scam_suspected
    assert any(f.rule_id == "S-UNUSUAL-PAYMENT-METHOD" for f in report.findings)
    assert {r.id for r in report.escalation.resources} >= {"verbraucherzentrale", "police"}


def test_injection_letter_is_flagged():
    report = run_harness(case("injection_hundesteuer"), KG)
    rules = {f.rule_id for f in report.findings}
    assert {"I-PROMPT-INJECTION", "S-FOREIGN-IBAN-AUTHORITY"} <= rules
    assert report.scam_suspected


def test_injection_detected_even_if_model_does_not_report_it():
    r = case("injection_hundesteuer")
    r.suspicious_instructions = None
    assert any(f.rule_id == "I-PROMPT-INJECTION" for f in run_harness(r, KG).findings)


def test_wrong_value_is_marked_ungrounded():
    r = case("bussgeldbescheid")
    r.key_items[0].value = "89,50 EUR"
    report = run_harness(r, KG)
    assert not report.item_checks["k0"].grounded
    assert "value_not_in_quote" in report.item_checks["k0"].issues


def test_low_confidence_and_poor_image_warn():
    r = case("bussgeldbescheid")
    r.image_quality = "poor"
    r.key_items[1].confidence = "low"
    ids = {f.rule_id for f in run_harness(r, KG).findings}
    assert {"Q-POOR-IMAGE", "Q-LOW-CONFIDENCE"} <= ids


# ------------------------------------------------------------------ benchmark gate
def test_fault_injection_benchmark_catches_everything_without_false_alarms():
    result = benchmark.run()
    assert result["false_alarms"] == []
    assert result["misses"] == [], result["misses"]
    assert result["caught"] == result["total"] > 50
