import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, formContent } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let post;
    if (formContent) {
      // Analyser le contenu du formulaire (modifications non sauvegardées)
      post = formContent;
      console.log('Analyzing form content (unsaved changes)');
    } else {
      // Analyser depuis la DB
      const { data, error: postError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError || !data) {
        throw new Error('Article introuvable');
      }
      post = data;
      console.log('Analyzing saved content from DB');
    }

    const analysis = analyzeSEO(post);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error analyzing SEO:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur lors de l\'analyse' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface SEOAnalysis {
  score: number;
  categories: {
    content: { score: number; max: number; issues: string[]; recommendations: string[] };
    keywords: { score: number; max: number; issues: string[]; recommendations: string[] };
    metadata: { score: number; max: number; issues: string[]; recommendations: string[] };
    media: { score: number; max: number; issues: string[]; recommendations: string[] };
    links: { score: number; max: number; issues: string[]; recommendations: string[] };
    advanced: { score: number; max: number; issues: string[]; recommendations: string[] };
  };
  summary: string;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

function analyzeSEO(post: any): SEOAnalysis {
  const content = post.content || '';
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText.split(/\s+/).length;
  const focusKeyword = post.focus_keyword || '';

  // Content Analysis (30 points)
  const contentAnalysis = analyzeContent(content, plainText, wordCount);

  // Keywords Analysis (20 points)
  const keywordsAnalysis = analyzeKeywords(content, plainText, focusKeyword, post.title, post.meta_title, post.meta_description);

  // Metadata Analysis (20 points)
  const metadataAnalysis = analyzeMetadata(post.meta_title, post.meta_description, post.title, focusKeyword);

  // Media Analysis (15 points)
  const mediaAnalysis = analyzeMedia(content, post.featured_image);

  // Links Analysis (10 points)
  const linksAnalysis = analyzeLinks(content);

  // Advanced Features (5 points)
  const advancedAnalysis = analyzeAdvancedFeatures(content);

  const totalScore = 
    contentAnalysis.score +
    keywordsAnalysis.score +
    metadataAnalysis.score +
    mediaAnalysis.score +
    linksAnalysis.score +
    advancedAnalysis.score;

  const grade = calculateGrade(totalScore);
  const summary = generateSummary(totalScore, grade);

  return {
    score: totalScore,
    categories: {
      content: contentAnalysis,
      keywords: keywordsAnalysis,
      metadata: metadataAnalysis,
      media: mediaAnalysis,
      links: linksAnalysis,
      advanced: advancedAnalysis,
    },
    summary,
    grade,
  };
}

function analyzeContent(content: string, plainText: string, wordCount: number) {
  let score = 0;
  const max = 30;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Word count (10 points)
  if (wordCount >= 1500) {
    score += 10;
  } else if (wordCount >= 1000) {
    score += 7;
    recommendations.push(`Augmentez la longueur à 1500+ mots (actuellement ${wordCount})`);
  } else if (wordCount >= 500) {
    score += 4;
    issues.push(`Article trop court: ${wordCount} mots`);
    recommendations.push('Visez au minimum 1000 mots pour un bon référencement');
  } else {
    issues.push(`Article très court: ${wordCount} mots`);
    recommendations.push('Un article de qualité devrait contenir au moins 1000 mots');
  }

  // H1 presence and uniqueness (5 points)
  const h1Matches = content.match(/<h1[^>]*>/gi);
  if (h1Matches && h1Matches.length === 1) {
    score += 5;
  } else if (!h1Matches || h1Matches.length === 0) {
    issues.push('Aucun titre H1 trouvé');
    recommendations.push('Ajoutez un titre H1 unique pour votre article');
  } else {
    issues.push(`${h1Matches.length} titres H1 trouvés`);
    recommendations.push('Utilisez un seul titre H1 par article');
  }

  // Heading structure (5 points)
  const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (content.match(/<h3[^>]*>/gi) || []).length;
  if (h2Count >= 3 && h3Count >= 2) {
    score += 5;
  } else if (h2Count >= 2) {
    score += 3;
    recommendations.push('Ajoutez plus de sous-titres H2 et H3 pour structurer votre contenu');
  } else {
    issues.push('Structure de titres insuffisante');
    recommendations.push('Utilisez au moins 3 titres H2 et 2 titres H3 pour améliorer la structure');
  }

  // Paragraphs length (5 points)
  const paragraphs = content.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const longParagraphs = paragraphs.filter(p => {
    const text = p.replace(/<[^>]*>/g, '').trim();
    return text.split(/\s+/).length > 150;
  });
  if (longParagraphs.length === 0 && paragraphs.length > 0) {
    score += 5;
  } else if (longParagraphs.length <= 2) {
    score += 3;
    recommendations.push('Divisez les paragraphes trop longs (max 150 mots)');
  } else {
    issues.push(`${longParagraphs.length} paragraphes trop longs`);
    recommendations.push('Découpez les paragraphes longs pour améliorer la lisibilité');
  }

  // Lists presence (5 points)
  const ulCount = (content.match(/<ul[^>]*>/gi) || []).length;
  const olCount = (content.match(/<ol[^>]*>/gi) || []).length;
  if (ulCount + olCount >= 2) {
    score += 5;
  } else if (ulCount + olCount >= 1) {
    score += 3;
    recommendations.push('Ajoutez plus de listes à puces pour améliorer la lisibilité');
  } else {
    recommendations.push('Utilisez des listes à puces ou numérotées pour structurer l\'information');
  }

  return { score, max, issues, recommendations };
}

function analyzeKeywords(content: string, plainText: string, focusKeyword: string, title: string, metaTitle: string, metaDescription: string) {
  let score = 0;
  const max = 20;
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!focusKeyword) {
    issues.push('Aucun mot-clé focus défini');
    recommendations.push('Définissez un mot-clé focus pour cet article');
    return { score, max, issues, recommendations };
  }

  const keyword = focusKeyword.toLowerCase();
  const plainLower = plainText.toLowerCase();
  const wordCount = plainText.split(/\s+/).length;

  // Keyword density (8 points)
  const keywordOccurrences = (plainLower.match(new RegExp(keyword, 'g')) || []).length;
  const density = (keywordOccurrences / wordCount) * 100;
  if (density >= 0.5 && density <= 2.5) {
    score += 8;
  } else if (density > 0 && density < 0.5) {
    score += 4;
    recommendations.push(`Augmentez la densité du mot-clé "${focusKeyword}" (actuellement ${density.toFixed(2)}%)`);
  } else if (density > 2.5) {
    score += 4;
    issues.push(`Densité du mot-clé trop élevée: ${density.toFixed(2)}%`);
    recommendations.push('Réduisez l\'utilisation du mot-clé pour éviter le keyword stuffing (idéal: 0.5-2.5%)');
  } else {
    issues.push('Mot-clé focus absent du contenu');
    recommendations.push(`Intégrez naturellement le mot-clé "${focusKeyword}" dans votre contenu`);
  }

  // Keyword in title (4 points)
  if (title.toLowerCase().includes(keyword)) {
    score += 4;
  } else {
    issues.push('Mot-clé absent du titre');
    recommendations.push('Incluez le mot-clé focus dans le titre de l\'article');
  }

  // Keyword in meta title (4 points)
  if (metaTitle && metaTitle.toLowerCase().includes(keyword)) {
    score += 4;
  } else {
    recommendations.push('Incluez le mot-clé focus dans le meta titre');
  }

  // Keyword in first paragraph (4 points)
  const firstParagraph = (content.match(/<p[^>]*>[\s\S]*?<\/p>/i) || [''])[0];
  const firstParaText = firstParagraph.replace(/<[^>]*>/g, '').toLowerCase();
  if (firstParaText.includes(keyword)) {
    score += 4;
  } else {
    recommendations.push('Incluez le mot-clé focus dans le premier paragraphe');
  }

  return { score, max, issues, recommendations };
}

