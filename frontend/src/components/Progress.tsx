import { useEffect, useState } from "react";

/** Rotating status messages while the analysis runs (texts come from the domain pack). */
export function Progress({ steps }: { steps: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 4000);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="progress" role="status">
      <span className="spinner" aria-hidden />
      {steps[i]}
    </div>
  );
}
