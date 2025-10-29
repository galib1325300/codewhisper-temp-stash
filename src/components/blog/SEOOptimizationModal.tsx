import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SEOOptimizationModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (optimizations: any) => void;
  data: {
    category: string;
    optimizations: any;
    original: any;
  } | null;
}

const categoryLabels: Record<string, string> = {
  metadata: "Métadonnées",
  keywords: "Mots-clés",
  content: "Contenu",
  media: "Médias",
  links: "Liens",
  faq: "FAQ",
  full: "Optimisation complète"
};

export function SEOOptimizationModal({ open, onClose, onApply, data }: SEOOptimizationModalProps) {
  if (!data) return null;

  const { category, optimizations, original } = data;

  const handleApply = () => {
    onApply(optimizations);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✨ Optimisation SEO : {categoryLabels[category]}
          </DialogTitle>
          <DialogDescription>
            L'IA a analysé votre article et propose les améliorations suivantes
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comparison">Comparaison</TabsTrigger>
            <TabsTrigger value="reasoning">Explication</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-4">
            {category === 'metadata' && (
              <>
                {/* Meta Title */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Meta Titre</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-muted-foreground">Avant</span>
                        <Badge variant="outline" className="ml-auto">
                          {original.meta_title?.length || 0} caractères
                        </Badge>
                      </div>
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
                        {original.meta_title || <span className="text-muted-foreground italic">Aucun meta titre</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Après</span>
                        <Badge variant="default" className="ml-auto">
                          {optimizations.meta_title?.length || 0} caractères
                        </Badge>
                      </div>
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-sm font-medium">
                        {optimizations.meta_title}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meta Description */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Meta Description</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-muted-foreground">Avant</span>
                        <Badge variant="outline" className="ml-auto">
                          {original.meta_description?.length || 0} caractères
                        </Badge>
                      </div>
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
                        {original.meta_description || <span className="text-muted-foreground italic">Aucune meta description</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Après</span>
                        <Badge variant="default" className="ml-auto">
                          {optimizations.meta_description?.length || 0} caractères
                        </Badge>
                      </div>
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-sm">
                        {optimizations.meta_description}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {(category === 'keywords' || category === 'content') && (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">Modifications apportées :</span>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {optimizations.changes?.map((change: string, index: number) => (
                        <li key={index} className="text-sm">{change}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Aperçu du contenu modifié</h4>
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-md max-h-96 overflow-y-auto">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: optimizations.content?.substring(0, 1000) + '...' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {category === 'links' && (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">{optimizations.links_added || optimizations.insertions?.length || 0} liens internes ajoutés</span>
                    {optimizations.changes && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {optimizations.changes.map((change: string, index: number) => (
                          <li key={index} className="text-sm">{change}</li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>

                {optimizations.insertions && optimizations.insertions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Liens à insérer ({optimizations.insertions.length})</h4>
                    <div className="space-y-3">
                      {optimizations.insertions.map((link: any, index: number) => (
                        <div key={index} className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={link.type === 'article' ? 'default' : 'secondary'}>
                                {link.type === 'article' ? '📄 Article' : link.type === 'collection' ? '📁 Collection' : '🛍️ Produit'}
                              </Badge>
                              <Badge variant="outline">
                                Score: {link.relevance_score}/10
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Texte à lier:</span>
                              <span className="ml-2 font-medium">{link.anchor_text}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">URL:</span>
                              <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">{link.url}</code>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Contexte:</span>
                              <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{link.context}&rdquo;</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {optimizations.content && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Aperçu du contenu avec liens</h4>
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-md max-h-96 overflow-y-auto">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: optimizations.content?.substring(0, 1000) + '...' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {category === 'faq' && (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">{optimizations.questions_count} questions créées</span> avec schema.org FAQPage
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Section FAQ à ajouter</h4>
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-md max-h-96 overflow-y-auto">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: optimizations.faq_html }}
                    />
                  </div>
                </div>
              </div>
            )}

            {category === 'full' && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">Optimisation complète réalisée :</span>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {optimizations.changes_summary?.map((change: string, index: number) => (
                        <li key={index} className="text-sm">{change}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Nouvelles métadonnées</h4>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-md text-sm">
                      <div className="mb-2">
                        <span className="font-medium">Titre :</span> {optimizations.meta_title}
                      </div>
                      <div>
                        <span className="font-medium">Description :</span> {optimizations.meta_description}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Aperçu du contenu</h4>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-md max-h-32 overflow-y-auto">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: optimizations.content?.substring(0, 500) + '...' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reasoning">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm whitespace-pre-wrap">
                {optimizations.reasoning}
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleApply} className="gap-2">
            ✨ Appliquer les optimisations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
