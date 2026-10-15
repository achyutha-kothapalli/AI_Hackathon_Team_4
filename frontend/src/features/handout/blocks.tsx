// Turns a HandoutModel into flow blocks for the printable handout. Pure: no state, no effects.
import type { CSSProperties, ReactNode } from "react";
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  CirclePlus,
  Moon,
  Phone,
  Pill,
  Siren,
  Sun,
  Sunrise,
  Sunset,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { StatusTag } from "../../components/StatusTag";
import type { FlowBlock } from "./paginate";
import {
  dayPlan,
  glance,
  type HandoutItem,
  type HandoutMedicine,
  type HandoutModel,
  type Slot,
  type SourceRef,
} from "./model";

export interface HandoutBlock extends Omit<FlowBlock, "height" | "continuationHeight"> {
  key: string;
  node: ReactNode;
}

type Select = ((id: string) => void) | undefined;

/** Ties a row to its highlight on the original. Read by the staff preview only; nothing changes in print. */
const link = (x: { id: string } & Partial<SourceRef>) => ({ "data-item": x.id, "data-ref": x.ref ?? undefined });
const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

const SLOT_ICON: Record<Slot, LucideIcon> = { morning: Sunrise, noon: Sun, evening: Sunset, night: Moon };

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
        <li key={it.id} className={cx("h-row", it.lowConfidence && "is-unsure", `tone-${it.tone}`)} {...link(it)}>
          <strong>{it.title}</strong>
          {it.lowConfidence && <UnsureTag id={it.id} onSelectItem={onSelectItem} />}
          {it.value && <div className="h-orig">{it.value}</div>}
          {it.text && <div>{it.text}</div>}
        </li>
      ))}
    </ul>
  );
}

