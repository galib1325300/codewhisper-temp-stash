import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Users, Mail, UserPlus, Shield, Clock, CheckCircle } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  lastActivity: string;
  permissions: string[];
  shops: string[];
}

interface TeamManagementProps {
  className?: string;
}

export default function TeamManagement({ className }: TeamManagementProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Marie Dubois',
      email: 'marie.dubois@example.com',
      avatar: '',
      role: 'owner',
      status: 'active',
      lastActivity: '2024-01-20T14:30:00Z',
      permissions: ['all'],
      shops: ['all']
    },
    {
      id: '2',
      name: 'Pierre Martin',
      email: 'pierre.martin@example.com',
      avatar: '',
      role: 'admin',
      status: 'active',
      lastActivity: '2024-01-20T10:15:00Z',
      permissions: ['manage_seo', 'view_analytics', 'manage_content'],
      shops: ['1', '2', '3']
    },
    {
      id: '3',
      name: 'Sophie Bernard',
      email: 'sophie.bernard@example.com',
      avatar: '',
      role: 'editor',
      status: 'active',
      lastActivity: '2024-01-19T16:45:00Z',
      permissions: ['manage_content', 'view_analytics'],
      shops: ['1', '2']
    },
    {
      id: '4',
      name: 'Lucas Petit',
      email: 'lucas.petit@example.com',
      avatar: '',
      role: 'viewer',
      status: 'pending',
      lastActivity: '',
      permissions: ['view_analytics'],
      shops: ['1']
    }
  ];

  const roles = [
    {
      id: 'owner',
      name: 'Propriétaire',
      description: 'Accès complet à tous les paramètres et boutiques',
      permissions: ['Gestion équipe', 'Facturation', 'Tous les accès']
    },
    {
      id: 'admin',
      name: 'Administrateur',
      description: 'Gestion des boutiques et des optimisations SEO',
      permissions: ['Gestion SEO', 'Analytics', 'Gestion contenu']
    },
    {
      id: 'editor',
      name: 'Éditeur',
      description: 'Modification du contenu et accès aux analytics',
      permissions: ['Gestion contenu', 'Analytics', 'Optimisations']
    },
    {
      id: 'viewer',
      name: 'Observateur',
      description: 'Accès en lecture seule aux rapports',
      permissions: ['Lecture analytics', 'Rapports']
    }
  ];

  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'editor': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: TeamMember['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'inactive': return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion d'Équipe</h2>
          <p className="text-muted-foreground">Gérez les accès et permissions de votre équipe</p>
        </div>
        <Button onClick={() => setShowInviteForm(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Inviter un membre
        </Button>
      </div>

      {showInviteForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inviter un nouveau membre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite-email">Adresse email</Label>
                <Input id="invite-email" type="email" placeholder="email@exemple.com" />
              </div>
              <div>
                <Label htmlFor="invite-role">Rôle</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="editor">Éditeur</SelectItem>
                    <SelectItem value="viewer">Observateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Accès aux boutiques</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Switch id="shop-1" />
                  <Label htmlFor="shop-1">Boutique Mode Premium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="shop-2" />
                  <Label htmlFor="shop-2">Tech Store Pro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="shop-3" />
                  <Label htmlFor="shop-3">Beauty Corner</Label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button>
                <Mail className="w-4 h-4 mr-2" />
                Envoyer l'invitation
              </Button>
              <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">Membres</TabsTrigger>
          <TabsTrigger value="roles">Rôles & Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-foreground">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getRoleColor(member.role)}>
                          <Shield className="w-3 h-3 mr-1" />
                          {member.role === 'owner' ? 'Propriétaire' :
                           member.role === 'admin' ? 'Admin' :
                           member.role === 'editor' ? 'Éditeur' : 'Observateur'}
                        </Badge>
                        <Badge className={getStatusColor(member.status)}>
                          {getStatusIcon(member.status)}
                          <span className="ml-1 capitalize">
                            {member.status === 'active' ? 'Actif' : 
                             member.status === 'pending' ? 'En attente' : 'Inactif'}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Dernière activité</p>
                      <p className="text-sm font-medium">
                        {member.lastActivity ? 
                          new Date(member.lastActivity).toLocaleDateString() : 
                          'Jamais connecté'
                        }
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                      {member.role !== 'owner' && (
                        <Button variant="outline" size="sm">
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Permissions</p>
                      <div className="flex flex-wrap gap-1">
                        {member.permissions.map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission === 'all' ? 'Tous les accès' :
                             permission === 'manage_seo' ? 'Gestion SEO' :
                             permission === 'view_analytics' ? 'Analytics' :
                             permission === 'manage_content' ? 'Contenu' : permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Boutiques</p>
                      <p className="text-sm text-muted-foreground">
                        {member.shops.includes('all') ? 'Toutes les boutiques' : 
                         `${member.shops.length} boutique(s) assignée(s)`}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <p className="text-muted-foreground">{role.description}</p>
                  </div>
                  <Badge variant="outline">
                    {teamMembers.filter(m => m.role === role.id).length} membre(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permission, index) => (
                    <Badge key={index} variant="secondary">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Journal d'activité</h3>
            <p className="text-muted-foreground">
              Le suivi d'activité de l'équipe sera disponible prochainement
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}