import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = (p: string) => new URL(`../${p}`, import.meta.url);
const pub = (p: string) => new URL(`../../public/${p}`, import.meta.url);

describe("Minimal / Mono theme", () => {
  const theme = readFileSync(src("theme.css"), "utf8");
  it("defines the tokens the components use", () => {
    for (const t of [
      "--background", "--foreground", "--card", "--muted", "--muted-foreground", "--border", "--border-strong",
      "--input", "--primary", "--primary-hover", "--primary-active", "--primary-foreground", "--accent",
      "--accent-foreground", "--ring", "--success", "--warning", "--destructive", "--warning-surface",
      "--warning-text", "--destructive-surface", "--destructive-text", "--info-surface", "--info-text",
      "--success-surface", "--success-text", "--font-sans", "--font-mono", "--radius", "--radius-lg",
    ]) expect(theme, t).toContain(`${t}:`);
    expect(theme).toContain("--primary: #2F5BEA;");
  });
  it("vendors the fonts", () => {
    expect(existsSync(pub("fonts/dm-sans.woff2"))).toBe(true);
    expect(existsSync(pub("fonts/jetbrains-mono.woff2"))).toBe(true);
  });
  it("is light only and loads the fonts", () => {
    const styles = readFileSync(src("styles.css"), "utf8");
    expect(styles).not.toContain("prefers-color-scheme");
    expect(styles).toContain('url("/fonts/dm-sans.woff2")');
    expect(readFileSync(src("main.tsx"), "utf8")).toMatch(/import "\.\/theme\.css";\s*import "\.\/styles\.css";/);
  });
});
