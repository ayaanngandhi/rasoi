export function Wordmark({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex items-baseline gap-1.5">
        <span className="font-display text-xl font-extrabold tracking-tight text-chilli dark:text-ink">
          Rasoi
        </span>
        <span className="font-hindi text-sm font-semibold leading-none text-tomato">रसोई</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-display text-3xl font-extrabold tracking-tight text-chilli dark:text-ink">
        Rasoi
      </span>
      <span className="rounded-full bg-spice/20 px-2 py-0.5 font-hindi text-sm font-semibold leading-none text-caramel dark:text-spice">
        रसोई
      </span>
    </span>
  );
}

