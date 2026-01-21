import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Image,
  FileText,
  X,
  Bot,
  User,
  Loader,
  Trash2,
  LogOut,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase, ChatMessage, ChatConversation } from '../lib/supabaseClient';
import { aiService, AIMessage } from '../services/aiService';
import ReactMarkdown from 'react-markdown';

const TypingAnimation: React.FC<{ fullName: string }> = ({ fullName }) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = [
    `Welcome, ${fullName} Ji`,
    `I Am SNCOP-AI, Developed by Arvind Nag`,
    `How Can I help you`
  ];
  
  const typingSpeed = 50;
  const deletingSpeed = 30;
  const pauseTime = 2000;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentMessage = messages[messageIndex];

    const handleTyping = () => {
      const currentLength = displayText.length;

      if (!isDeleting) {
        if (currentLength < currentMessage.length) {
          setDisplayText(currentMessage.substring(0, currentLength + 1));
          timer = setTimeout(handleTyping, typingSpeed);
        } else {
          timer = setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        if (currentLength > 0) {
          setDisplayText(currentMessage.substring(0, currentLength - 1));
          timer = setTimeout(handleTyping, deletingSpeed);
        } else {
          setIsDeleting(false);
          setMessageIndex((messageIndex + 1) % messages.length);
        }
      }
    };

    timer = setTimeout(handleTyping, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, messageIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center items-center py-12"
    >
      <div className="flex gap-3 max-w-3xl">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div className="glass-effect rounded-2xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 min-w-[400px]">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {displayText}
            <span className="animate-pulse">|</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const AIChat: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadConversations();
  }, [user, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);

    if (data && data.length > 0) {
      loadConversation(data[0].id);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!user) return;

    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    setCurrentConversation(conversation);

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(messages || []);
  };

  const createNewConversation = async (): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert([
        {
          user_id: user.id,
          title: 'New Conversation',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    setCurrentConversation(data);
    setConversations([data, ...conversations]);
    return data.id;
  };

  const saveMessage = async (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    attachments: File[] = []
  ) => {
    if (!user) return;

    const attachmentData = attachments.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    }));

    const { error } = await supabase.from('chat_messages').insert([
      {
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content,
        attachments: attachmentData,
      },
    ]);

    if (error) {
      console.error('Error saving message:', error);
    }

    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || loading) return;

    setLoading(true);

    try {
      let conversationId = currentConversation?.id;

      if (!conversationId) {
        conversationId = await createNewConversation();
        if (!conversationId) {
          throw new Error('Failed to create conversation');
        }
      }

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        conversation_id: conversationId,
        user_id: user!.id,
        role: 'user',
        content: input,
        attachments: attachments.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        })),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      await saveMessage(conversationId, 'user', input, attachments);

      const aiMessages: AIMessage[] = messages
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
        .concat([{ role: 'user', content: input }]);

      const response = await aiService.sendMessage(aiMessages, attachments);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        conversation_id: conversationId,
        user_id: user!.id,
        role: 'assistant',
        content: response.content,
        attachments: [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await saveMessage(conversationId, 'assistant', response.content);

      setInput('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(
      (file) =>
        file.type.startsWith('image/') ||
        file.type === 'application/pdf'
    );
    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return;
    }

    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const showWelcomeAnimation = messages.length === 0;

  return (
    <div className="min-h-screen flex relative bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed bottom-4 left-4 z-50 p-2 rounded-lg glass-effect hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-lg"
      >
        <MessageSquare className="h-6 w-6 text-gray-900 dark:text-white" />
      </button>

      <motion.aside
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: sidebarOpen ? 0 : -320, opacity: sidebarOpen ? 1 : 0 }}
        className="w-80 glass-effect border-r border-gray-200 dark:border-gray-700 flex flex-col fixed md:relative h-screen z-40 md:z-auto backdrop-blur-xl"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              SNCOP-AI
            </h2>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5 text-gray-900 dark:text-white" />
            </button>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Welcome, {profile?.full_name} Ji
          </p>
          <button
            onClick={async () => {
              const id = await createNewConversation();
              if (id) {
                setMessages([]);
              }
            }}
            className="w-full mt-4 py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:scale-105 transition-transform shadow-lg"
          >
            <MessageSquare className="inline h-4 w-4 mr-2" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.map((conv) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                currentConversation?.id === conv.id
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'bg-white/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              onClick={() => loadConversation(conv.id)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                  {conv.title}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="p-1 rounded hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {new Date(conv.updated_at).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col ml-0 md:ml-0 w-full">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {showWelcomeAnimation && (
            <TypingAnimation fullName={profile?.full_name || 'User'} />
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex gap-3 max-w-3xl ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-r from-green-500 to-teal-500'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Bot className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div
                    className={`glass-effect rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {message.attachments.map((att, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded"
                          >
                            {att.type.startsWith('image/') ? (
                              <Image className="h-3 w-3 text-gray-900 dark:text-white" />
                            ) : (
                              <FileText className="h-3 w-3 text-gray-900 dark:text-white" />
                            )}
                            <span className="text-gray-900 dark:text-white">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-white">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="glass-effect rounded-2xl p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Loader className="h-5 w-5 animate-spin text-gray-900 dark:text-white" />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 backdrop-blur-xl bg-white/50 dark:bg-gray-900/50">
          {attachments.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 glass-effect px-3 py-2 rounded-lg"
                >
                  {file.type.startsWith('image/') ? (
                    <Image className="h-4 w-4 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-900 dark:text-white">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="p-1 rounded hover:bg-red-500/20 transition-colors"
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl glass-effect hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Attach files"
            >
              <Paperclip className="h-5 w-5 text-gray-900 dark:text-white" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about B.Pharmacy..."
              className="flex-1 px-4 py-3 glass-effect rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || (!input.trim() && attachments.length === 0)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all shadow-lg"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIChat;
