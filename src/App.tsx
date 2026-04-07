import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Bot, 
  Users, 
  Settings, 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  Video,
  Check,
  CheckCheck,
  Clock
} from 'lucide-react';
import { cn, formatDate } from './lib/utils';
import { supabase } from './lib/supabase';

// --- Types ---
type View = 'chat' | 'dashboard' | 'bot' | 'agents' | 'settings';

interface Message {
  id: string;
  text: string;
  sender: 'agent' | 'contact';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatar: string;
  status: 'online' | 'offline';
}

// --- Mock Data ---
const MOCK_CONTACTS: Contact[] = [
  { id: '1', name: 'João Silva', phone: '+55 11 99999-9999', lastMessage: 'Olá, gostaria de saber o preço...', lastMessageTime: new Date().toISOString(), unreadCount: 2, avatar: 'https://picsum.photos/seed/joao/100', status: 'online' },
  { id: '2', name: 'Maria Souza', phone: '+55 11 88888-8888', lastMessage: 'Obrigado pelo atendimento!', lastMessageTime: new Date(Date.now() - 3600000).toISOString(), unreadCount: 0, avatar: 'https://picsum.photos/seed/maria/100', status: 'offline' },
  { id: '3', name: 'Carlos Oliveira', phone: '+55 11 77777-7777', lastMessage: 'Pode me enviar o catálogo?', lastMessageTime: new Date(Date.now() - 86400000).toISOString(), unreadCount: 0, avatar: 'https://picsum.photos/seed/carlos/100', status: 'online' },
];

const MOCK_MESSAGES: Message[] = [
  { id: '1', text: 'Olá! Como posso ajudar?', sender: 'agent', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'read' },
  { id: '2', text: 'Gostaria de saber o preço do plano Pro.', sender: 'contact', timestamp: new Date(Date.now() - 7100000).toISOString(), status: 'read' },
  { id: '3', text: 'O plano Pro custa R$ 99/mês.', sender: 'agent', timestamp: new Date(Date.now() - 7000000).toISOString(), status: 'read' },
  { id: '4', text: 'Excelente, vou analisar.', sender: 'contact', timestamp: new Date(Date.now() - 6900000).toISOString(), status: 'read' },
];

