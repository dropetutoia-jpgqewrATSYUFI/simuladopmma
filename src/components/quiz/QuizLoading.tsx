import { Loader2 } from "lucide-react";

interface QuizLoadingProps {
  message?: string;
}

export function QuizLoading({ message = "Carregando..." }: QuizLoadingProps) {
  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
