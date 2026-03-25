import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-[hsl(var(--card))] rounded-xl border p-8 max-w-sm mx-4 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-lg font-semibold mb-1">Page Not Found</h1>
        <p className="text-[13px] text-muted-foreground mb-4">The page you're looking for doesn't exist.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/"} className="text-[12px] border-[#2da77d]/30 text-[#2da77d] hover:bg-[#2da77d]/5">
          Go Home
        </Button>
      </div>
    </div>
  );
}
