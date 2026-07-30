export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="CommunityConnect AI">
      <defs>
        <linearGradient id="ccai-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-green)" />
          <stop offset="100%" stopColor="var(--color-gold)" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 27.5 9v14L16 29.5 4.5 23V9L16 2.5Z"
        fill="none"
        stroke="url(#ccai-mark)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="12" r="3.1" fill="url(#ccai-mark)" />
      <path
        d="M16 15.2v4.4M16 19.6l-4.2 3M16 19.6l4.2 3"
        stroke="url(#ccai-mark)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function WordMark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 font-display text-[17px] font-semibold tracking-tight ${className}`}>
      <LogoMark className="h-7 w-7" />
      CommunityConnect <span className="text-green">AI</span>
    </span>
  );
}
