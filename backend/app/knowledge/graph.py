"""Knowledge graph of document classes, legal bases, rules and help resources.

Nodes (prefixed by type):  class:*, legal:*, kind:*, resource:*, rule:*
Edges (attribute `rel`):
    class  --is_a-->       class      ontology hierarchy (multiple parents allowed)
    rule   --applies_to--> class      rule holds for that class and all descendants
    rule   --based_on-->   legal      statutory basis of the rule
    rule   --concerns-->   kind       item kind the rule checks
    rule   --refers_to-->  resource   where to get help (escalation rules)

The JSON files are the source of truth; this module only loads, validates and queries them.
"""

import json
import re
from functools import lru_cache
from pathlib import Path

import networkx as nx

from ..schemas.harness import DocumentClassInfo
from .models import DocClass, LegalBasis, Ontology, ResourceDef, Rule, RuleSet

KNOWLEDGE_DIR = Path(__file__).resolve().parent


class KnowledgeError(ValueError):
    pass


def _n(kind: str, id_: str) -> str:
    return f"{kind}:{id_}"


class KnowledgeGraph:
    def __init__(self, ontology: Ontology, ruleset: RuleSet):
        self.ontology = ontology
        self.rules = ruleset.rules
        self.root = ontology.root
        g = nx.DiGraph()

        for c in ontology.classes:
            g.add_node(_n("class", c.id), type="class", data=c)
        for lb in ontology.legal_bases:
            g.add_node(_n("legal", lb.id), type="legal", data=lb)
        for k in ontology.item_kinds:
            g.add_node(_n("kind", k.id.value), type="kind", data=k)
        for r in ontology.resources:
            g.add_node(_n("resource", r.id), type="resource", data=r)

        def require(node: str, where: str) -> str:
            if node not in g:
                raise KnowledgeError(f"{where} references unknown node '{node}'")
            return node

        for c in ontology.classes:
            for p in c.parents:
                g.add_edge(_n("class", c.id), require(_n("class", p), f"class {c.id}"), rel="is_a")

        for rule in self.rules:
            rn = _n("rule", rule.id)
            if rn in g:
                raise KnowledgeError(f"duplicate rule id '{rule.id}'")
            g.add_node(rn, type="rule", data=rule)
            g.add_edge(rn, require(_n("class", rule.applies_to), f"rule {rule.id}"), rel="applies_to")
            if rule.legal_basis:
                g.add_edge(rn, require(_n("legal", rule.legal_basis), f"rule {rule.id}"), rel="based_on")
            if kind := getattr(rule, "item_kind", None):
                g.add_edge(rn, require(_n("kind", kind.value), f"rule {rule.id}"), rel="concerns")
            for res in getattr(rule, "resources", []):
                g.add_edge(rn, require(_n("resource", res), f"rule {rule.id}"), rel="refers_to")
            if pattern := getattr(rule, "pattern", None):
                try:
                    re.compile(pattern)
                except re.error as e:
                    raise KnowledgeError(f"rule {rule.id}: invalid pattern: {e}") from None

        isa = g.edge_subgraph([(u, v) for u, v, d in g.edges(data=True) if d["rel"] == "is_a"])
        if not nx.is_directed_acyclic_graph(isa):
            raise KnowledgeError("class hierarchy contains a cycle")
        if _n("class", self.root) not in g:
            raise KnowledgeError(f"root class '{self.root}' is not defined")
        self.graph = g

    # ------------------------------------------------------------------ queries
    def has_class(self, class_id: str) -> bool:
        return _n("class", class_id) in self.graph

    def doc_class(self, class_id: str) -> DocClass:
        return self.graph.nodes[_n("class", class_id)]["data"]

    def legal(self, legal_id: str) -> LegalBasis:
        return self.graph.nodes[_n("legal", legal_id)]["data"]

    def resource(self, resource_id: str) -> ResourceDef:
        return self.graph.nodes[_n("resource", resource_id)]["data"]

    def lineage(self, class_id: str) -> list[str]:
        """The class and all its ancestors, most specific first (breadth-first)."""
        start = _n("class", class_id)
        order = [start]
        seen = {start}
        i = 0
        while i < len(order):
            for _, parent, d in self.graph.out_edges(order[i], data=True):
                if d["rel"] == "is_a" and parent not in seen:
                    seen.add(parent)
                    order.append(parent)
            i += 1
        return [n.split(":", 1)[1] for n in order]

    def rules_for(self, class_id: str) -> list[Rule]:
        """Rules attached to the class or any ancestor (inherited)."""
        out: list[Rule] = []
        for cls in self.lineage(class_id):
            for rule_node, _, d in self.graph.in_edges(_n("class", cls), data=True):
                if d["rel"] == "applies_to":
                    out.append(self.graph.nodes[rule_node]["data"])
        return out

    def has_attr(self, class_id: str, attr: str) -> bool:
        """True if the class or any ancestor sets `attr` truthy."""
        return any(self.doc_class(c).attrs.get(attr) for c in self.lineage(class_id))

    def classify(self, text: str, model_choice: str | None) -> DocumentClassInfo:
        """Use the model's class if it is a known id; otherwise score keywords."""
        if model_choice and model_choice != "unknown" and self.has_class(model_choice):
            cid, source = model_choice, "model"
        else:
            lowered = text.lower()
            best: tuple[int, int, str] | None = None
            for c in self.ontology.classes:
                hits = sum(1 for kw in c.keywords if kw in lowered)
                if hits:
                    # More hits wins; ties go to the more specific (deeper) class.
                    score = (hits, len(self.lineage(c.id)), c.id)
                    best = max(best, score) if best else score
            cid, source = (best[2], "keywords") if best else (self.root, "unknown")
        return DocumentClassInfo(
            id=cid,
            label=self.doc_class(cid).label,
            lineage=self.lineage(cid),
            source=source,
        )

    def prompt_catalog(self) -> str:
        """Class list injected into the system prompt so the model classifies into the ontology."""
        lines = [f"- {c.id}: {c.label}" for c in self.ontology.classes if c.id != self.root]
        return "\n".join(lines)

    def to_json(self) -> dict:
        """Node-link JSON for inspection/visualisation (GET /api/knowledge)."""
        g = nx.DiGraph()
        for n, d in self.graph.nodes(data=True):
            g.add_node(n, node_type=d["type"], attributes=d["data"].model_dump(mode="json", exclude={"comment"}))
        g.add_edges_from(self.graph.edges(data=True))
        return nx.node_link_data(g, edges="edges")


@lru_cache
def load_knowledge(name: str) -> KnowledgeGraph:
    folder = KNOWLEDGE_DIR / name
    ontology = Ontology.model_validate(json.loads((folder / "ontology.json").read_text(encoding="utf-8")))
    ruleset = RuleSet.model_validate(json.loads((folder / "rules.json").read_text(encoding="utf-8")))
    return KnowledgeGraph(ontology, ruleset)
