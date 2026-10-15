// Turns a HandoutModel into flow blocks for the printable handout. Pure: no state, no effects.
import type { CSSProperties, ReactNode } from "react";
import { Siren } from "lucide-react";
import { StatusTag } from "../../components/StatusTag";
import type { FlowBlock } from "./paginate";
import type { HandoutItem, HandoutMedicine, HandoutModel } from "./model";

export interface HandoutBlock extends Omit<FlowBlock, "height" | "continuationHeight"> {
  key: string;
  node: ReactNode;
}

type Select = ((id: string) => void) | undefined;

function UnsureTag({ id, onSelectItem }: { id: string; onSelectItem: Select }) {
  return (
    <button type="button" className="preview-only unsure-tag" onClick={() => onSelectItem?.(id)}>
      <StatusTag tone="warning">Bitte prüfen</StatusTag>
    </button>
  );
}

function Section({ marker, title, children }: { marker: string; title: string; children?: ReactNode }) {
  return (
    <section className="h-block">
      <div className="h-section">
        <span className="h-marker">{marker}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ItemRows({ items, onSelectItem }: { items: HandoutItem[]; onSelectItem: Select }) {
  return (
    <ul className="h-rows">
      {items.map((it) => (
        <li key={it.id} className={it.lowConfidence ? "h-row is-unsure" : "h-row"}>
          <strong>{it.title}</strong>
          {it.value && <span className="mono"> {it.value}</span>}
          {it.lowConfidence && <UnsureTag id={it.id} onSelectItem={onSelectItem} />}
          {it.text && <div>{it.text}</div>}
        </li>
      ))}
    </ul>
  );
}

const slotsStyle = (model: HandoutModel) => ({ "--slots": model.slots.length }) as CSSProperties;

function MedColumns({ model }: { model: HandoutModel }) {
  const { t } = model;
  return (
    <div className="med-row med-head" style={slotsStyle(model)}>
      <span>{t.medicine}</span>
      <span>{t.purpose}</span>
      {model.slots.map((s) => (
        <span key={s}>{t[s]}</span>
      ))}
    </div>
  );
}

function MedRow({ model, med, onSelectItem }: { model: HandoutModel; med: HandoutMedicine; onSelectItem: Select }) {
  const { t } = model;
  return (
    <div className={med.lowConfidence ? "med-row is-unsure" : "med-row"} style={slotsStyle(model)}>
      <div>
        <strong>{med.title}</strong>{" "}
        {med.tag && <StatusTag tone="neutral">{med.tag === "new" ? t.tagNew : t.tagChanged}</StatusTag>}
        {med.lowConfidence && <UnsureTag id={med.id} onSelectItem={onSelectItem} />}
        <div className="h-small">
          {t.boxName}: {med.boxName}
        </div>
      </div>
      <div>{med.purpose}</div>
      {model.slots.map((s) => (
        <div key={s}>
          {med.doses[s] && (
            <>
              <span className="mono">{med.doses[s]}</span>
              <span className="tick" aria-hidden="true" />
            </>
          )}
        </div>
      ))}
      {med.notes.length > 0 && <div className="med-notes">{med.notes.join(" · ")}</div>}
    </div>
  );
}

export function continuationHeader(model: HandoutModel, group: string): ReactNode {
  if (group !== "meds") return null;
  return (
    <div className="h-block">
      <h2>
        {model.t.medicines} ({model.t.continued})
      </h2>
      <MedColumns model={model} />
    </div>
  );
}

export function buildBlocks(model: HandoutModel, onSelectItem?: (id: string) => void): HandoutBlock[] {
  const { t } = model;
  const blocks: HandoutBlock[] = [];
  let n = 0;
  const marker = () => String(++n).padStart(2, "0");

  blocks.push({
    key: "header",
    node: (
      <header className="h-header">
        {model.hospital && <div className="h-hospital">{model.hospital}</div>}
        <div className="h-small h-muted">{t.madeWith}</div>
        <p>
          {t.name} <span className="write-in" />
        </p>
        <p>
          {t.admitted} <span className="write-in" /> {t.discharged} <span className="write-in" />
        </p>
      </header>
    ),
  });
  blocks.push({ key: "title1", node: <h1>{t.title1}</h1> });
  blocks.push({
    key: "why",
    node: (
      <Section marker={marker()} title={t.why}>
        <p>{model.summary}</p>
        {model.diagnoses.length > 0 && <ItemRows items={model.diagnoses} onSelectItem={onSelectItem} />}
      </Section>
    ),
  });
  if (model.actions.length) {
    blocks.push({
      key: "actions",
      node: (
        <Section marker={marker()} title={t.actions}>
          <ol>
            {model.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </Section>
      ),
    });
  }
  if (model.medicines.length) {
    blocks.push({
      key: "meds-head",
      keepWithNext: true,
      group: "meds",
      node: (
        <Section marker={marker()} title={t.medicines}>
          <MedColumns model={model} />
        </Section>
      ),
    });
    for (const med of model.medicines) {
      blocks.push({ key: `med-${med.id}`, group: "meds", node: <MedRow model={model} med={med} onSelectItem={onSelectItem} /> });
    }
  }
  if (model.stopped.length) {
    blocks.push({
      key: "stopped",
      node: (
        <Section marker={marker()} title={t.stopTaking}>
          <ul className="h-rows">
            {model.stopped.map((m) => (
              <li key={m.id} className={m.lowConfidence ? "h-row is-unsure" : "h-row"}>
                <strong>{m.title}</strong> <span className="h-small">({m.boxName})</span>
                {m.lowConfidence && <UnsureTag id={m.id} onSelectItem={onSelectItem} />}
                {m.notes.length > 0 && <div className="h-small">{m.notes.join(" · ")}</div>}
              </li>
            ))}
          </ul>
        </Section>
      ),
    });
  }
  blocks.push({
    key: "help",
    breakBefore: true,
    node: (
      <div>
        <h1>{t.title2}</h1>
        <Section marker={marker()} title={t.help}>
          <div className="emergency">
            <Siren aria-hidden="true" size="1.4em" />
            <strong>{t.emergencyTitle}</strong>
            <span className="emergency-text">{t.emergencyText}</span>
            <span className="label">{t.generalAdvice}</span>
          </div>
          {model.warningSigns.length > 0 ? (
            <ItemRows items={model.warningSigns} onSelectItem={onSelectItem} />
          ) : (
            <p>{t.noWarningSigns}</p>
          )}
        </Section>
      </div>
    ),
  });
  const optional: [string, string, HandoutItem[]][] = [
    ["checkup", t.checkup, model.checkups],
    ["instructions", t.instructions, model.instructions],
    ["contacts", t.contacts, model.contacts],
  ];
  for (const [key, title, items] of optional) {
    if (!items.length) continue;
    blocks.push({
      key,
      node: (
        <Section marker={marker()} title={title}>
          <ItemRows items={items} onSelectItem={onSelectItem} />
        </Section>
      ),
    });
  }
  blocks.push({
    key: "footer",
    node: (
      <footer className="h-block h-footer">
        <p>
          {t.discussedWith} <span className="write-in" /> {t.date} <span className="write-in short" />
        </p>
        <p className="h-small">{t.disclaimer}</p>
      </footer>
    ),
  });
  return blocks;
}
