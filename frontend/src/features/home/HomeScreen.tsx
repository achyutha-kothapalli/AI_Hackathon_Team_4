import type { AnalyzeResponse } from "../../api/types";
import { Icon } from "../../ui/Icon";
import { useFileDrop } from "../upload/useFileDrop";
import { deadlinePill } from "../result/deadline";

interface Props {
  analyzer: string;
  lastResponse: AnalyzeResponse | null;
  onTakePhoto: () => void;
  onUpload: () => void;
  onDropFiles: (files: File[]) => void;
  onSamples: () => void;
  onContinue: () => void;
}

const PRIVACY: Record<string, string> = {
  trustedtokens: "Your letter is sent to an EU-hosted AI to be explained.",
  claude: "Your letter is sent to an AI service to be explained.",
  mock: "Demo mode: nothing is sent to an AI.",
};

export function HomeScreen({
  analyzer,
  lastResponse,
  onTakePhoto,
  onUpload,
  onDropFiles,
  onSamples,
  onContinue,
}: Props) {
  const drop = useFileDrop(onDropFiles);
  return (
    <main className={`screen home ${drop.dragging ? "is-dragging" : ""}`} {...drop.handlers}>
      {analyzer === "mock" && (
        <div className="note">
          <Icon name="info" />
          <span>Demo mode: the server has no AI key, so every letter returns a prepared sample analysis.</span>
        </div>
      )}

      <section className="hero">
        <p className="eyebrow">Make yourself understood. Start here.</p>
        <h1 className="h1">A little clarity. A lot less worry.</h1>
        <p className="muted">
          Your German letters, explained in your language. Understand what matters. Know what comes next.
        </p>
      </section>

      <div className="cta-stack">
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onTakePhoto}>
          <Icon name="camera" />
          Scan your letter
          <Icon name="next" className="trail flip-rtl" />
        </button>
        <button type="button" className="btn btn-secondary btn-lg btn-block" onClick={onUpload}>
          <Icon name="upload" />
          Upload PDF or image
        </button>
        <button type="button" className="btn btn-link" onClick={onSamples}>
          No letter handy? Try a sample
          <Icon name="arrowUpRight" className="flip-rtl" />
        </button>
      </div>

      <figure className="letter-preview">
        <figcaption className="preview-caption">
          From official to understandable <Icon name="arrowUpRight" className="flip-rtl" />
        </figcaption>
        <div className="preview-document" lang="de" dir="ltr">
          <div className="document-heading">
            <Icon name="landmark" />
            <strong>
              Finanzamt
              <br />
              Musterstadt
            </strong>
            <span>22.09.2026</span>
          </div>
          <div className="document-address">Finanzamt Musterstadt · Steuerstraße 12 · 12345 Musterstadt</div>
          <h2>
            Aufforderung zur Abgabe der
            <br />
            Einkommensteuererklärung 2025
          </h2>
          <p>Sehr geehrter Herr Beispiel,</p>
          <p>
            bitte übermitteln Sie Ihre Steuererklärung bis zum <mark>31.10.2026</mark> elektronisch über ELSTER.
          </p>
          <span className="document-stamp">Sample letter</span>
        </div>
        <div className="preview-explanation">
          <span className="explanation-label">
            <Icon name="checkCircle" />
            In plain language
          </span>
          <p>Your 2025 tax return is needed.</p>
          <span className="explanation-deadline">
            <Icon name="calendar" />
            Submit by 31 October 2026
          </span>
        </div>
        <p className="preview-footnote">An example of a little more clarity</p>
      </figure>

      {lastResponse && <ContinueCard response={lastResponse} onOpen={onContinue} />}

      <section className="section how-section">
        <h2 className="eyebrow">You’ll get three clear answers</h2>
        <ol className="how">
          <li>What is this letter about?</li>
          <li>What do I have to do, and by when?</li>
          <li>What happens if I don’t?</li>
        </ol>
      </section>

      <p className="privacy">
        <Icon name="lock" />
        {PRIVACY[analyzer] ?? PRIVACY.claude}
      </p>
    </main>
  );
}

function ContinueCard({ response, onOpen }: { response: AnalyzeResponse; onOpen: () => void }) {
  const { result } = response;
  return (
    <section className="section">
      <h2 className="eyebrow">Continue where you left off</h2>
      <button type="button" className="card card-link" onClick={onOpen}>
        <span className="avatar">
          <Icon name={response.checks.scam_suspected ? "alert" : "file"} />
        </span>
        <span className="card-link-body">
          <span className="card-link-title">{result.sender ?? result.document_type}</span>
          <span className="card-link-sub" dir="auto">
            {result.summary}
          </span>
          {deadlinePill(result)}
        </span>
        <Icon name="next" className="chev flip-rtl" />
      </button>
    </section>
  );
}