function analyzeMetadata(metaTitle: string, metaDescription: string, title: string, focusKeyword: string) {
  let score = 0;
  const max = 20;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Meta title (10 points)
  if (metaTitle) {
    const titleLength = metaTitle.length;
    if (titleLength >= 50 && titleLength <= 60) {
      score += 10;
    } else if (titleLength >= 40 && titleLength <= 70) {
      score += 7;
      if (titleLength < 50) {
        recommendations.push(`Meta titre court: ${titleLength} caractères (idéal: 50-60)`);
      } else {
        recommendations.push(`Meta titre long: ${titleLength} caractères (idéal: 50-60)`);
      }
    } else if (titleLength < 40) {
      score += 3;
      issues.push(`Meta titre trop court: ${titleLength} caractères`);
      recommendations.push('Allongez le meta titre à 50-60 caractères');
    } else {
      score += 3;
      issues.push(`Meta titre trop long: ${titleLength} caractères (sera tronqué)`);
      recommendations.push('Raccourcissez le meta titre à 50-60 caractères');
    }
  } else {
    issues.push('Meta titre manquant');
    recommendations.push('Ajoutez un meta titre optimisé de 50-60 caractères');
  }

  // Meta description (10 points)
  if (metaDescription) {
    const descLength = metaDescription.length;
    if (descLength >= 150 && descLength <= 160) {
      score += 10;
    } else if (descLength >= 120 && descLength <= 170) {
      score += 7;
      if (descLength < 150) {
        recommendations.push(`Meta description courte: ${descLength} caractères (idéal: 150-160)`);
      } else {
        recommendations.push(`Meta description longue: ${descLength} caractères (idéal: 150-160)`);
      }
    } else if (descLength < 120) {
      score += 3;
      issues.push(`Meta description trop courte: ${descLength} caractères`);
      recommendations.push('Allongez la meta description à 150-160 caractères');
    } else {
      score += 3;
      issues.push(`Meta description trop longue: ${descLength} caractères (sera tronquée)`);
      recommendations.push('Raccourcissez la meta description à 150-160 caractères');
    }
  } else {
    issues.push('Meta description manquante');
    recommendations.push('Ajoutez une meta description optimisée de 150-160 caractères');
  }

  return { score, max, issues, recommendations };
}

