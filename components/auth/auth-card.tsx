import { Container } from '@/components/shared';

type AuthCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Shared, quiet frame for authentication tasks. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <section className="section-py flex items-center">
      <Container className="flex justify-center">
        <div className="surface-card flex w-full max-w-md flex-col gap-6 p-6 sm:p-8">
          <header className="flex flex-col gap-1 text-left">
            <h1>{title}</h1>
            <p className="text-muted-foreground text-sm">{description}</p>
          </header>

          {children}

          {footer}
        </div>
      </Container>
    </section>
  );
}
