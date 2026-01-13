import { useState, useEffect } from 'react';
import { ChatList } from '@/components/ChatList';
import { ChatWindow } from '@/components/ChatWindow';
import { ChatDetails } from '@/components/ChatDetails';
import { NewChatDialog } from '@/components/NewChatDialog';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Dashboard() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const isMobile = useIsMobile();

  // On mobile, when a chat is selected, we show the chat window
  // When showDetails is true, we show the details panel
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'details'>('list');

  useEffect(() => {
    if (isMobile) {
      if (showDetails && selectedChatId) {
        setMobileView('details');
      } else if (selectedChatId) {
        setMobileView('chat');
      } else {
        setMobileView('list');
      }
    }
  }, [selectedChatId, showDetails, isMobile]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    if (isMobile) {
      setMobileView('chat');
    }
  };

  const handleBackToList = () => {
    setSelectedChatId(null);
    setShowDetails(false);
    setMobileView('list');
  };

  const handleToggleDetails = () => {
    setShowDetails((prev) => !prev);
    if (isMobile && !showDetails) {
      setMobileView('details');
    } else if (isMobile && showDetails) {
      setMobileView('chat');
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    if (isMobile) {
      setMobileView('chat');
    }
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-3.5rem)] bg-[#f0f2f5]">
        {mobileView === 'list' && (
          <ChatList
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
            onNewChat={() => setNewChatOpen(true)}
          />
        )}

        {mobileView === 'chat' && selectedChatId && (
          <div className="h-full flex flex-col">
            <div className="h-12 bg-[#f0f2f5] border-b border-border flex items-center px-2">
              <Button variant="ghost" size="icon" onClick={handleBackToList}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1">
              <ChatWindow
                chatId={selectedChatId}
                onToggleDetails={handleToggleDetails}
                showDetails={showDetails}
              />
            </div>
          </div>
        )}

        {mobileView === 'details' && selectedChatId && (
          <div className="h-full">
            <ChatDetails chatId={selectedChatId} onClose={handleCloseDetails} />
          </div>
        )}

        <NewChatDialog
          open={newChatOpen}
          onOpenChange={setNewChatOpen}
          onChatCreated={handleSelectChat}
        />
      </div>
    );
  }

  // Desktop Layout with Resizable Panels
  return (
    <div className="h-[calc(100vh-3.5rem)] bg-[#f0f2f5]">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - Chat List */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <ChatList
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
            onNewChat={() => setNewChatOpen(true)}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center Panel - Chat Window */}
        <ResizablePanel defaultSize={showDetails ? 50 : 75} minSize={40}>
          {selectedChatId ? (
            <ChatWindow
              chatId={selectedChatId}
              onToggleDetails={handleToggleDetails}
              showDetails={showDetails}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-[#f0f2f5] text-muted-foreground">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground mb-2">AtendFlow</h2>
              <p className="text-sm text-center max-w-xs">
                Selecione uma conversa para começar ou crie uma nova conversa
              </p>
            </div>
          )}
        </ResizablePanel>

        {/* Right Panel - Chat Details (Collapsible) */}
        {showDetails && selectedChatId && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <ChatDetails chatId={selectedChatId} onClose={handleCloseDetails} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onChatCreated={handleSelectChat}
      />
    </div>
  );
}
