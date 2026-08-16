type TechCardProps = {
  label: string;
  role: string;
};

export function TechCard({ label, role }: TechCardProps) {
  return (
    <article className="surface-card flex flex-col gap-1 p-5">
      <span className="text-card-title">{label}</span>
      <span className="text-muted-foreground text-sm">{role}</span>
    </article>
  );
}
