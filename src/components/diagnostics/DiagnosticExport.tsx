import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Mail, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticExportProps {
  diagnostic: {
    id: string;
    score: number;
    total_issues: number;
    errors_count: number;
    warnings_count: number;
    info_count: number;
    issues: any[];
    recommendations: any[];
    summary: any;
    created_at: string;
  };
  shopName: string;
}

export default function DiagnosticExport({ diagnostic, shopName }: DiagnosticExportProps) {
  const [exporting, setExporting] = useState(false);

  const generatePDFReport = async () => {
    setExporting(true);
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a simple text report for now (in real implementation, use a PDF library)
      const reportContent = generateTextReport();
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnostic-seo-${shopName}-${diagnostic.id.slice(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Rapport exporté avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export du rapport');
    } finally {
      setExporting(false);
    }
  };

  const generateTextReport = () => {
    const date = new Date(diagnostic.created_at).toLocaleDateString('fr-FR');
    
    let report = `RAPPORT DE DIAGNOSTIC SEO\n`;
    report += `=============================\n\n`;
    report += `Boutique: ${shopName}\n`;
    report += `Date du diagnostic: ${date}\n`;
    report += `ID du diagnostic: ${diagnostic.id}\n`;
    report += `Score SEO: ${diagnostic.score}/100\n\n`;
    
    report += `RÉSUMÉ\n`;
    report += `-------\n`;
    report += `Nombre total de problèmes: ${diagnostic.total_issues}\n`;
    report += `Erreurs: ${diagnostic.errors_count}\n`;
    report += `Avertissements: ${diagnostic.warnings_count}\n`;
    report += `Informations: ${diagnostic.info_count}\n\n`;
    
    report += `PROBLÈMES DÉTECTÉS\n`;
    report += `==================\n\n`;
    
    diagnostic.issues.forEach((issue, index) => {
      report += `${index + 1}. ${issue.title} [${issue.type.toUpperCase()}]\n`;
      report += `   Catégorie: ${issue.category}\n`;
      report += `   Description: ${issue.description}\n`;
      report += `   Recommandation: ${issue.recommendation}\n`;
      if (issue.affected_items && issue.affected_items.length > 0) {
        report += `   Éléments concernés (${issue.affected_items.length}): `;
        report += issue.affected_items.slice(0, 3).map((item: any) => item.name).join(', ');
        if (issue.affected_items.length > 3) {
          report += ` et ${issue.affected_items.length - 3} autres`;
        }
        report += '\n';
      }
      report += '\n';
    });
    
    report += `RECOMMANDATIONS GÉNÉRALES\n`;
    report += `=========================\n`;
    diagnostic.recommendations.forEach((rec: string, index: number) => {
      report += `${index + 1}. ${rec}\n`;
    });
    
    return report;
  };

  const shareReport = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Diagnostic SEO - ${shopName}`,
          text: `Score SEO: ${diagnostic.score}/100 - ${diagnostic.total_issues} problèmes détectés`,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to copying link
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papiers');
    }
  };

  const getScoreColor = () => {
    if (diagnostic.score >= 80) return 'text-green-600';
    if (diagnostic.score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = () => {
    if (diagnostic.score >= 80) return 'default';
    if (diagnostic.score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Export et partage</span>
          <Badge variant={getScoreBadgeVariant()}>
            Score: {diagnostic.score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={generatePDFReport}
            disabled={exporting}
            className="justify-start"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Export en cours...' : 'Télécharger rapport'}
          </Button>
          
          <Button
            variant="outline"
            onClick={shareReport}
            className="justify-start"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Partager le diagnostic
          </Button>
        </div>
        
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 mt-0.5 text-primary" />
            <div>
              <p className="text-sm font-medium">Rapport détaillé</p>
              <p className="text-xs text-muted-foreground">
                Le rapport contient {diagnostic.total_issues} problèmes détectés, 
                les recommandations et un plan d'action prioritaire.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}