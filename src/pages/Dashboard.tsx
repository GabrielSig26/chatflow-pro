import { useState } from 'react';
import { ChatList } from '@/components/ChatList';
import { ChatWindow } from '@/components/ChatWindow';
import { NewChatDialog } from '@/components/NewChatDialog';
import { MessageCircle } from 'lucide-react';

export default function Dashboard() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ChatList
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onNewChat={() => setNewChatOpen(true)}
      />
      
      {selectedChatId ? (
        <ChatWindow chatId={selectedChatId} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-accent/20 text-muted-foreground">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-medium text-foreground mb-2">AtendFlow</h2>
          <p className="text-sm">Selecione uma conversa para começar</p>
        </div>
      )}

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onChatCreated={setSelectedChatId}
      />
    </div>
  );
}
