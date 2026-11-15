import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, size = 36, className }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#4a90c8] to-[#2774ae] font-semibold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4, letterSpacing: "0.02em" }}
    >
      {initials}
    </div>
  );
}
