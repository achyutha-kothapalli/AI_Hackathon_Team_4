import { useEffect, useState } from "react";

// Text size and high contrast for elderly and visually impaired users.
// Remembered per browser (a convenience only; the app works without it).

const SIZES = [1, 1.2, 1.4] as const;

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: setting just isn't remembered */
  }
}

export function DisplaySettings() {
  const [size, setSize] = useState<number>(() => load("display.size", 1));
  const [contrast, setContrast] = useState<boolean>(() => load("display.contrast", false));

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(size));
    save("display.size", size);
  }, [size]);

  useEffect(() => {
    document.documentElement.dataset.contrast = contrast ? "high" : "normal";
    save("display.contrast", contrast);
  }, [contrast]);

  const next = SIZES[(SIZES.indexOf(size as (typeof SIZES)[number]) + 1) % SIZES.length];

  return (
    <div className="display-settings" role="group" aria-label="Display settings">
      <button
        type="button"
        className="btn secondary icon"
        onClick={() => setSize(next)}
        aria-label={`Text size ${Math.round(size * 100)} percent. Change to ${Math.round(next * 100)} percent`}
        title="Larger text"
      >
        A<span aria-hidden className="a-plus">{size === 1 ? "+" : size === 1.2 ? "++" : "−"}</span>
      </button>
      <button
        type="button"
        className="btn secondary icon"
        onClick={() => setContrast((c) => !c)}
        aria-pressed={contrast}
        title="High contrast"
      >
        ◐ <span className="sr-only">High contrast</span>
      </button>
    </div>
  );
}