function analyzeMedia(content: string, featuredImage: string) {
  let score = 0;
  const max = 15;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Featured image (5 points)
  if (featuredImage) {
    score += 5;
  } else {
    issues.push('Image à la une manquante');
    recommendations.push('Ajoutez une image à la une pour améliorer l\'engagement');
  }

  // Images in content (5 points)
  const images = content.match(/<img[^>]*>/gi) || [];
  if (images.length >= 3) {
    score += 5;
  } else if (images.length >= 1) {
    score += 3;
    recommendations.push('Ajoutez plus d\'images pour enrichir le contenu (min 3)');
  } else {
    recommendations.push('Ajoutez des images pour illustrer votre contenu');
  }

  // Alt text presence (5 points)
  if (images.length > 0) {
    const imagesWithAlt = images.filter(img => /alt\s*=\s*["'][^"']+["']/i.test(img));
    const altRatio = imagesWithAlt.length / images.length;
    if (altRatio === 1) {
      score += 5;
    } else if (altRatio >= 0.7) {
      score += 3;
      recommendations.push(`${images.length - imagesWithAlt.length} images sans attribut alt`);
    } else {
      issues.push(`${images.length - imagesWithAlt.length} images sans attribut alt`);
      recommendations.push('Ajoutez des attributs alt descriptifs à toutes vos images');
    }
  }

  return { score, max, issues, recommendations };
}

function analyzeLinks(content: string) {
  let score = 0;
  const max = 10;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Internal links (5 points)
  const internalLinks = (content.match(/<a[^>]*href\s*=\s*["'][^"']*["'][^>]*>/gi) || [])
    .filter(link => !link.includes('http://') && !link.includes('https://'));
  if (internalLinks.length >= 3) {
    score += 5;
  } else if (internalLinks.length >= 1) {
    score += 3;
    recommendations.push('Ajoutez plus de liens internes (min 3) pour améliorer le maillage');
  } else {
    recommendations.push('Ajoutez des liens internes vers d\'autres pages de votre site');
  }

  // External links (5 points)
  const externalLinks = (content.match(/<a[^>]*href\s*=\s*["']https?:\/\/[^"']*["'][^>]*>/gi) || []);
  if (externalLinks.length >= 2) {
    score += 5;
  } else if (externalLinks.length >= 1) {
    score += 3;
    recommendations.push('Ajoutez au moins 2 liens externes vers des sources fiables');
  } else {
    recommendations.push('Ajoutez des liens externes vers des sources de référence');
  }

  return { score, max, issues, recommendations };
}

function analyzeAdvancedFeatures(content: string) {
  let score = 0;
  const max = 5;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // FAQ schema (3 points) - amélioration de la détection
  const hasJsonLdFaq = content.includes('application/ld+json') && content.includes('FAQPage');
  const hasVisualFaq = /faq-section|<h[23][^>]*>.*?(faq|questions?\s+fr[eé]quentes?).*?<\/h[23]>/is.test(content);
  
  if (hasJsonLdFaq) {
    score += 3;
  } else if (hasVisualFaq) {
    // FAQ visuelle présente mais sans JSON-LD
    score += 2;
    recommendations.push('Section FAQ détectée. Ajoutez le schema markup JSON-LD FAQPage pour le score maximum et Featured Snippets');
  } else {
    recommendations.push('Ajoutez une section FAQ avec schema markup pour les featured snippets');
  }

  // Tables presence (2 points)
  const tables = (content.match(/<table[^>]*>/gi) || []).length;
  if (tables >= 1) {
    score += 2;
  } else {
    recommendations.push('Utilisez des tableaux pour présenter des données comparatives');
  }

  // Warning si lien dans H1 (optionnel, n'affecte pas le score)
  if (/<h1[^>]*>.*?<a\s.*?<\/a>.*?<\/h1>/is.test(content)) {
    issues.push('⚠️ Lien détecté dans le titre H1 (mauvaise pratique SEO)');
    recommendations.push('Retirez les liens du titre H1 pour améliorer l\'autorité de la page');
  }

  return { score, max, issues, recommendations };
}

function calculateGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function generateSummary(score: number, grade: string): string {
  if (score >= 90) {
    return 'Excellent ! Votre article est parfaitement optimisé pour le SEO.';
  } else if (score >= 80) {
    return 'Très bon ! Quelques améliorations mineures pourraient renforcer votre SEO.';
  } else if (score >= 70) {
    return 'Bon travail ! Appliquez les recommandations pour améliorer votre positionnement.';
  } else if (score >= 55) {
    return 'Moyen. Des optimisations importantes sont nécessaires pour un bon référencement.';
  } else if (score >= 40) {
    return 'Insuffisant. Votre article nécessite des améliorations majeures en SEO.';
  } else {
    return 'Critique. Cet article doit être entièrement revu pour être performant en SEO.';
  }
}
