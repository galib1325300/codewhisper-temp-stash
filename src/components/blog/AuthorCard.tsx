import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Award, Linkedin, Twitter, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthorCardProps {
  author: {
    name: string;
    title: string;
    bio: string;
    expertise_areas: string[];
    credentials?: string;
    avatar_url?: string;
    social_links?: {
      linkedin?: string;
      twitter?: string;
      website?: string;
    };
  };
}

export default function AuthorCard({ author }: AuthorCardProps) {
  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {author.avatar_url ? (
            <img 
              src={author.avatar_url} 
              alt={author.name}
              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-xl font-bold text-foreground">{author.name}</h3>
              <p className="text-sm text-muted-foreground">{author.title}</p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{author.bio}</p>

            <div className="flex flex-wrap gap-1">
              {author.expertise_areas.map((area, idx) => (
                <Badge key={idx} variant="secondary">
                  {area}
                </Badge>
              ))}
            </div>

            {author.credentials && (
              <div className="flex items-start gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                <Award className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground">{author.credentials}</p>
              </div>
            )}

            {author.social_links && (
              <div className="flex gap-2">
                {author.social_links.linkedin && (
                  <a href={author.social_links.linkedin} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </Button>
                  </a>
                )}
                {author.social_links.twitter && (
                  <a href={author.social_links.twitter} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Twitter className="h-4 w-4 mr-2" />
                      Twitter
                    </Button>
                  </a>
                )}
                {author.social_links.website && (
                  <a href={author.social_links.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Globe className="h-4 w-4 mr-2" />
                      Site web
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
