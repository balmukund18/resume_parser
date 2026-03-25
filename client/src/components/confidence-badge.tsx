import { Badge } from "@/components/ui/badge";

interface ConfidenceBadgeProps {
  score: number;
  showLabel?: boolean;
}

export function ConfidenceBadge({ score, showLabel = true }: ConfidenceBadgeProps) {
  const getStyle = (s: number) => {
    if (s >= 90) return "bg-[#2da77d]/10 text-[#2da77d] dark:bg-[#2da77d]/20 dark:text-[#3dd68c]";
    if (s >= 70) return "bg-[#f59e0b]/10 text-[#f59e0b] dark:bg-[#f59e0b]/20 dark:text-[#fbbf24]";
    return "bg-[#ef4444]/10 text-[#ef4444] dark:bg-[#ef4444]/20 dark:text-[#f87171]";
  };

  const getLabel = (s: number) => {
    if (s >= 90) return "High";
    if (s >= 70) return "Medium";
    return "Low";
  };

  return (
    <Badge
      variant="secondary"
      className={`${getStyle(score)} border-0 font-semibold text-[10px] px-1.5 py-0 leading-4`}
      data-testid={`badge-confidence-${score}`}
    >
      {score}%{showLabel && ` ${getLabel(score)}`}
    </Badge>
  );
}
