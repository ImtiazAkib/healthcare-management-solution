import { FeatureVisual } from '@/types';

import { cn } from '@/lib/utils';

type FeatureCardProps = {
  visual: FeatureVisual;
  title: string;
  description: string;
};

export function FeatureCard({ visual, title, description }: FeatureCardProps) {
  const Icon = visual.icon;

  return (
    <article className="surface-card flex flex-col gap-4 p-6">
      <span className={cn('flex size-10 items-center justify-center rounded-lg', visual.surfaceClassName)}>
        <Icon className={cn('size-5', visual.accentClassName)} />
      </span>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-card-title">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </article>
  );
}
