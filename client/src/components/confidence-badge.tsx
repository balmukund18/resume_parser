import { Badge } from "@/components/ui/badge";

interface ConfidenceBadgeProps {
  score: number;
  showLabel?: boolean;
}

export function ConfidenceBadge({ score, showLabel = true }: ConfidenceBadgeProps) {
  const getColorClass = (score: number) => {
    if (score >= 90) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (score >= 70) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  const getLabel = (score: number) => {
    if (score >= 90) return "High";
    if (score >= 70) return "Medium";
    return "Low";
  };

  return (
    <Badge 
      variant="secondary" 
      className={`${getColorClass(score)} border-0 font-medium text-xs`}
      data-testid={`badge-confidence-${score}`}
    >
      {score}%{showLabel && ` ${getLabel(score)}`}
    </Badge>
  );
}
