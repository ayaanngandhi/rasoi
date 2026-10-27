import { ChefHat } from "lucide-react";

export function PageHeader({
  title,
  hindi,
  children,
}: {
  title: string;
  hindi?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-chilli dark:text-ink sm:text-4xl">
          {title}
        </h1>
        {hindi && <p className="mt-1 text-sm text-ink-soft">{hindi}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center rounded-3xl border-2 border-dashed border-line px-8 py-14 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-full bg-spice/15 text-caramel dark:text-spice">
        <Icon className="size-8" />
      </span>
      <p className="font-display text-lg font-bold">{title}</p>
      {hint && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-ink-soft">
      <ChefHat className="size-6 animate-bounce" />
      <span className="text-sm">{label ?? "Loading..."}</span>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-tomato/30 bg-tomato/10 px-4 py-3 text-sm font-medium text-tomato">
      {message}
    </p>
  );
}
