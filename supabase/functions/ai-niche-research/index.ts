import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NicheRequest {
  userId: string;
  country: string;
  language: string;
  preferences?: string[];
}

interface Niche {
  name: string;
  description: string;
  search_volume: number;
  competition_score: number;
  profit_margin_avg: number;
  seasonality: Record<string, number>;
  top_keywords: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, country, language, preferences }: NicheRequest = await req.json();

    console.log('Starting niche research:', { userId, country, language });

    const preferencesText = preferences?.length 
      ? `Préférences utilisateur : ${preferences.join(', ')}\n` 
      : '';

    const prompt = `Tu es un expert en e-commerce et tendances 2025.

Analyse le marché e-commerce en ${country} (langue: ${language}).
${preferencesText}Identifie 5 niches rentables et peu saturées pour un nouveau shop en ligne.

Pour chaque niche, fournis au format JSON strict :
{
  "niches": [
    {
      "name": "Nom court de la niche",
      "description": "Description en 1 phrase",
      "search_volume": 50000,
      "competition_score": 65,
      "profit_margin_avg": 35,
      "seasonality": {"jan": 80, "feb": 90, "mar": 85, "apr": 75, "may": 70, "jun": 65, "jul": 60, "aug": 70, "sep": 80, "oct": 90, "nov": 95, "dec": 100},
      "top_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
    }
  ]
}

Critères :
- Exclure les niches ultra-saturées (Amazon, Aliexpress dominants)
- Privilégier produits avec marge >25%
- Volume recherche >10k/mois
- Croissance tendance 2024-2025
- Niches adaptées au marché ${country}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result: { niches: Niche[] } = JSON.parse(content);

    console.log('Generated niches:', result.niches.length);

    // Store niches in database
    const nichesToInsert = result.niches.map(niche => ({
      user_id: userId,
      niche_name: niche.name,
      description: niche.description,
      country,
      language,
      search_volume: niche.search_volume,
      competition_score: niche.competition_score,
      profit_margin_avg: niche.profit_margin_avg,
      seasonality: niche.seasonality,
      top_keywords: niche.top_keywords,
    }));

    const { error: insertError } = await supabase
      .from('ai_niche_suggestions')
      .insert(nichesToInsert);

    if (insertError) {
      console.error('Error storing niches:', insertError);
    }

    return new Response(
      JSON.stringify({ niches: result.niches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in niche research:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
