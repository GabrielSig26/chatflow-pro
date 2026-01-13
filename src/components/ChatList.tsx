import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface Tag {
  id: string;
  nome: string;
  cor: string;
}
interface Message {
  texto: string;
  created_at: string;
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
  lastMessage?: string;
}
interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}
export function ChatList({
  selectedChatId,
  onSelectChat,
  onNewChat
}: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchChats();
    fetchTags();
    const channel = supabase.channel('chats-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'chats'
    }, () => fetchChats()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const fetchChats = async () => {
    const {
      data: chatsData,
      error
    } = await supabase.from('chats').select('*, tags(*)').order('updated_at', {
      ascending: false
    });
    if (!error && chatsData) {
      // Fetch last message for each chat
      const chatsWithMessages = await Promise.all(chatsData.map(async chat => {
        const {
          data: messageData
        } = await supabase.from('messages').select('texto').eq('chat_id', chat.id).order('created_at', {
          ascending: false
        }).limit(1).maybeSingle();
        return {
          ...chat,
          lastMessage: messageData?.texto || 'Nenhuma mensagem ainda'
        } as Chat;
      }));
      setChats(chatsWithMessages);
    }
    setLoading(false);
  };
  const fetchTags = async () => {
    const {
      data
    } = await supabase.from('tags').select('*').order('nome');
    if (data) setTags(data);
  };
  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.cliente_nome.toLowerCase().includes(search.toLowerCase()) || chat.cliente_numero.includes(search);
    const matchesTags = selectedTags.length === 0 || chat.tag_id && selectedTags.includes(chat.tag_id);
    return matchesSearch && matchesTags;
  });
  const toggleTagFilter = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };
  const clearFilters = () => {
    setSelectedTags([]);
    setSearch('');
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'bg-emerald-500';
      case 'em_atendimento':
        return 'bg-blue-500';
      case 'finalizado':
        return 'bg-muted-foreground';
      case 'aguardando':
        return 'bg-amber-500';
      default:
        return 'bg-muted-foreground';
    }
  };
  return <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-3 bg-[#f0f2f5]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Conversas</h2>
          <Button size="sm" onClick={onNewChat} className="gap-1 h-8">
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou número..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-card" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter className="w-3.5 h-3.5" />
                Tags
                {selectedTags.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {selectedTags.length}
                  </Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {tags.map(tag => <DropdownMenuCheckboxItem key={tag.id} checked={selectedTags.includes(tag.id)} onCheckedChange={() => toggleTagFilter(tag.id)}>
                  <span className="w-3 h-3 rounded-full mr-2" style={{
                backgroundColor: tag.cor
              }} />
                  {tag.nome}
                </DropdownMenuCheckboxItem>)}
              {selectedTags.length > 0 && <>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={false} onCheckedChange={clearFilters} className="text-muted-foreground">
                    <X className="w-3 h-3 mr-2" />
                    Limpar filtros
                  </DropdownMenuCheckboxItem>
                </>}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedTags.length > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </Button>}
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {loading ? <div className="p-4 text-center text-muted-foreground text-sm">
            Carregando conversas...
          </div> : filteredChats.length === 0 ? <div className="p-4 text-center text-muted-foreground text-sm">
            {search || selectedTags.length > 0 ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
          </div> : <div>
            {filteredChats.map(chat => <button key={chat.id} onClick={() => onSelectChat(chat.id)} className={`w-full px-3 py-3 text-left border-b border-border hover:bg-accent/50 transition-colors ${selectedChatId === chat.id ? 'bg-accent' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-lg font-medium text-muted-foreground">
                      {chat.cliente_nome.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground truncate">
                        {chat.cliente_nome}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(chat.updated_at), {
                    addSuffix: false,
                    locale: ptBR
                  })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(chat.status)}`} />
                      <p className="text-sm truncate text-secondary-foreground">
                        {chat.lastMessage}
                      </p>
                    </div>

                    {chat.tags && <Badge variant="outline" className="mt-2 text-xs h-5" style={{
                borderColor: chat.tags.cor,
                color: chat.tags.cor
              }}>
                        {chat.tags.nome}
                      </Badge>}
                  </div>
                </div>
              </button>)}
          </div>}
      </ScrollArea>
    </div>;
}