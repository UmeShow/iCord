"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getCharacter, generateAIResponse } from "../../actions";
import { ICharacter } from "@/types";
import { ArrowLeft, Hash, Settings, Bell, Pin, Users, Search, HelpCircle, Inbox, PlusCircle, Gift, Sticker, Smile, Send, Menu, X } from "lucide-react";
import Image from "next/image";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  
  const [character, setCharacter] = useState<ICharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [memberListOpen, setMemberListOpen] = useState(false);
  
  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; parts: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [chatHistory, isChatLoading]);

  // Load Character
  useEffect(() => {
    if (status === "authenticated" && session?.user && params?.id) {
      const discordId = (session.user as any).id;
      const characterId = params.id as string;

      getCharacter(characterId, discordId).then((char) => {
        if (char) {
          setCharacter(char);
          // TODO: Load chat history here when persistence is implemented
        } else {
          router.push("/dashboard");
        }
        setLoading(false);
      });
    } else if (status === "unauthenticated") {
        router.push("/");
    }
  }, [status, session, params, router]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading || !character) return;

    const userMessage = chatInput;
    setChatInput(""); // Clear input immediately
    
    // Optimistic Update
    const newHistory = [...chatHistory, { role: 'user' as const, parts: userMessage }];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    try {
      // Check for slash commands (Web-side implementation placeholder)
      if (userMessage.startsWith('/')) {
         // Logic for /wack or other commands would go here
      }

      const response = await generateAIResponse(
        userMessage, 
        newHistory, 
        character.systemInstruction
      );
      setChatHistory(prev => [...prev, { role: 'model', parts: response }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'model', parts: "Error: Could not generate response." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (loading || !character) {
     return (
        <div className="h-full bg-[#313338] text-white p-8 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#313338] relative">
       {/* 
         LEFT SIDEBAR (Channel List)
         - Desktop: Always visible
         - Mobile: Sliding drawer
       */}
       <div className={`
          w-[280px] bg-[#2b2d31] flex-col shrink-0 border-r border-[#1f2023] transition-transform duration-300 z-50
          md:translate-x-0 md:relative md:flex
          fixed inset-y-0 left-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
       `}>
          {/* Server Review Header */}
          <div className="h-12 border-b border-[#1f2023] flex items-center justify-between px-4 font-bold text-[#f2f3f5] shadow-sm select-none">
             <span className="truncate hover:bg-[#35373c] px-2 py-1 rounded cursor-pointer flex-1 transition-colors">{character.name}</span>
             <X className="w-5 h-5 cursor-pointer md:hidden text-[#b5bac1]" onClick={() => setMobileMenuOpen(false)} />
          </div>
          
          {/* Channel List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
             {/* Text Channels Category */}
             <div className="px-2 py-3 text-xs font-bold text-[#949ba4] uppercase hover:text-[#dbdee1] flex justify-between group cursor-pointer transition-colors">
                 <span>▼ TEXT CHANNELS</span>
                <PlusCircle className="w-4 h-4 cursor-pointer" />
             </div>
             
             {/* General Channel (Active) */}
             <div className="flex items-center px-2 py-1.5 bg-[#404249] text-white rounded cursor-pointer group mb-1">
                <Hash className="w-5 h-5 text-[#dbdee1] mr-1.5" />
                <span className="font-medium">general</span>
             </div>

             {/* Settings Channel Link */}
             <button
                className="w-full flex items-center px-2 py-1.5 text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1] rounded cursor-pointer group transition-colors"
                onClick={() => router.push(`/dashboard/${params?.id}/settings`)}
             >
                <Settings className="w-5 h-5 text-[#949ba4] mr-1.5" />
                <span className="font-medium">settings</span>
             </button>
             
             {/* Back to Home Link for Mobile */}
             <button
                className="w-full flex items-center px-2 py-1.5 text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1] rounded cursor-pointer group transition-colors md:hidden mt-4 border-t border-[#3f4147] pt-4"
                onClick={() => router.push(`/dashboard`)}
             >
                <ArrowLeft className="w-5 h-5 text-[#949ba4] mr-1.5" />
                <span className="font-medium">Back to Chat List</span>
             </button>
          </div>
          
          {/* User Info (Bottom of Sidebar) */}
          <div className="bg-[#232428] p-2 flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity">
                {session?.user?.image && (
                    <Image src={session.user.image} alt="User" width={32} height={32} />
                )}
                 <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#23a559] rounded-full border-2 border-[#232428]"></div>
             </div>
             <div className="flex-1 min-w-0 cursor-pointer">
                <div className="text-sm font-bold text-[#f2f3f5] truncate">{session?.user?.name}</div>
                <div className="text-xs text-[#b5bac1] truncate">#{ (session?.user as any).id?.substring(0, 4) || '0000' }</div>
             </div>
             <Settings className="w-5 h-5 text-[#b5bac1] cursor-pointer hover:text-[#dbdee1]" onClick={() => router.push('/dashboard/profile')} />
          </div>
       </div>

       {/* Mobile Overlay Backdrop (Left Menu) */}
       {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
       )}

       {/* 
          MAIN CHAT AREA 
          - Flex-1 to take updated space
       */}
       <div className="flex-1 flex flex-col min-w-0 bg-[#313338] h-full">
          {/* Top Navigation Bar */}
          <div className="h-12 border-b border-[#26272d] flex items-center px-4 shadow-sm shrink-0 justify-between bg-[#313338] z-20">
             <div className="flex items-center gap-3 overflow-hidden">
                {/* Mobile Hamburger */}
                <Menu className="w-6 h-6 text-[#949ba4] md:hidden cursor-pointer" onClick={() => setMobileMenuOpen(true)} />
                
                {/* Mobile Back Arrow (If convenient) */}
                <ArrowLeft className="w-6 h-6 text-[#949ba4] md:hidden cursor-pointer" onClick={() => router.push('/dashboard')} /> 

                <div className="flex items-center gap-2 overflow-hidden">
                    <Hash className="w-6 h-6 text-[#949ba4] shrink-0" />
                    <h3 className="font-bold text-[#f2f3f5] truncate">general</h3>
                    {character.tone && (
                        <span className="text-[#949ba4] text-xs md:text-sm truncate hidden sm:block border-l border-[#3f4147] pl-4 ml-2 max-w-[300px]">
                             {character.tone}
                        </span>
                    )}
                </div>
             </div>

             {/* Right Icons */}
             <div className="flex items-center gap-6 text-[#b5bac1]">
                <div className="hidden sm:flex items-center gap-4">
                     <Bell className="w-6 h-6 cursor-pointer hover:text-[#dbdee1]" />
                     <Pin className="w-6 h-6 cursor-pointer hover:text-[#dbdee1]" />
                </div>

                <Users className="w-6 h-6 cursor-pointer hover:text-[#dbdee1] md:hidden" onClick={() => setMemberListOpen(!memberListOpen)} />
                
                <div className="relative hidden lg:block">
                    <input 
                        type="text" 
                        placeholder="Search" 
                        className="bg-[#1e1f22] text-[#dbdee1] text-sm rounded px-2 py-1 w-36 transition-all focus:w-60 placeholder-[#949ba4]" 
                    />
                    <Search className="w-4 h-4 absolute right-2 top-1.5 text-[#949ba4]" />
                </div>
                
                <div className="hidden sm:flex items-center gap-4">
                     <Inbox className="w-6 h-6 cursor-pointer hover:text-[#dbdee1]" />
                     <HelpCircle className="w-6 h-6 cursor-pointer hover:text-[#dbdee1]" />
                </div>
             </div>
          </div>
          
          {/* Scrollable Message Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col">
             {/* Channel Welcome Banner */}
             <div className="mt-auto px-4 pt-10 pb-4">
                <div className="w-16 h-16 bg-[#404249] rounded-full flex items-center justify-center mb-4">
                    <Hash className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-[#f2f3f5] mb-2">Welcome to #general!</h1>
                <p className="text-[#b5bac1]">
                    This is the start of the <span className="font-bold">#general</span> channel. Say hi to {character.name}!
                </p>
                <div className="h-px bg-[#3f4147] mt-4 w-full" />
             </div>

             {/* Messages */}
             <div className="px-4 pb-4 space-y-6">
                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 hover:bg-[#2e3035]/50 p-1 -mx-2 rounded px-2 group ${msg.role === 'model' ? 'mt-2' : ''}`}>
                        <div className="mt-0.5 shrink-0 cursor-pointer select-none">
                            {msg.role === 'user' ? (
                                session?.user?.image ? (
                                    <Image src={session.user.image} alt="User" width={40} height={40} className="rounded-full hover:opacity-80 transition-opacity" />
                                ) : (
                                    <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center text-white font-bold text-lg hover:opacity-80 transition-opacity">U</div>
                                )
                            ) : (
                                character.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={character.avatarUrl} alt="Bot" className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity" />
                                ) : (
                                    <div className="w-10 h-10 bg-[#23a559] rounded-full flex items-center justify-center text-white font-bold text-lg hover:opacity-80 transition-opacity">B</div>
                                )
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-[#f2f3f5] cursor-pointer hover:underline">
                                    {msg.role === 'user' ? (session?.user?.name || "User") : character.name}
                                </span>
                                {msg.role === 'model' && (
                                    <span className="bg-[#5865F2] text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 select-none h-4">
                                        <span className="w-2.5 h-2.5 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" className="w-full h-full"><path d="M12.999 1.999c0-.424-.546-.637-.847-.334l-1.003 1.003h-6.299l-1.003-1.003c-.301-.303-.847-.09-.847.334v9.001l-2.001 2c-.521.521-.152 1.412.586 1.412h12.827c.738 0 1.107-.891.586-1.412l-2.001-2v-9.001z" fill="currentColor"></path></svg></span>
                                        BOT
                                    </span>
                                )}
                                <span className="text-xs text-[#949ba4] ml-1 select-none">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[#dbdee1] text-[15px] leading-relaxed whitespace-pre-wrap mt-1 break-words">
                                {msg.parts}
                            </p>
                        </div>
                    </div>
                ))}

                {isChatLoading && (
                    <div className="pl-[56px] mt-2 select-none">
                        <div className="flex gap-1.5 align-middle h-6">
                            <span className="w-2 h-2 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                
                {/* Invisible Span for scrolling */}
                <div ref={chatEndRef} className="h-4" />
             </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#313338] shrink-0 mb-safe-area-bottom">
             <div className="bg-[#383a40] rounded-lg px-4 py-3 flex items-start gap-4 shadow-sm relative">
                <div className="p-1 bg-[#b5bac1] rounded-full cursor-pointer hover:text-[#313338] text-[#313338] sticky top-0 shrink-0 mt-0.5">
                    <PlusCircle className="w-5 h-5" />
                </div>
                <form onSubmit={handleChatSubmit} className="flex-1 flex gap-2">
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={`Message #${"general"}`}
                        className="flex-1 bg-transparent text-[#dbdee1] placeholder-[#949ba4] focus:outline-none min-w-0"
                        disabled={isChatLoading}
                        autoComplete="off"
                    />
                    <button type="submit" className={`text-[#dbdee1] hover:text-white p-1 transition-transform ${chatInput.trim() ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                         <Send className="w-5 h-5" />
                    </button>
                </form>
                {/* Mobile Extra Actions (Hidden for now to clean UI) */}
                <div className="hidden sm:flex items-center gap-3 text-[#b5bac1] shrink-0 mt-0.5">
                    <Gift className="w-6 h-6 cursor-pointer hover:text-[#dbdee1]" />
                    <Sticker className="w-6 h-6 cursor-pointer hover:text-[#dbdee1]" />
                    <Smile className="w-6 h-6 cursor-pointer hover:text-[#dbdee1]" />
                </div>
             </div>
          </div>
       </div>

       {/* Mobile Overlay Backdrop (Right Member List) */}
       {memberListOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMemberListOpen(false)} />
       )}
       
       {/* 
          RIGHT SIDEBAR (Member List) 
          - Desktop: Visible on LG screens
          - Mobile: Sliding drawer
       */}
       <div className={`
          w-60 bg-[#2b2d31] flex-col p-4 shrink-0 overflow-y-auto border-l border-[#1f2023] z-50
          fixed inset-y-0 right-0 transition-transform duration-300
          lg:translate-x-0 lg:relative lg:flex
          ${memberListOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          ${!memberListOpen && 'hidden lg:flex'} 
       `}>
          <h3 className="text-xs font-bold text-[#949ba4] uppercase mb-4 select-none">Online — 2</h3>
          
          {/* Bot Member Card */}
          <div 
            className="flex items-center gap-3 mb-2 opacity-100 hover:bg-[#35373c] p-2 rounded -mx-2 transition cursor-pointer select-none group"
            onClick={() => router.push(`/dashboard/${params?.id}/settings`)}
          >
             <div className="relative">
                 {character.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={character.avatarUrl} alt="Bot" className="w-8 h-8 rounded-full object-cover" />
                 ) : (
                    <div className="w-8 h-8 bg-[#23a559] rounded-full flex items-center justify-center text-white font-bold text-xs">AI</div>
                 )}
                 <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23a559] rounded-full border-2 border-[#2b2d31]"></div>
             </div>
             <div className="min-w-0">
                <div className="font-medium text-[#f2f3f5] flex items-center gap-1 text-sm">
                   <span className="truncate group-hover:underline">{character.name}</span>
                   <span className="bg-[#5865F2] text-white text-[10px] px-1.5 rounded h-4 flex items-center shrink-0">BOT</span>
                </div>
                {character.tone && <div className="text-xs text-[#949ba4] truncate">{character.tone}</div>}
             </div>
          </div>
          
          {/* User Member Card */}
          <div className="flex items-center gap-3 opacity-100 hover:bg-[#35373c] p-2 rounded -mx-2 transition cursor-pointer select-none group">
             <div className="relative">
                 {session?.user?.image ? (
                    <Image src={session.user.image} alt="User" width={32} height={32} className="rounded-full" />
                 ) : (
                    <div className="w-8 h-8 bg-[#5865F2] rounded-full flex items-center justify-center text-white font-bold text-xs">U</div>
                 )}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23a559] rounded-full border-2 border-[#2b2d31]"></div>
             </div>
             <div className="min-w-0">
                 <div className="font-medium text-[#f2f3f5] text-sm truncate group-hover:underline">{session?.user?.name}</div>
             </div>
          </div>
       </div>
    </div>
  );
}


