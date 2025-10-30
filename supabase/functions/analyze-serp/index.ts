import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface SerpAnalysis {
  top_results: SerpResult[];
  recommended_structure: {
    h2_sections: string[];
    target_word_count: number;
    must_include_keywords: string[];
    content_types_to_add: string[];
    recommended_internal_links?: number; // Phase 2: Dynamic internal links
  };
  competitive_insights: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, shopUrl } = await req.json();

    console.log('Analyzing SERP for keyword:', keyword);

    // Get Google API credentials from environment
    const apiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const engineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID');

    if (!apiKey || !engineId) {
      throw new Error('Google Search API credentials not configured');
    }

    // Call Google Programmable Search API
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(keyword)}&gl=fr&hl=fr&num=5`;
    
    console.log('Calling Google Programmable Search API...');
    const searchResponse = await fetch(apiUrl);

    if (!searchResponse.ok) {
      const errorData = await searchResponse.text();
      console.error('Google API Error:', errorData);
      
      if (searchResponse.status === 429) {
        throw new Error('Quota Google dépassé - limite de 1000 recherches/jour');
      } else if (searchResponse.status === 400) {
        throw new Error('Erreur configuration API Google (clé API invalide)');
      } else if (searchResponse.status === 403) {
        throw new Error('Accès refusé - vérifier les restrictions API Google');
      }
      
      throw new Error('Failed to fetch Google search results');
    }

    // Parse JSON response from Google API
    const data = await searchResponse.json();
    
    // Check if we have results
    if (!data.items || data.items.length === 0) {
      console.log('No results found from Google API');
      return new Response(
        JSON.stringify({ 
          success: true,
          analysis: {
            top_results: [],
            recommended_structure: {
              h2_sections: [
                `Qu'est-ce qu'un ${keyword} ?`,
                `Les meilleurs ${keyword} en 2025`,
                `Comment choisir son ${keyword}`,
                `Guide d'utilisation`,
                `FAQ : Questions fréquentes`
              ],
              target_word_count: 1500,
              must_include_keywords: [keyword.toLowerCase()],
              content_types_to_add: ['faq_section', 'product_recommendations']
            },
            competitive_insights: 'Aucun résultat trouvé sur Google pour ce mot-clé.'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract top 5 organic results from Google API response
    const results: SerpResult[] = data.items.slice(0, 5).map((item: any, index: number) => ({
      rank: index + 1,
      url: item.link,
      title: item.title,
      snippet: item.snippet || ''
    }));

    console.log(`Found ${results.length} results for analysis`);

    // Analyze each result (scrape content for top 3)
    const analyzedResults: SerpResult[] = [];
    for (const result of results.slice(0, 3)) {
      try {
        const pageResponse = await fetch(result.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (pageResponse.ok) {
          const pageHtml = await pageResponse.text();
          const page$ = cheerio.load(pageHtml);

          // Extract H1
          const h1 = page$('h1').first().text().trim();

          // Extract H2 structure
          const h2Structure: string[] = [];
          page$('h2').each((_, elem) => {
            const text = page$(elem).text().trim();
            if (text) h2Structure.push(text);
          });

          // Count words (approximate)
          const bodyText = page$('body').text();
          const wordCount = bodyText.split(/\s+/).length;

          // Check for FAQ
          const hasFaq = page$('*[itemtype*="FAQPage"]').length > 0 || 
                        page$('h2, h3').text().toLowerCase().includes('faq') ||
                        page$('h2, h3').text().toLowerCase().includes('questions');

          // Check for tables
          const hasTable = page$('table').length > 0;

          // PHASE 2: Count internal links (domain-specific)
          const domain = new URL(result.url).hostname;
          const internalLinks = page$(`a[href^="/"], a[href*="${domain}"]`).length;

          analyzedResults.push({
            ...result,
            h1,
            h2_structure: h2Structure.slice(0, 8), // Top 8 H2s
            word_count: wordCount,
            has_faq: hasFaq,
            has_table: hasTable,
            internal_links: internalLinks
          });
        }
      } catch (scrapeError) {
        console.error(`Error scraping ${result.url}:`, scrapeError);
        analyzedResults.push(result);
      }
    }

    // Add remaining results without full analysis
    analyzedResults.push(...results.slice(3));

    // Generate recommendations based on analysis
    const allH2s = analyzedResults.flatMap(r => r.h2_structure || []);
    const h2Frequency = new Map<string, number>();
    allH2s.forEach(h2 => {
      const normalized = h2.toLowerCase().trim();
      h2Frequency.set(normalized, (h2Frequency.get(normalized) || 0) + 1);
    });

    // Get most common H2 topics
    const commonH2s = Array.from(h2Frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([h2]) => h2);

    // Calculate average word count
    const avgWordCount = analyzedResults
      .filter(r => r.word_count)
      .reduce((sum, r) => sum + (r.word_count || 0), 0) / 
      (analyzedResults.filter(r => r.word_count).length || 1);

    const targetWordCount = Math.ceil(avgWordCount * 1.2); // 20% more than average

    // Extract keywords from titles and snippets
    const keywordExtraction = [...analyzedResults.map(r => r.title), ...analyzedResults.map(r => r.snippet)]
      .join(' ')
      .toLowerCase();

    const mustIncludeKeywords = [
      keyword.toLowerCase(),
      ...keyword.toLowerCase().split(' ').filter(w => w.length > 3)
    ];

    // Content types to add
    const contentTypes: string[] = [];
    if (analyzedResults.some(r => r.has_faq)) contentTypes.push('faq_section');
    if (analyzedResults.some(r => r.has_table)) contentTypes.push('comparison_table');
    contentTypes.push('product_recommendations');

    // PHASE 2: Calculate recommended internal links (average of top 3 + 20%)
    const internalLinksData = analyzedResults
      .filter(r => r.internal_links !== undefined)
      .map(r => r.internal_links || 0);
    
    const avgInternalLinks = internalLinksData.length > 0
      ? internalLinksData.reduce((sum, count) => sum + count, 0) / internalLinksData.length
      : 7; // Fallback to 7 if no data
    
    const recommendedInternalLinks = Math.max(7, Math.ceil(avgInternalLinks * 1.2)); // Min 7, +20% boost

    console.log(`📊 Internal links analysis: avg=${avgInternalLinks.toFixed(1)}, recommended=${recommendedInternalLinks}`);

    const analysis: SerpAnalysis = {
      top_results: analyzedResults,
      recommended_structure: {
        h2_sections: commonH2s.length > 0 ? commonH2s : [
          `Qu'est-ce qu'un ${keyword} ?`,
          `Les meilleurs ${keyword} en 2025`,
          `Comment choisir son ${keyword}`,
          `Guide d'utilisation`,
          `FAQ : Questions fréquentes`
        ],
        target_word_count: targetWordCount > 1500 ? targetWordCount : 1500,
        must_include_keywords: mustIncludeKeywords,
        content_types_to_add: contentTypes,
        recommended_internal_links: recommendedInternalLinks // PHASE 2
      },
      competitive_insights: `Analysé ${analyzedResults.length} concurrents. Mot-clé présent dans ${
        analyzedResults.filter(r => 
          r.title.toLowerCase().includes(keyword.toLowerCase()) ||
          r.snippet.toLowerCase().includes(keyword.toLowerCase())
        ).length
      }/${analyzedResults.length} résultats top 5. Liens internes moyens: ${avgInternalLinks.toFixed(1)}`
    };

    console.log('SERP analysis completed:', {
      resultsAnalyzed: analyzedResults.length,
      targetWordCount: analysis.recommended_structure.target_word_count,
      recommendedSections: analysis.recommended_structure.h2_sections.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error analyzing SERP:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Erreur lors de l\'analyse SERP' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
