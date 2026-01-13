import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MoreVertical, User, Info, UserCheck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

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

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
}

interface ChatWindowProps {
  chatId: string;
  onToggleDetails: () => void;
  showDetails: boolean;
}

export function ChatWindow({ chatId, onToggleDetails, showDetails }: ChatWindowProps) {
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [sending, setSending] = useState(false);
  const [assumingChat, setAssumingChat] = useState(false);
  const [attendantProfile, setAttendantProfile] = useState<Profile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isObserverMode = chat?.atendente_atual_id && chat.atendente_atual_id !== user?.id;
  const canAssumeChat = !chat?.atendente_atual_id;

  useEffect(() => {
    fetchChat();
    fetchMessages();
    fetchTags();

    // Channel for messages realtime
    const messagesChannel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    // Channel for chat realtime (to track attendant changes)
    const chatChannel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${chatId}` },
        (payload) => {
          const updatedChat = payload.new as Chat;
          setChat((prev) => prev ? { ...prev, ...updatedChat } : null);
          
          // Fetch new attendant profile if changed
          if (updatedChat.atendente_atual_id && updatedChat.atendente_atual_id !== user?.id) {
            fetchAttendantProfile(updatedChat.atendente_atual_id);
          } else {
            setAttendantProfile(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [chatId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isObserverMode) {
      inputRef.current?.focus();
    }
  }, [chatId, isObserverMode]);

  // Fetch attendant profile when chat has an attendant
  useEffect(() => {
    if (chat?.atendente_atual_id && chat.atendente_atual_id !== user?.id) {
      fetchAttendantProfile(chat.atendente_atual_id);
    } else {
      setAttendantProfile(null);
    }
  }, [chat?.atendente_atual_id, user?.id]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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

  const fetchAttendantProfile = async (attendantId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', attendantId)
      .maybeSingle();
    if (data) setAttendantProfile(data);
  };

  const handleAssumeChat = async () => {
    if (!user?.id || assumingChat) return;
    
    setAssumingChat(true);
    try {
      await supabase
        .from('chats')
        .update({ 
          atendente_atual_id: user.id,
          status: 'em_atendimento'
        })
        .eq('id', chatId);
      
      await fetchChat();
    } finally {
      setAssumingChat(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || isObserverMode) return;

    setSending(true);
    try {
      await supabase.from('messages').insert({
        chat_id: chatId,
        texto: newMessage.trim(),
        tipo: 'saida',
        enviado_por_id: user?.id,
      });

      // Update chat status and attendant if not already set
      if (!chat?.atendente_atual_id) {
        await supabase
          .from('chats')
          .update({ status: 'em_atendimento', atendente_atual_id: user?.id })
          .eq('id', chatId);
      }

      setNewMessage('');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleUpdateTag = async (tagId: string) => {
    await supabase.from('chats').update({ tag_id: tagId }).eq('id', chatId);
    fetchChat();
  };

  const handleUpdateStatus = async (status: 'aberto' | 'em_atendimento' | 'aguardando' | 'finalizado') => {
    await supabase.from('chats').update({ status }).eq('id', chatId);
    fetchChat();
  };

  if (!chat) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-[#f0f2f5]">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#efeae2]">
      {/* Header */}
      <div className="h-16 border-b border-border bg-[#f0f2f5] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{chat.cliente_nome}</p>
            <p className="text-xs text-muted-foreground">{chat.cliente_numero}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canAssumeChat && (
            <Button
              variant="default"
              size="sm"
              onClick={handleAssumeChat}
              disabled={assumingChat}
              className="mr-2"
            >
              <UserCheck className="w-4 h-4 mr-1" />
              {assumingChat ? 'Assumindo...' : 'Assumir Atendimento'}
            </Button>
          )}
          {chat.tags && (
            <Badge
              variant="outline"
              className="mr-2"
              style={{ borderColor: chat.tags.cor, color: chat.tags.cor }}
            >
              {chat.tags.nome}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDetails}
            className={showDetails ? 'bg-accent' : ''}
          >
            <Info className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="font-medium text-muted-foreground" disabled>
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
              <DropdownMenuItem className="font-medium text-muted-foreground" disabled>
                Alterar Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('aberto')}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                Aberto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('em_atendimento')}>
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                Em atendimento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('aguardando')}>
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                Aguardando
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('finalizado')}>
                <span className="w-2 h-2 rounded-full bg-muted-foreground mr-2" />
                Finalizado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm bg-card/80 px-4 py-2 rounded-lg">
              Nenhuma mensagem ainda. Envie uma mensagem para começar.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.tipo === 'saida' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[65%] px-3 py-2 rounded-lg shadow-sm ${
                  message.tipo === 'saida'
                    ? 'bg-[#dcf8c6] text-foreground rounded-tr-none'
                    : 'bg-card text-foreground rounded-tl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.texto}</p>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {format(new Date(message.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Observer Mode Banner */}
      {isObserverMode && (
        <Alert className="mx-3 mb-2 border-amber-500 bg-amber-50">
          <Eye className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Modo Observador:</strong> O atendente{' '}
            <span className="font-semibold">{attendantProfile?.nome || 'Carregando...'}</span> está
            cuidando desta conversa.
          </AlertDescription>
        </Alert>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-[#f0f2f5] border-t border-border shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder={isObserverMode ? 'Você está no modo observador' : 'Digite uma mensagem...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-card"
            disabled={isObserverMode}
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sending || isObserverMode} 
            size="icon"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
