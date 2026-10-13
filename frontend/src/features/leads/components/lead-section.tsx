import { useId, type ReactNode } from "react";

interface LeadSectionProps {
  title: string;
  count: number;
  icon?: ReactNode;
  children: ReactNode;
}

export function LeadSection({ title, count, icon, children }: LeadSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-gray-500 uppercase"
      >
        {icon}
        {title}
        <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-px text-[11px] font-medium text-gray-600 tabular-nums">
          {count}
        </span>
      </h2>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}
