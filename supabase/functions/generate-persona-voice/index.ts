import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

// Voice mapping based on gender and persona characteristics
const VOICE_MAPPINGS = {
  female: [
    { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", style: "professional, clear" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", style: "warm, expert" },
    { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", style: "dynamic, modern" },
    { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", style: "friendly, approachable" },
    { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", style: "confident, authoritative" },
  ],
  male: [
    { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", style: "professional, confident" },
    { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", style: "friendly, expert" },
    { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", style: "calm, authoritative" },
    { id: "nPczCjzI2devNBz1zQrb", name: "Brian", style: "trustworthy, clear" },
    { id: "bIHbv24MWmeRgasZH58o", name: "Will", style: "dynamic, engaging" },
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

    // Determine gender from name
    const firstName = persona.name.split(" ")[0].toLowerCase();
    const maleNames = ["jean", "pierre", "marc", "françois", "laurent", "michel", "philippe", "andré", "bernard", "jacques", "claude", "eric", "david", "christophe", "olivier"];
    const isMale = maleNames.some(name => firstName.includes(name));
    const gender = isMale ? "male" : "female";

    // Select a voice randomly from the appropriate gender
    const voiceOptions = VOICE_MAPPINGS[gender];
    const selectedVoice = voiceOptions[Math.floor(Math.random() * voiceOptions.length)];

    console.log(`Selected voice: ${selectedVoice.name} (${selectedVoice.style}) for ${gender}`);

    // Generate presentation text
    const presentationText = `Bonjour, je suis ${persona.name}, ${persona.title}. ${persona.bio.slice(0, 200)}`;

    console.log("Calling ElevenLabs API...");

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
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
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

    // Get public URL
    const { data: publicUrlData } = supabaseClient.storage
      .from("blog-images")
      .getPublicUrl(filePath);

    const voiceSampleUrl = publicUrlData.publicUrl;
    console.log(`Audio uploaded successfully: ${voiceSampleUrl}`);

    // Update persona with voice information
    const { error: updateError } = await supabaseClient
      .from("blog_authors")
      .update({
        voice_id: selectedVoice.id,
        voice_provider: "elevenlabs",
        voice_sample_url: voiceSampleUrl,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          model: "eleven_turbo_v2_5",
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
