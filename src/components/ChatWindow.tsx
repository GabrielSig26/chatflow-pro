import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MoreVertical, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  tags?: Tag | null;
}

interface Message {
  id: string;
  chat_id: string;
  texto: string;
  tipo: string;
  enviado_por_id: string | null;
  created_at: string;
}

interface ChatWindowProps {
  chatId: string;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChat();
    fetchMessages();
    fetchTags();

    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*, tags(*)')
      .eq('id', chatId)
      .maybeSingle();
    if (data) setChat(data as Chat);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*');
    if (data) setTags(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    await supabase.from('messages').insert({
      chat_id: chatId,
      texto: newMessage.trim(),
      tipo: 'saida',
      enviado_por_id: user?.id,
    });

    await supabase
      .from('chats')
      .update({ status: 'em_atendimento', atendente_atual_id: user?.id })
      .eq('id', chatId);

    setNewMessage('');
    setSending(false);
  };

  const handleUpdateTag = async (tagId: string) => {
    await supabase.from('chats').update({ tag_id: tagId }).eq('id', chatId);
    fetchChat();
  };

  const handleUpdateStatus = async (status: string) => {
    await supabase.from('chats').update({ status }).eq('id', chatId);
    fetchChat();
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-accent/20">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{chat.cliente_nome}</p>
            <p className="text-sm text-muted-foreground">{chat.cliente_numero}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chat.tags && (
            <Badge
              variant="outline"
              style={{ borderColor: chat.tags.cor, color: chat.tags.cor }}
            >
              {chat.tags.nome}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="font-medium" disabled>
                Alterar Tag
              </DropdownMenuItem>
              {tags.map((tag) => (
                <DropdownMenuItem key={tag.id} onClick={() => handleUpdateTag(tag.id)}>
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: tag.cor }}
                  />
                  {tag.nome}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="font-medium" disabled>
                Alterar Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('aberto' as const)}>
                Aberto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('em_atendimento' as const)}>
                Em atendimento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('aguardando' as const)}>
                Aguardando
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('finalizado' as const)}>
                Finalizado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.tipo === 'saida' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-lg shadow-sm ${
                message.tipo === 'saida'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-card text-foreground rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.texto}</p>
              <p
                className={`text-xs mt-1 ${
                  message.tipo === 'saida' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}
              >
                {formatDistanceToNow(new Date(message.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
