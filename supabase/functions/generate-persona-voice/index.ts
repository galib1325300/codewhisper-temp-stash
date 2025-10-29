import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

// Voice mapping based on gender and persona characteristics with dynamic settings
const VOICE_MAPPINGS = {
  female: [
    { 
      id: "9BWtsMINqrJLrRacOk9x", 
      name: "Aria", 
      style: "professional, clear",
      settings: { stability: 0.65, similarity_boost: 0.80, speed: 1.0 }
    },
    { 
      id: "EXAVITQu4vr4xnSDxMaL", 
      name: "Sarah", 
      style: "warm, expert",
      settings: { stability: 0.55, similarity_boost: 0.85, speed: 1.05 }
    },
    { 
      id: "XB0fDUnXU5powFXDhCwa", 
      name: "Charlotte", 
      style: "dynamic, modern",
      settings: { stability: 0.45, similarity_boost: 0.75, speed: 1.15 }
    },
    { 
      id: "pFZP5JQG7iQjIQuC4Bku", 
      name: "Lily", 
      style: "friendly, approachable",
      settings: { stability: 0.60, similarity_boost: 0.78, speed: 1.08 }
    },
    { 
      id: "XrExE9yKIg1WjnnlVkGX", 
      name: "Matilda", 
      style: "confident, authoritative",
      settings: { stability: 0.70, similarity_boost: 0.82, speed: 1.0 }
    },
  ],
  male: [
    { 
      id: "TX3LPaxmHKxFdv7VOQHJ", 
      name: "Liam", 
      style: "professional, confident",
      settings: { stability: 0.70, similarity_boost: 0.80, speed: 1.0 }
    },
    { 
      id: "IKne3meq5aSn9XLyUdCD", 
      name: "Charlie", 
      style: "friendly, expert",
      settings: { stability: 0.58, similarity_boost: 0.76, speed: 1.10 }
    },
    { 
      id: "onwK4e9ZLuTAKqWW03F9", 
      name: "Daniel", 
      style: "calm, authoritative",
      settings: { stability: 0.75, similarity_boost: 0.85, speed: 0.98 }
    },
    { 
      id: "nPczCjzI2devNBz1zQrb", 
      name: "Brian", 
      style: "trustworthy, clear",
      settings: { stability: 0.68, similarity_boost: 0.79, speed: 1.05 }
    },
    { 
      id: "bIHbv24MWmeRgasZH58o", 
      name: "Will", 
      style: "dynamic, engaging",
      settings: { stability: 0.50, similarity_boost: 0.73, speed: 1.18 }
    },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personaId, returnBase64 } = await req.json();

    if (!personaId) {
      throw new Error("personaId is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Fetch persona details
    const { data: persona, error: personaError } = await supabaseClient
      .from("blog_authors")
      .select("*")
      .eq("id", personaId)
      .single();

    if (personaError || !persona) {
      console.error("Error fetching persona:", personaError);
      throw new Error("Persona not found");
    }

    console.log(`Generating voice for persona: ${persona.name}`);

    // Determine gender from name with exhaustive list
    const firstName = persona.name.split(" ")[0].toLowerCase();
    const maleNames = [
      "théo", "clément", "maxime", "lucas", "antoine", "thomas", "hugo", "léo", 
      "louis", "raphaël", "arthur", "jules", "gabriel", "noah", "adam", "paul",
      "jean", "pierre", "marc", "françois", "laurent", "michel", "philippe", 
      "andré", "bernard", "jacques", "claude", "eric", "david", "christophe", 
      "olivier", "stéphane", "nicolas", "julien", "sébastien", "matthieu", "alexandre",
      "etienne", "romain", "benjamin", "valentin", "guillaume", "florian", "quentin",
      "vincent", "simon", "axel", "tom", "mathis", "enzo", "nathan", "timéo"
    ];
    const isMale = maleNames.some(name => firstName.includes(name));
    const gender = isMale ? "male" : "female";

    console.log(`Persona: ${persona.name}, First name: ${firstName}, Detected gender: ${gender}`);
    console.log(`Current voice_id: ${persona.voice_id || 'none'}`);

    // Select a voice randomly from the appropriate gender, excluding current voice
    let voiceOptions = VOICE_MAPPINGS[gender];
    
    // If regenerating, exclude the current voice to ensure a different one
    if (persona.voice_id) {
      voiceOptions = voiceOptions.filter(voice => voice.id !== persona.voice_id);
      console.log(`Excluding current voice: ${persona.voice_id}`);
    }
    
    // If all voices filtered out (shouldn't happen), use all voices
    if (voiceOptions.length === 0) {
      console.log("No alternative voices found, using all voices");
      voiceOptions = VOICE_MAPPINGS[gender];
    }

    const selectedVoice = voiceOptions[Math.floor(Math.random() * voiceOptions.length)];
    console.log(`Available voices: ${voiceOptions.map(v => v.name).join(', ')}`);
    console.log(`Selected NEW voice: ${selectedVoice.name} (${selectedVoice.id}) - ${selectedVoice.style} for ${gender}`);

    // Generate enhanced presentation text with expertise
    const expertiseText = persona.expertise_areas && persona.expertise_areas.length > 0 
      ? ` spécialisé${isMale ? '' : 'e'} en ${persona.expertise_areas.slice(0, 2).join(' et ')}`
      : '';

    const presentationText = `Bonjour, je suis ${persona.name}, ${persona.title}${expertiseText}. ` +
      `Avec plusieurs années d'expérience, je partage régulièrement des conseils pratiques et des analyses approfondies. ` +
      `Découvrez mes articles pour mieux comprendre ${persona.expertise_areas?.[0] || 'ce domaine'}.`;

    console.log("Calling ElevenLabs API with optimized voice settings...");

    // Call ElevenLabs API
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.id}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: presentationText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: selectedVoice.settings,
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error("ElevenLabs API error:", elevenLabsResponse.status, errorText);
      
      if (elevenLabsResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a few moments.");
      }
      if (elevenLabsResponse.status === 401) {
        throw new Error("Invalid ElevenLabs API key. Please check your configuration.");
      }
      if (elevenLabsResponse.status === 402) {
        throw new Error("Insufficient credits. Please add credits to your ElevenLabs account.");
      }
      
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    // Get audio as array buffer
    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    console.log(`Generated audio size: ${audioBuffer.byteLength} bytes`);

    // If returnBase64 is true, just return the audio data
    if (returnBase64) {
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(audioBuffer))
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          audioContent: base64Audio,
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upload to Supabase Storage
    const fileName = `voice-sample-${personaId}.mp3`;
    const filePath = `${personaId}/${fileName}`;

    console.log(`Uploading audio to: blog-images/${filePath}`);

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("blog-images")
      .upload(filePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading audio:", uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get public URL with cache-buster to force browser reload
    const { data: publicUrlData } = supabaseClient.storage
      .from("blog-images")
      .getPublicUrl(filePath);

    const cacheBuster = Date.now();
    const voiceSampleUrl = `${publicUrlData.publicUrl}?v=${cacheBuster}`;
    console.log(`Audio uploaded successfully: ${voiceSampleUrl}`);

    // Update persona with voice information including voice name and dynamic settings
    const { error: updateError } = await supabaseClient
      .from("blog_authors")
      .update({
        voice_id: selectedVoice.id,
        voice_provider: "elevenlabs",
        voice_sample_url: voiceSampleUrl,
        voice_settings: {
          ...selectedVoice.settings,
          model: "eleven_turbo_v2_5",
          voiceName: selectedVoice.name,
          voiceStyle: selectedVoice.style,
        },
      })
      .eq("id", personaId);

    if (updateError) {
      console.error("Error updating persona:", updateError);
      throw new Error(`Failed to update persona: ${updateError.message}`);
    }

    console.log(`Successfully generated voice for persona ${persona.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        voiceSampleUrl,
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-persona-voice:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
