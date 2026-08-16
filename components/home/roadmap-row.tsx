type RoadmapRowProps = {
  phase: string;
  title: string;
  description: string;
  weeks: string;
};

export function RoadmapRow({ phase, title, description, weeks }: RoadmapRowProps) {
  return (
    <li className="surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-baseline sm:gap-6">
      <span className="bg-primary-muted text-primary dark:bg-primary/15 shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide uppercase">
        {phase}
      </span>

      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-card-title">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <span className="text-muted-foreground shrink-0 text-sm tabular-nums">{weeks}</span>
    </li>
  );
}
