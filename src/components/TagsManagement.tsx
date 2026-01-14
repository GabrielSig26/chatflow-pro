import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface TagData {
  id: string;
  nome: string;
  cor: string;
  created_at: string;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export function TagsManagement() {
  const { role } = useAuth();
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [tagToDelete, setTagToDelete] = useState<TagData | null>(null);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const canManage = role === 'admin' || role === 'marketing';

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('nome');

    if (!error && data) {
      setTags(data);
    }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingTag(null);
    setNome('');
    setCor('#3b82f6');
    setDialogOpen(true);
  };

  const handleOpenEdit = (tag: TagData) => {
    setEditingTag(tag);
    setNome(tag.nome);
    setCor(tag.cor);
    setDialogOpen(true);
  };

  const handleOpenDelete = (tag: TagData) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome para a tag',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    if (editingTag) {
      const { error } = await supabase
        .from('tags')
        .update({ nome: nome.trim(), cor })
        .eq('id', editingTag.id);

      if (error) {
        toast({
          title: 'Erro ao atualizar',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Tag atualizada com sucesso!' });
        setDialogOpen(false);
        fetchTags();
      }
    } else {
      const { error } = await supabase
        .from('tags')
        .insert({ nome: nome.trim(), cor });

      if (error) {
        toast({
          title: 'Erro ao criar',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Tag criada com sucesso!' });
        setDialogOpen(false);
        fetchTags();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagToDelete.id);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Tag excluída com sucesso!' });
      fetchTags();
    }

    setDeleteDialogOpen(false);
    setTagToDelete(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Gerenciar Tags
            </CardTitle>
            <CardDescription>
              Tags para categorizar conversas
            </CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={handleOpenCreate} className="gap-1">
              <Plus className="w-4 h-4" />
              Nova Tag
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            Carregando tags...
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            Nenhuma tag cadastrada
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: tag.cor }}
                  />
                  <Badge
                    variant="outline"
                    style={{ borderColor: tag.cor, color: tag.cor }}
                  >
                    {tag.nome}
                  </Badge>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(tag)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleOpenDelete(tag)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'Editar Tag' : 'Nova Tag'}
            </DialogTitle>
            <DialogDescription>
              {editingTag
                ? 'Atualize as informações da tag'
                : 'Crie uma nova tag para categorizar conversas'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-nome">Nome</Label>
              <Input
                id="tag-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da tag"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      cor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="custom-color" className="text-xs text-muted-foreground">
                  Cor personalizada:
                </Label>
                <Input
                  id="custom-color"
                  type="color"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="w-12 h-8 p-0.5 cursor-pointer"
                />
                <Input
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="w-24 h-8 text-xs"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
              <div className="mt-2">
                <Badge
                  variant="outline"
                  style={{ borderColor: cor, color: cor }}
                >
                  {nome || 'Nome da tag'}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingTag ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag "{tagToDelete?.nome}"? 
              Chats vinculados a esta tag perderão a associação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
