import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

export default function Settings() {
  const { profile, user, role } = useAuth();
  const [nome, setNome] = useState(profile?.nome || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ nome })
      .eq('user_id', user.id);

    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Perfil atualizado!' });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Configurações</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Gerencie suas informações pessoais</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email || ''} disabled />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado
              </p>
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <div className="px-3 py-2 bg-muted rounded-lg text-sm capitalize">
                {role || 'suporte'}
              </div>
              <p className="text-xs text-muted-foreground">
                A função é definida pelo administrador
              </p>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
