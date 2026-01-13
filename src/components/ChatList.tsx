import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Tag {
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
  atendente_atual_id: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag | null;
}

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatList({ selectedChatId, onSelectChat, onNewChat }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();

    const channel = supabase
      .channel('chats-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => fetchChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*, tags(*)')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setChats(data as Chat[]);
    }
    setLoading(false);
  };

  const filteredChats = chats.filter(
    (chat) =>
      chat.cliente_nome.toLowerCase().includes(search.toLowerCase()) ||
      chat.cliente_numero.includes(search)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'bg-chart-2 text-primary-foreground';
      case 'em_atendimento':
        return 'bg-chart-1 text-primary-foreground';
      case 'finalizado':
        return 'bg-muted text-muted-foreground';
      case 'aguardando':
        return 'bg-chart-4 text-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Conversas</h2>
          <Button size="sm" onClick={onNewChat} className="gap-1">
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">Carregando...</div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full p-4 text-left border-b border-border hover:bg-accent/50 transition-colors ${
                selectedChatId === chat.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{chat.cliente_nome}</p>
                  <p className="text-sm text-muted-foreground">{chat.cliente_numero}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(chat.updated_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className={getStatusColor(chat.status)}>
                  {chat.status.replace('_', ' ')}
                </Badge>
                {chat.tags && (
                  <Badge
                    variant="outline"
                    style={{ borderColor: chat.tags.cor, color: chat.tags.cor }}
                  >
                    {chat.tags.nome}
                  </Badge>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
