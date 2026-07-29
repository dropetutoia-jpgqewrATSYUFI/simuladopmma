import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, HelpCircle, Award, Share2, RotateCcw, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ResultSummary } from "@/lib/quiz.types";

interface QuizResultProps {
  result: ResultSummary;
  publicToken: string;
}

export function QuizResult({ result, publicToken }: QuizResultProps) {
  const shareUrl = `${window.location.origin}/diagnostico-pmma/resultado/${publicToken}`;
  const shareMessage = `Fiz o Diagnóstico PMMA da Edital360 e tirei ${result.scorePercentage}%! Faça você também:`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Meu resultado no Diagnóstico PMMA",
        text: shareMessage,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(`${shareMessage} ${shareUrl}`);
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareMessage} ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Card className="mx-auto max-w-2xl overflow-hidden">
      <div className={`h-2 w-full ${result.passed ? "bg-success" : "bg-warning"}`} />
      <CardHeader className="text-center">
        <div className="mx-flex mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Award className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="mt-4 text-2xl">Resultado do diagnóstico</CardTitle>
        <CardDescription>{result.estimatedRank}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-5xl font-bold text-foreground">{result.scorePercentage}%</p>
          <p className="mt-1 text-sm text-muted-foreground">de aproveitamento</p>
        </div>

        <Progress value={result.scorePercentage} className="h-3" />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-success" />
            <p className="mt-2 text-xl font-bold">{result.correctCount}</p>
            <p className="text-xs text-muted-foreground">acertos</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <XCircle className="mx-auto h-5 w-5 text-destructive" />
            <p className="mt-2 text-xl font-bold">{result.wrongCount}</p>
            <p className="text-xs text-muted-foreground">erros</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <HelpCircle className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-xl font-bold">{result.blankCount}</p>
            <p className="text-xs text-muted-foreground">em branco</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <p className="font-medium text-foreground">Recomendação</p>
          <p className="mt-1 text-sm text-muted-foreground">{result.recommendation}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleShare} variant="outline" className="flex-1">
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
          <Button onClick={handleWhatsApp} variant="outline" className="flex-1">
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
          <Button asChild className="flex-1">
            <Link to="/diagnostico-pmma" search={{ modo: "simulado" }}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Refazer
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
