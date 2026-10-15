import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "warning" | "danger" | "success";
const ICON = { info: Info, warning: AlertTriangle, danger: OctagonAlert, success: CheckCircle2 } as const;

interface Props {
  tone: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
}

export function Banner({ tone, title, children, action, role }: Props) {
  const Icon = ICON[tone];
  return (
    <div className={`banner banner-${tone}`} role={role}>
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <p className="banner-title">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className="banner-action">{action}</div>}
    </div>
  );
}
