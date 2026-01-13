import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Tag {
  id: string;
  nome: string;
  cor: string;
}

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chatId: string) => void;
}

export function NewChatDialog({ open, onOpenChange, onChatCreated }: NewChatDialogProps) {
  const [clienteNome, setClienteNome] = useState('');
  const [clienteNumero, setClienteNumero] = useState('');
  const [tagId, setTagId] = useState<string>('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open]);

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*');
    if (data) setTags(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNome.trim() || !clienteNumero.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('chats')
      .insert({
        cliente_nome: clienteNome.trim(),
        cliente_numero: clienteNumero.trim(),
        tag_id: tagId || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao criar conversa',
        description: error.message,
        variant: 'destructive',
      });
    } else if (data) {
      toast({ title: 'Conversa criada!' });
      setClienteNome('');
      setClienteNumero('');
      setTagId('');
      onOpenChange(false);
      onChatCreated(data.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente-nome">Nome do Cliente</Label>
            <Input
              id="cliente-nome"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              placeholder="Ex: João Silva"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente-numero">Número do Cliente</Label>
            <Input
              id="cliente-numero"
              value={clienteNumero}
              onChange={(e) => setClienteNumero(e.target.value)}
              placeholder="Ex: +55 11 99999-9999"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">Tag (opcional)</Label>
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma tag" />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.cor }}
                      />
                      {tag.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Conversa'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
