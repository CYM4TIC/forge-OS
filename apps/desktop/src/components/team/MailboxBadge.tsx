interface MailboxBadgeProps {
  count: number;
}

export default function MailboxBadge({ count }: MailboxBadgeProps) {
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-accent rounded-full leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}