function InfoCards({ items, icon: Icon, onSelectItem }: { items: HandoutItem[]; icon: LucideIcon; onSelectItem: Select }) {
  return (
    <ul className="info-cards">
      {items.map((it) => (
        <li key={it.id} className={cx("info-card", it.lowConfidence && "is-unsure", `tone-${it.tone}`)} {...link(it)}>
          <Icon aria-hidden="true" size="1.3em" />
          <div>
            <strong>{it.title}</strong>
            {it.lowConfidence && <UnsureTag id={it.id} onSelectItem={onSelectItem} />}
            {it.value && <div className="info-value">{it.value}</div>}
            {it.text && <div className="h-small">{it.text}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Glance({ model }: { model: HandoutModel }) {
  const { t } = model;
  const g = glance(model);
  const tiles: [LucideIcon, string, string][] = [
    [Pill, String(g.medicines), t.glanceMedicines],
    [CirclePlus, String(g.newOrChanged), t.glanceNewOrChanged],
    [Ban, String(g.stopped), t.glanceStopped],
  ];
  if (g.checkup) tiles.push([CalendarCheck, g.checkup, t.checkup]);
  return (
    <div className="h-block">
      <div className="glance" style={{ "--tiles": tiles.length } as CSSProperties}>
        {tiles.map(([Icon, value, label]) => (
          <div key={label} className="glance-tile">
            <Icon aria-hidden="true" size="1.3em" strokeWidth={1.75} />
            <span className={value.length > 3 ? "glance-value is-text" : "glance-value"}>{value}</span>
            <span className="glance-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyDay({ model, marker }: { model: HandoutModel; marker: string }) {
  const { t } = model;
  const plan = dayPlan(model);
  const columns = plan.slots.length + (plan.other.length ? 1 : 0);
  return (
    <Section marker={marker} title={t.myDay}>
      <p className="h-small h-hint">{t.dayHint}</p>
      <div className="day" style={{ "--cols": columns } as CSSProperties}>
        {plan.slots.map(({ slot, entries }) => {
          const Icon = SLOT_ICON[slot];
          return (
            <div key={slot} className="day-card">
              <div className="day-head">
                <Icon aria-hidden="true" size="1.2em" />
                {t[slot]}
              </div>
              <ul>
                {entries.map((e) => (
                  <li key={e.id} className={e.lowConfidence ? "is-unsure" : undefined} {...link({ id: e.id })}>
                    <span className="day-dose">{e.dose}</span>
                    <span>{e.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {plan.other.length > 0 && (
          <div className="day-card is-other">
            <div className="day-head">
              <CalendarClock aria-hidden="true" size="1.2em" />
              {t.otherTimes}
            </div>
            <ul>
              {plan.other.map((m) => (
                <li key={m.id} className={m.lowConfidence ? "is-unsure" : undefined} {...link({ id: m.id })}>
                  <span>
                    <strong>{m.title}</strong>
                    {m.notes.length > 0 && <span className="h-small day-note">{m.notes.join(" · ")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

const slotsStyle = (model: HandoutModel) => ({ "--slots": model.slots.length }) as CSSProperties;

function MedColumns({ model }: { model: HandoutModel }) {
  const { t } = model;
  return (
    <div className="med-row med-head" style={slotsStyle(model)}>
      <span>{t.medicine}</span>
      <span>{t.purpose}</span>
      {model.slots.map((s) => {
        const Icon = SLOT_ICON[s];
        return (
          <span key={s} className="med-slot">
            <Icon aria-hidden="true" size="1.1em" />
            {t[s]}
          </span>
        );
      })}
    </div>
  );
}

function MedRow({ model, med, onSelectItem }: { model: HandoutModel; med: HandoutMedicine; onSelectItem: Select }) {
  const { t } = model;
  return (
    <div
      className={cx("med-row", med.lowConfidence && "is-unsure", `tone-${med.tone}`)}
      style={slotsStyle(model)}
      {...link(med)}
    >
      <div>
        <strong>{med.title}</strong>{" "}
        {med.tag && <StatusTag tone="neutral">{med.tag === "new" ? t.tagNew : t.tagChanged}</StatusTag>}
        {med.lowConfidence && <UnsureTag id={med.id} onSelectItem={onSelectItem} />}
        <div className="h-small h-box">
          {t.boxName}: <span className="nowrap">{med.boxName}</span>
        </div>
      </div>
      <div className="med-for">{med.purpose}</div>
      {model.slots.map((s) => (
        <div key={s} className="med-dose">
          {med.doses[s] && (
            <>
              <span className="day-dose">{med.doses[s]}</span>
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
        <div className="h-brandbar">
          <span className="h-hospital">{model.hospital}</span>
          <span className="h-small">{t.madeWith}</span>
        </div>
        <h1>{t.title1}</h1>
        <div className="h-patient">
          <div className="h-field">
            {t.name}
            <span className="write-in" />
          </div>
          <div className="h-field">
            {t.admitted}
            <span className="write-in" />
          </div>
          <div className="h-field">
            {t.discharged}
            <span className="write-in" />
          </div>
        </div>
      </header>
    ),
  });
  blocks.push({ key: "glance", node: <Glance model={model} /> });
  blocks.push({
    key: "why",
    node: (
      <Section marker={marker()} title={t.why}>
        <p className="h-summary">{model.summary}</p>
        {model.diagnoses.length > 0 && <ItemRows items={model.diagnoses} onSelectItem={onSelectItem} />}
      </Section>
    ),
  });
  if (model.actions.length) {
    blocks.push({
      key: "actions",
      node: (
        <Section marker={marker()} title={t.actions}>
          <ol className="h-steps">
            {model.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </Section>
      ),
    });
  }
  if (model.medicines.length) {
    blocks.push({ key: "my-day", node: <MyDay model={model} marker={marker()} /> });
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
              <li
                key={m.id}
                className={cx("h-row is-stopped", m.lowConfidence && "is-unsure", `tone-${m.tone}`)}
                {...link(m)}
              >
                <Ban aria-hidden="true" size="1.2em" />
                <div>
                  <strong>{m.title}</strong> <span className="h-small">({m.boxName})</span>
                  {m.lowConfidence && <UnsureTag id={m.id} onSelectItem={onSelectItem} />}
                  {m.notes.length > 0 && <div className="h-small">{m.notes.join(" · ")}</div>}
                </div>
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
          <div className="tier tier-red">
            <Siren aria-hidden="true" size="1.6em" />
            <div>
              <strong className="tier-title">{t.emergencyTitle}</strong>
              <p>{t.emergencyText}</p>
              <span className="label">{t.generalAdvice}</span>
            </div>
          </div>
          <div className="tier tier-amber">
            <TriangleAlert aria-hidden="true" size="1.6em" />
            <div>
              <strong className="tier-title">{t.fromLetter}</strong>
              {model.warningSigns.length > 0 ? (
                <ItemRows items={model.warningSigns} onSelectItem={onSelectItem} />
              ) : (
                <p>{t.noWarningSigns}</p>
              )}
            </div>
          </div>
        </Section>
      </div>
    ),
  });
  if (model.checkups.length || model.contacts.length) {
    blocks.push({
      key: "visits",
      node: (
        <div className="h-cols">
          {model.checkups.length > 0 && (
            <Section marker={marker()} title={t.checkup}>
              <InfoCards items={model.checkups} icon={CalendarCheck} onSelectItem={onSelectItem} />
            </Section>
          )}
          {model.contacts.length > 0 && (
            <Section marker={marker()} title={t.contacts}>
              <InfoCards items={model.contacts} icon={Phone} onSelectItem={onSelectItem} />
            </Section>
          )}
        </div>
      ),
    });
  }
  if (model.instructions.length) {
    blocks.push({
      key: "instructions",
      node: (
        <Section marker={marker()} title={t.instructions}>
          <ItemRows items={model.instructions} onSelectItem={onSelectItem} />
        </Section>
      ),
    });
  }
  blocks.push({
    key: "footer",
    node: (
      <footer className="h-block h-footer">
        <div className="h-patient">
          <div className="h-field">
            {t.discussedWith}
            <span className="write-in" />
          </div>
          <div className="h-field">
            {t.date}
            <span className="write-in" />
          </div>
        </div>
        <p className="h-small">{t.disclaimer}</p>
      </footer>
    ),
  });
  return blocks;
}
