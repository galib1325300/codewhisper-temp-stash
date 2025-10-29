import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, User, Award, Linkedin, Twitter, Globe, Sparkles, RefreshCw, Camera, Volume2, Mic } from 'lucide-react';
import { toast } from 'sonner';

interface BlogAuthor {
  id: string;
  name: string;
  title: string;
  bio: string;
  expertise_areas: string[];
  credentials?: string;
  avatar_url?: string;
  voice_id?: string;
  voice_provider?: string;
  voice_sample_url?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    model?: string;
    voiceName?: string;
    voiceStyle?: string;
  };
  social_links?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

interface AuthorManagementProps {
  shopId: string;
}

export default function AuthorManagement({ shopId }: AuthorManagementProps) {
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<BlogAuthor | null>(null);
  const [generatingPersonas, setGeneratingPersonas] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState<string | null>(null);
  const [generatingFormAvatar, setGeneratingFormAvatar] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [generatingVoice, setGeneratingVoice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    bio: '',
    expertise_areas: '',
    credentials: '',
    avatar_url: '',
    linkedin: '',
    twitter: '',
    website: ''
  });

  useEffect(() => {
    loadAuthors();
  }, [shopId]);

  const loadAuthors = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_authors')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuthors((data || []) as BlogAuthor[]);
    } catch (error) {
      console.error('Error loading authors:', error);
      toast.error('Erreur lors du chargement des auteurs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const authorData = {
        shop_id: shopId,
        name: formData.name,
        title: formData.title,
        bio: formData.bio,
        expertise_areas: formData.expertise_areas.split(',').map(a => a.trim()).filter(Boolean),
        credentials: formData.credentials || null,
        avatar_url: formData.avatar_url || null,
        social_links: {
          linkedin: formData.linkedin || undefined,
          twitter: formData.twitter || undefined,
          website: formData.website || undefined
        }
      };

      if (editingAuthor) {
        const { error } = await supabase
          .from('blog_authors')
          .update(authorData)
          .eq('id', editingAuthor.id);
        
        if (error) throw error;
        toast.success('Auteur mis à jour avec succès');
      } else {
        const { error } = await supabase
          .from('blog_authors')
          .insert([authorData]);
        
        if (error) throw error;
        toast.success('Auteur créé avec succès');
      }

      setIsDialogOpen(false);
      resetForm();
      loadAuthors();
    } catch (error) {
      console.error('Error saving author:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (author: BlogAuthor) => {
    setEditingAuthor(author);
    setFormData({
      name: author.name,
      title: author.title,
      bio: author.bio,
      expertise_areas: author.expertise_areas.join(', '),
      credentials: author.credentials || '',
      avatar_url: author.avatar_url || '',
      linkedin: author.social_links?.linkedin || '',
      twitter: author.social_links?.twitter || '',
      website: author.social_links?.website || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet auteur ?')) return;

    try {
      const { error } = await supabase
        .from('blog_authors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Auteur supprimé');
      loadAuthors();
    } catch (error) {
      console.error('Error deleting author:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleGeneratePersonas = async () => {
    setGeneratingPersonas(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-eeat-personas', {
        body: { shopId }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(`✨ ${data.count} auteur${data.count > 1 ? 's' : ''} généré${data.count > 1 ? 's' : ''} avec succès`);
      await loadAuthors();
    } catch (error: any) {
      console.error('Error generating personas:', error);
      toast.error(error.message || 'Erreur lors de la génération des auteurs');
    } finally {
      setGeneratingPersonas(false);
    }
  };

  const handleGenerateAvatar = async (authorId: string) => {
    setGeneratingAvatar(authorId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-persona-avatar', {
        body: { personaId: authorId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Avatar généré avec succès !');
        loadAuthors();
      } else {
        toast.error(data.error || 'Erreur lors de la génération de l\'avatar');
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast.error('Erreur lors de la génération de l\'avatar');
    } finally {
      setGeneratingAvatar(null);
    }
  };

  const handleGenerateFormAvatar = async () => {
    if (!formData.name || !formData.title) {
      toast.error('Veuillez d\'abord saisir le nom et le titre');
      return;
    }

    setGeneratingFormAvatar(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-persona-avatar', {
        body: { 
          personaData: {
            name: formData.name,
            title: formData.title,
            bio: formData.bio || 'Expert du domaine'
          },
          returnBase64: true
        }
      });

      if (error) throw error;

      if (data?.avatar_url) {
        setPreviewAvatar(data.avatar_url);
        setFormData({ ...formData, avatar_url: data.avatar_url });
        toast.success('Avatar généré !');
      } else {
        toast.error(data?.error || 'Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error generating avatar:', error);
      toast.error(error.message || 'Erreur lors de la génération de l\'avatar');
    } finally {
      setGeneratingFormAvatar(false);
    }
  };

  const handleGenerateVoice = async (authorId: string) => {
    setGeneratingVoice(authorId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-persona-voice', {
        body: { personaId: authorId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Voix générée avec succès !');
        loadAuthors();
      } else {
        toast.error(data.error || 'Erreur lors de la génération de la voix');
      }
    } catch (error: any) {
      console.error('Error generating voice:', error);
      if (error.message.includes('Rate limit')) {
        toast.error('Limite de taux dépassée. Veuillez réessayer dans quelques instants.');
      } else if (error.message.includes('credits')) {
        toast.error('Crédits insuffisants. Veuillez ajouter des crédits à votre compte ElevenLabs.');
      } else {
        toast.error('Erreur lors de la génération de la voix');
      }
    } finally {
      setGeneratingVoice(null);
    }
  };

  const handlePlayVoice = (author: BlogAuthor) => {
    if (!author.voice_sample_url) {
      toast.error('Aucune voix disponible pour cet auteur');
      return;
    }

    // Stop any currently playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    if (playingVoice === author.id) {
      setPlayingVoice(null);
      setAudioElement(null);
      return;
    }

    // Add cache-buster to force reload of new audio
    const audioUrl = `${author.voice_sample_url}${author.voice_sample_url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const audio = new Audio(audioUrl);
    audio.addEventListener('ended', () => {
      setPlayingVoice(null);
      setAudioElement(null);
    });
    audio.addEventListener('error', () => {
      toast.error('Erreur lors de la lecture de la voix');
      setPlayingVoice(null);
      setAudioElement(null);
    });

    audio.play();
    setPlayingVoice(author.id);
    setAudioElement(audio);
  };

  const resetForm = () => {
    setEditingAuthor(null);
    setPreviewAvatar(null);
    setFormData({
      name: '',
      title: '',
      bio: '',
      expertise_areas: '',
      credentials: '',
      avatar_url: '',
      linkedin: '',
      twitter: '',
      website: ''
    });
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des auteurs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Personas E-E-A-T</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les profils d'auteurs pour renforcer l'expertise et la crédibilité
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGeneratePersonas}
            disabled={generatingPersonas}
          >
            {generatingPersonas ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer automatiquement
              </>
            )}
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvel auteur
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAuthor ? 'Modifier l\'auteur' : 'Nouvel auteur'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom complet *</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Dr. Marie Dupont"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Titre/Fonction *</label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Experte SEO & Marketing Digital"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bio professionnelle *</label>
                <Textarea
                  required
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Avec plus de 10 ans d'expérience en SEO..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Domaines d'expertise *</label>
                <Input
                  required
                  value={formData.expertise_areas}
                  onChange={(e) => setFormData({...formData, expertise_areas: e.target.value})}
                  placeholder="SEO, Content Marketing, Analytics (séparés par des virgules)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Certifications & Diplômes</label>
                <Textarea
                  rows={2}
                  value={formData.credentials}
                  onChange={(e) => setFormData({...formData, credentials: e.target.value})}
                  placeholder="Master en Marketing Digital, Certification Google Analytics..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Avatar</label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      type="url"
                      value={formData.avatar_url}
                      onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
                      placeholder="https://exemple.com/avatar.jpg"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateFormAvatar}
                    disabled={generatingFormAvatar || !formData.name || !formData.title}
                  >
                    {generatingFormAvatar ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Générer
                      </>
                    )}
                  </Button>
                </div>
                {previewAvatar && (
                  <div className="mt-2">
                    <img src={previewAvatar} alt="Aperçu" className="w-20 h-20 rounded-full object-cover" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Réseaux sociaux</label>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="url"
                      value={formData.twitter}
                      onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="https://monsite.com"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingAuthor ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {authors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun auteur créé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez des profils d'auteurs experts pour renforcer la crédibilité de vos articles
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier auteur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {authors.map((author) => (
             <Card key={author.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="relative group">
                      {author.avatar_url ? (
                        <img 
                          src={author.avatar_url} 
                          alt={author.name}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateAvatar(author.id);
                        }}
                        disabled={generatingAvatar === author.id}
                        className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Générer l'avatar"
                      >
                        {generatingAvatar === author.id ? (
                          <RefreshCw className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5 text-white" />
                        )}
                      </button>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{author.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{author.title}</p>
                      {author.voice_id && author.voice_settings?.voiceName && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          <Mic className="h-3 w-3 mr-1" />
                          Voix : {author.voice_settings.voiceName}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(author)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(author.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{author.bio}</p>
                
                <div className="flex flex-wrap gap-1">
                  {author.expertise_areas.map((area, idx) => (
                    <Badge key={idx} variant="secondary">
                      {area}
                    </Badge>
                  ))}
                </div>

                {author.credentials && (
                  <div className="flex items-start gap-2 text-sm">
                    <Award className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-muted-foreground line-clamp-2">{author.credentials}</p>
                  </div>
                )}

                {author.social_links && (
                  <div className="flex gap-2">
                    {author.social_links.linkedin && (
                      <a href={author.social_links.linkedin} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Linkedin className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                    {author.social_links.twitter && (
                      <a href={author.social_links.twitter} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Twitter className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                    {author.social_links.website && (
                      <a href={author.social_links.website} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Globe className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {author.voice_sample_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayVoice(author)}
                      disabled={generatingVoice === author.id}
                      className="flex-1"
                    >
                      {playingVoice === author.id ? (
                        <>
                          <Volume2 className="h-4 w-4 mr-2 animate-pulse" />
                          En lecture...
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4 mr-2" />
                          Écouter la voix
                        </>
                      )}
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateVoice(author.id)}
                    disabled={generatingVoice === author.id}
                    className="flex-1"
                  >
                    {generatingVoice === author.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        {author.voice_sample_url ? 'Régénérer' : 'Générer une voix'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
