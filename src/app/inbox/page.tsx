"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Smile,
  Paperclip,
  ThumbsUp,
  Send,
  MoreVertical,
  VolumeX,
  Archive,
  UserX,
  Circle
} from "lucide-react";

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  isMe: boolean;
}

interface Chat {
  id: number;
  username: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  messages: Message[];
}

const initialChats: Chat[] = [
  {
    id: 1,
    username: "Sarah Johnson",
    avatar: "/api/placeholder/40/40",
    lastMessage: "Thanks for the great work on the website!",
    timestamp: "2 min ago",
    unread: 2,
    online: true,
    messages: [
      { id: 1, sender: "Sarah Johnson", content: "Hi! How's the project coming along?", timestamp: "10:30 AM", isMe: false },
      { id: 2, sender: "You", content: "Going well! I'll have the first draft ready by tomorrow.", timestamp: "10:32 AM", isMe: true },
      { id: 3, sender: "Sarah Johnson", content: "Thanks for the great work on the website!", timestamp: "2 min ago", isMe: false }
    ]
  },
  {
    id: 2,
    username: "Mike Chen",
    avatar: "/api/placeholder/40/40",
    lastMessage: "Can we schedule a call tomorrow?",
    timestamp: "1 hour ago",
    unread: 0,
    online: false,
    messages: [
      { id: 1, sender: "Mike Chen", content: "Hey, I reviewed the designs", timestamp: "Yesterday", isMe: false },
      { id: 2, sender: "You", content: "Great! What do you think?", timestamp: "Yesterday", isMe: true },
      { id: 3, sender: "Mike Chen", content: "Can we schedule a call tomorrow?", timestamp: "1 hour ago", isMe: false }
    ]
  }
];

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedChat) {
      const message = {
        id: Date.now(),
        sender: "You",
        content: newMessage,
        timestamp: "Just now",
        isMe: true
      };

      setChats(prev => prev.map(chat =>
        chat.id === selectedChat.id
          ? { ...chat, messages: [...chat.messages, message], lastMessage: newMessage }
          : chat
      ));

      setSelectedChat(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, message]
        };
      });

      setNewMessage("");
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // Mark as read
    setChats(prev => prev.map(c =>
      c.id === chat.id ? { ...c, unread: 0 } : c
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left Panel - Chat List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              {["chats", "requests", "archived"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 px-4 text-sm font-medium capitalize ${activeTab === tab
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">You have no messages yet</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatSelect(chat)}
                    className={`w-full p-3 rounded-lg text-left hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={chat.avatar} />
                          <AvatarFallback>{chat.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {chat.online && (
                          <Circle className="absolute -bottom-1 -right-1 h-3 w-3 text-green-500 fill-current" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 truncate">{chat.username}</p>
                          <span className="text-xs text-gray-500">{chat.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                      </div>
                      {chat.unread > 0 && (
                        <Badge className="bg-blue-500 text-white text-xs">{chat.unread}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Chat Conversation */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedChat.avatar} />
                    <AvatarFallback>{selectedChat.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedChat.username}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedChat.online ? "Online" : "Last seen 2 hours ago"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedChat.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex gap-2 max-w-xs lg:max-w-md ${message.isMe ? "flex-row-reverse" : ""}`}>
                      {!message.isMe && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedChat.avatar} />
                          <AvatarFallback>{selectedChat.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div
                          className={`px-4 py-2 rounded-lg ${message.isMe
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                            }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{message.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type a message..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button variant="ghost" size="sm">
                    <ThumbsUp className="h-5 w-5" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 rounded-full"
                    onClick={handleSendMessage}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // Empty State
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Chat Details */}
        <div className="w-80 bg-white border-l border-gray-200">
          {selectedChat ? (
            <div className="p-6">
              <div className="text-center mb-6">
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarImage src={selectedChat.avatar} />
                  <AvatarFallback className="text-2xl">{selectedChat.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-gray-900">{selectedChat.username}</h3>
                <p className="text-sm text-gray-500">
                  {selectedChat.online ? "Online" : "Offline"}
                </p>
              </div>

              <div className="space-y-3">
                <Button variant="ghost" className="w-full justify-start">
                  <VolumeX className="h-4 w-4 mr-3" />
                  Mute notifications
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Archive className="h-4 w-4 mr-3" />
                  Archive chat
                </Button>
                <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700">
                  <UserX className="h-4 w-4 mr-3" />
                  Block user
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p>Select a chat to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}