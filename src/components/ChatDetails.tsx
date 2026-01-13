import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, User, Phone, Tag, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TagData {
  id: string;
  nome: string;
  cor: string;
}

interface Chat {
  id: string;
  cliente_nome: string;
  cliente_numero: string;
  status: string;
  tag_id: string | null;
  created_at: string;
  updated_at: string;
  tags?: TagData | null;
}

interface ChatDetailsProps {
  chatId: string;
  onClose: () => void;
}

export function ChatDetails({ chatId, onClose }: ChatDetailsProps) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChat();
    fetchTags();
  }, [chatId]);

  const fetchChat = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('chats')
      .select('*, tags(*)')
      .eq('id', chatId)
      .maybeSingle();
    if (data) setChat(data as Chat);
    setLoading(false);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('nome');
    if (data) setTags(data);
  };

  const handleUpdateTag = async (tagId: string) => {
    await supabase.from('chats').update({ tag_id: tagId }).eq('id', chatId);
    fetchChat();
  };

  const handleUpdateStatus = async (status: 'aberto' | 'em_atendimento' | 'aguardando' | 'finalizado') => {
    await supabase.from('chats').update({ status }).eq('id', chatId);
    fetchChat();
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberto: 'Aberto',
      em_atendimento: 'Em atendimento',
      aguardando: 'Aguardando',
      finalizado: 'Finalizado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'bg-emerald-500';
      case 'em_atendimento':
        return 'bg-blue-500';
      case 'aguardando':
        return 'bg-amber-500';
      case 'finalizado':
        return 'bg-muted-foreground';
      default:
        return 'bg-muted-foreground';
    }
  };

  if (loading || !chat) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4">
        <h3 className="font-semibold text-foreground">Detalhes</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Client Info */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h4 className="text-lg font-semibold text-foreground">{chat.cliente_nome}</h4>
            <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
              <Phone className="w-4 h-4" />
              {chat.cliente_numero}
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Status do Chat
            </label>
            <Select value={chat.status} onValueChange={(value) => handleUpdateStatus(value as 'aberto' | 'em_atendimento' | 'aguardando' | 'finalizado')}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(chat.status)}`} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aberto">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Aberto
                  </div>
                </SelectItem>
                <SelectItem value="em_atendimento">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Em atendimento
                  </div>
                </SelectItem>
                <SelectItem value="aguardando">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Aguardando
                  </div>
                </SelectItem>
                <SelectItem value="finalizado">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Finalizado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tag */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tag
            </label>
            <Select value={chat.tag_id || ''} onValueChange={handleUpdateTag}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar tag" />
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
            {chat.tags && (
              <Badge
                variant="outline"
                className="mt-2"
                style={{ borderColor: chat.tags.cor, color: chat.tags.cor }}
              >
                {chat.tags.nome}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Histórico</label>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">Última atualização</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(chat.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">Chat criado</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(chat.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
