import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, MessageCircle, Tag } from 'lucide-react';
import { TagsManagement } from '@/components/TagsManagement';
import { ApiSettingsPanel } from '@/components/ApiSettingsPanel';
interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Stats {
  totalChats: number;
  openChats: number;
  totalUsers: number;
  totalTags: number;
}

export default function Admin() {
  const { role } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [stats, setStats] = useState<Stats>({ totalChats: 0, openChats: 0, totalUsers: 0, totalTags: 0 });
  const { toast } = useToast();

  useEffect(() => {
    if (role === 'admin') {
      fetchData();
    }
  }, [role]);

  const fetchData = async () => {
    const [profilesRes, rolesRes, chatsRes, tagsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('chats').select('id, status'),
      supabase.from('tags').select('id'),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (rolesRes.data) setUserRoles(rolesRes.data);
    
    setStats({
      totalChats: chatsRes.data?.length || 0,
      openChats: chatsRes.data?.filter(c => c.status !== 'finalizado').length || 0,
      totalUsers: profilesRes.data?.length || 0,
      totalTags: tagsRes.data?.length || 0,
    });
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'marketing' | 'comercial' | 'suporte') => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Erro ao atualizar função',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Função atualizada!' });
      fetchData();
    }
  };

  const getUserRole = (userId: string) => {
    return userRoles.find(r => r.user_id === userId)?.role || 'suporte';
  };

  const getRoleBadgeColor = (roleValue: string) => {
    switch (roleValue) {
      case 'admin':
        return 'bg-destructive text-destructive-foreground';
      case 'marketing':
        return 'bg-chart-1 text-primary-foreground';
      case 'comercial':
        return 'bg-chart-2 text-primary-foreground';
      default:
        return 'bg-chart-4 text-foreground';
    }
  };

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalChats}</p>
                <p className="text-sm text-muted-foreground">Total de Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-chart-1/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.openChats}</p>
                <p className="text-sm text-muted-foreground">Chats Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                <Tag className="w-6 h-6 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalTags}</p>
                <p className="text-sm text-muted-foreground">Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Usuários</CardTitle>
          <CardDescription>Altere as funções dos usuários do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {profile.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{profile.nome}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeColor(getUserRole(profile.user_id))}>
                    {getUserRole(profile.user_id)}
                  </Badge>
                  <Select
                    value={getUserRole(profile.user_id)}
                    onValueChange={(value: string) => handleRoleChange(profile.user_id, value as 'admin' | 'marketing' | 'comercial' | 'suporte')}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="suporte">Suporte</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Tags Management */}
    <TagsManagement />

    {/* API Settings */}
    <ApiSettingsPanel />
  </div>
);
}
