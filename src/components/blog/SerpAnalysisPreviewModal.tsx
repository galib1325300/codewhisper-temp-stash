import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, TrendingUp, FileText, Target, Link2, Sparkles } from 'lucide-react';

interface SerpResult {
  rank: number;
  url: string;
  title: string;
  snippet: string;
  h1?: string;
  h2_structure?: string[];
  word_count?: number;
  has_faq?: boolean;
  has_table?: boolean;
}

interface RecommendedStructure {
  h2_sections: string[];
  target_word_count: number;
  recommended_internal_links: number;
  keywords_to_include: string[];
  content_types_to_add: string[];
}

interface SerpAnalysis {
  top_results: SerpResult[];
  recommended_structure: RecommendedStructure;
  competitive_insights: string;
}

interface SerpAnalysisPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (analysis: SerpAnalysis) => void;
  serpAnalysis: SerpAnalysis | null;
  topic: string;
}

export default function SerpAnalysisPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  serpAnalysis,
  topic
}: SerpAnalysisPreviewModalProps) {
  if (!serpAnalysis) return null;

  const top_results = serpAnalysis.top_results || [];
  const recommended_structure = serpAnalysis.recommended_structure || {} as RecommendedStructure;
  const competitive_insights = serpAnalysis.competitive_insights || '';
  
  // Safe defaults for recommended_structure
  const h2Sections = recommended_structure?.h2_sections || [];
  const targetWordCount = recommended_structure?.target_word_count || 1500;
  const recommendedLinks = recommended_structure?.recommended_internal_links || 5;
  const contentTypes = recommended_structure?.content_types_to_add || [];
  const keywords = recommended_structure?.keywords_to_include || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-primary" />
            Analyse des Concurrents Google
          </DialogTitle>
          <DialogDescription>
            Mot-clé analysé : <span className="font-semibold text-foreground">"{topic}"</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Section 1: Top Résultats Google */}
            {top_results.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                Top {top_results.length} Résultats Google
              </h3>
              <Accordion type="single" collapsible className="space-y-2">
                {top_results.map((result, i) => (
                  <AccordionItem key={i} value={`result-${i}`} className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-start gap-3 text-left w-full">
                        <Badge variant="secondary" className="shrink-0 mt-0.5">
                          #{result.rank}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">
                            {result.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {result.url}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {result.snippet && (
                          <p className="text-sm text-muted-foreground">
                            {result.snippet}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {result.h1 && (
                            <Badge variant="outline" className="text-xs">
                              H1: {result.h1}
                            </Badge>
                          )}
                          {result.word_count && (
                            <Badge variant="outline" className="text-xs">
                              📊 {result.word_count} mots
                            </Badge>
                          )}
                          {result.h2_structure && result.h2_structure.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              📝 {result.h2_structure.length} sections H2
                            </Badge>
                          )}
                          {result.has_faq && (
                            <Badge variant="outline" className="text-xs bg-primary/5">
                              ❓ FAQ
                            </Badge>
                          )}
                          {result.has_table && (
                            <Badge variant="outline" className="text-xs bg-primary/5">
                              📋 Tableau
                            </Badge>
                          )}
                        </div>
                          {result.h2_structure && result.h2_structure.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Structure H2 :
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {result.h2_structure.slice(0, 5).map((h2, idx) => (
                                <li key={idx} className="pl-3 border-l-2 border-primary/30">
                                  {h2}
                                </li>
                              ))}
                              {result.h2_structure.length > 5 && (
                                <li className="pl-3 text-xs italic">
                                  +{result.h2_structure.length - 5} autres sections...
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            )}

            {/* Section 2: Structure Recommandée */}
            {h2Sections.length > 0 && (
            <Card className="p-4 border-primary/20 bg-primary/5">
              <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Structure H2 Recommandée
              </h3>
              <ul className="space-y-2">
                {h2Sections.map((h2, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-mono shrink-0">{i + 1}.</span>
                    <span className="text-foreground">{h2}</span>
                  </li>
                ))}
              </ul>
            </Card>
            )}

            {/* Section 3: Objectifs SEO */}
            <div>
              <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Objectifs SEO
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {targetWordCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mots cibles
                  </div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {recommendedLinks}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Liens internes
                  </div>
                </Card>
              </div>

              {contentTypes.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Types de contenu à ajouter :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contentTypes.map((type, i) => (
                      <Badge key={i} variant="secondary">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {keywords.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Mots-clés à intégrer :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.slice(0, 8).map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                    {keywords.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{keywords.length - 8} autres
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Insights Concurrentiels */}
            {competitive_insights && (
              <Card className="p-4 bg-secondary/5 border-secondary/20">
                <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  Insights Concurrentiels
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {competitive_insights}
                </p>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => onConfirm(serpAnalysis)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Générer l'article avec cette stratégie
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