export default function App() {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(MOCK_CONTACTS[0]);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'agent',
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-16 md:w-20 bg-[#111b21] flex flex-col items-center py-6 gap-8 z-50">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <MessageSquare className="text-white w-6 h-6" />
        </div>
        
        <div className="flex flex-col gap-4 flex-1">
          <NavButton active={currentView === 'chat'} onClick={() => setCurrentView('chat')} icon={<MessageSquare />} label="Chat" />
          <NavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavButton active={currentView === 'bot'} onClick={() => setCurrentView('bot')} icon={<Bot />} label="Bot" />
          <NavButton active={currentView === 'agents'} onClick={() => setCurrentView('agents')} icon={<Users />} label="Agentes" />
        </div>

        <NavButton active={currentView === 'settings'} onClick={() => setCurrentView('settings')} icon={<Settings />} label="Ajustes" />
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex w-full h-full"
            >
              {/* Contacts List */}
              <div className="w-80 md:w-96 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 bg-[#f0f2f5] flex items-center justify-between">
                  <h1 className="text-xl font-bold text-gray-800">Conversas</h1>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><Search className="w-5 h-5 text-gray-600" /></button>
                    <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><MoreVertical className="w-5 h-5 text-gray-600" /></button>
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar ou começar nova conversa" 
                      className="w-full bg-gray-100 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {MOCK_CONTACTS.map(contact => (
                    <ContactItem 
                      key={contact.id} 
                      contact={contact} 
                      active={selectedContact?.id === contact.id}
                      onClick={() => setSelectedContact(contact)}
                    />
                  ))}
                </div>
              </div>

              {/* Chat Window */}
              <div className="flex-1 flex flex-col bg-[#efeae2] relative">
                {selectedContact ? (
                  <>
                    {/* Chat Header */}
                    <header className="h-16 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between px-4 z-10">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={selectedContact.avatar} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                          {selectedContact.status === 'online' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />}
                        </div>
                        <div>
                          <h2 className="font-semibold text-gray-800 leading-tight">{selectedContact.name}</h2>
                          <p className="text-xs text-gray-500">{selectedContact.status === 'online' ? 'online' : 'visto por último hoje'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><Phone className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><Video className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><MoreVertical className="w-5 h-5" /></button>
                      </div>
                    </header>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-2 custom-scrollbar">
                      {messages.map((msg, idx) => (
                        <MessageBubble key={msg.id} message={msg} showTail={idx === 0 || messages[idx-1].sender !== msg.sender} />
                      ))}
                    </div>

                    {/* Input Area */}
                    <footer className="p-3 bg-[#f0f2f5] flex items-center gap-3">
                      <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600">
                        <svg viewBox="0 0 24 24" width="24" height="24" className="w-6 h-6"><path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"></path></svg>
                      </button>
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Digite uma mensagem" 
                        className="flex-1 bg-white rounded-lg py-2.5 px-4 focus:outline-none shadow-sm"
                      />
                      <button 
                        onClick={handleSendMessage}
                        className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-all active:scale-95"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </footer>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-12 h-12 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-light mb-2">ZapFlow Pro para Web</h2>
                    <p className="max-w-md">Envie e receba mensagens sem precisar manter seu celular conectado. Use o ZapFlow Pro em até 4 dispositivos conectados e um celular ao mesmo tempo.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentView === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 p-8 overflow-y-auto bg-gray-50"
            >
              <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard de Performance</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total de Conversas" value="1,284" change="+12.5%" icon={<MessageSquare className="text-blue-500" />} />
                <StatCard title="Tempo Médio Resp." value="4m 12s" change="-2m" icon={<Clock className="text-orange-500" />} />
                <StatCard title="Taxa de Resolução" value="94.2%" change="+2.4%" icon={<CheckCheck className="text-emerald-500" />} />
                <StatCard title="Novos Contatos" value="342" change="+18%" icon={<Users className="text-purple-500" />} />
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <h2 className="text-lg font-semibold mb-6">Volume de Mensagens (Últimos 7 dias)</h2>
                <div className="h-64 w-full bg-gray-50 rounded-lg flex items-end justify-between px-8 pb-4 gap-2">
                  {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1 max-w-[40px]">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        className="w-full bg-emerald-500 rounded-t-md"
                      />
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Dia {i+1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-components ---

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative p-3 rounded-xl transition-all group",
        active ? "bg-emerald-500/10 text-emerald-500" : "text-gray-500 hover:text-white hover:bg-white/5"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      <span className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {label}
      </span>
      {active && <motion.div layoutId="nav-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />}
    </button>
  );
}

function ContactItem({ contact, active, onClick }: { contact: Contact, active: boolean, onClick: () => void, key?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 border-b border-gray-100 transition-colors text-left",
        active ? "bg-[#f0f2f5]" : "hover:bg-gray-50"
      )}
    >
      <img src={contact.avatar} alt="" className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="font-semibold text-gray-800 truncate">{contact.name}</h3>
          <span className="text-[10px] text-gray-400">{formatDate(contact.lastMessageTime).split(' ')[1]}</span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 truncate">{contact.lastMessage}</p>
          {contact.unreadCount > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {contact.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, showTail }: { message: Message, showTail: boolean, key?: string }) {
  const isAgent = message.sender === 'agent';
  return (
    <div className={cn(
      "flex w-full mb-1",
      isAgent ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%] md:max-w-[65%] p-2 rounded-lg shadow-sm relative text-sm",
        isAgent ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none",
        !showTail && "rounded-t-lg"
      )}>
        <p className="text-gray-800 leading-relaxed pr-12">{message.text}</p>
        <div className="absolute bottom-1 right-2 flex items-center gap-1">
          <span className="text-[9px] text-gray-500">{formatDate(message.timestamp).split(' ')[1]}</span>
          {isAgent && (
            <span className="text-blue-500">
              {message.status === 'read' ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon }: { title: string, value: string, change: string, icon: React.ReactNode }) {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <span className={cn(
          "text-xs font-bold px-2 py-1 rounded-full",
          isPositive ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
        )}>
          {change}
        </span>
      </div>
      <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}
