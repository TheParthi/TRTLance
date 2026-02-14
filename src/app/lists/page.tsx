"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Heart,
  Users,
  Eye,
  Bookmark,
  Lock,
  Globe,
  Star,
  UserPlus
} from "lucide-react";

interface ListItem {
  id: number;
  name: string;
  avatar?: string;
  rating?: number;
  skills?: string;
  icon?: React.ReactNode;
}

interface List {
  id: number;
  name: string;
  type: string;
  visibility: string;
  items: ListItem[];
  category: string;
}

const initialLists: List[] = [
  {
    id: 1,
    name: "Favorites",
    type: "users",
    visibility: "private",
    items: [],
    category: "users"
  },
  {
    id: 2,
    name: "My Hires",
    type: "users",
    visibility: "private",
    items: [],
    category: "users"
  },
  {
    id: 3,
    name: "Recently Viewed",
    type: "users",
    visibility: "private",
    items: [],
    category: "users"
  },
  {
    id: 4,
    name: "Bookmarks",
    type: "posts",
    visibility: "private",
    items: [],
    category: "group-posts"
  }
];

const sidebarCategories = [
  {
    title: "Users",
    icon: <Users className="h-4 w-4" />,
    items: [
      { id: 1, name: "Favorites", icon: <Heart className="h-4 w-4" /> },
      { id: 2, name: "My Hires", icon: <UserPlus className="h-4 w-4" /> },
      { id: 3, name: "Recently Viewed", icon: <Eye className="h-4 w-4" /> }
    ]
  },
  {
    title: "Group Posts",
    icon: <Users className="h-4 w-4" />,
    items: [
      { id: 4, name: "Bookmarks", icon: <Bookmark className="h-4 w-4" /> }
    ]
  }
];

export default function ListsPage() {
  const [lists, setLists] = useState<List[]>(initialLists);
  const [activeListId, setActiveListId] = useState(1);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListVisibility, setNewListVisibility] = useState("private");

  const activeList = lists.find(list => list.id === activeListId);

  const handleCreateList = () => {
    if (newListName.trim()) {
      const newList = {
        id: Date.now(),
        name: newListName,
        type: "users",
        visibility: newListVisibility,
        items: [],
        category: "users"
      };
      setLists([...lists, newList]);
      setNewListName("");
      setShowNewListModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Lists</h1>
              <Button
                size="sm"
                onClick={() => setShowNewListModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                New List
              </Button>
            </div>

            <div className="space-y-6">
              {sidebarCategories.map((category) => (
                <div key={category.title}>
                  <div className="flex items-center gap-2 mb-3">
                    {category.icon}
                    <h3 className="font-semibold text-gray-700">{category.title}</h3>
                  </div>
                  <div className="space-y-1">
                    {category.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveListId(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${activeListId === item.id
                            ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                            : "text-gray-600 hover:bg-gray-50"
                          }`}
                      >
                        {item.icon}
                        <span className="font-medium">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeList && (
            <>
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-900">{activeList.name}</h2>
                    <Badge variant={activeList.visibility === "private" ? "secondary" : "default"}>
                      {activeList.visibility === "private" ? (
                        <>
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </>
                      )}
                    </Badge>
                  </div>
                  <span className="text-gray-500">{activeList.items.length} members</span>
                </div>
              </div>

              {/* Content */}
              {activeList.items.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-64 h-48 bg-gray-100 rounded-lg mb-8 flex items-center justify-center">
                    <Users className="h-16 w-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">This list is empty</h3>
                  <p className="text-gray-600 text-center mb-8 max-w-md">
                    Add freelancers to your list for the most convenient way to access them later.
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Browse Freelancers
                  </Button>
                </div>
              ) : (
                // List Items (placeholder for when items exist)
                <div className="grid grid-cols-1 gap-4">
                  {activeList.items.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={item.avatar} />
                              <AvatarFallback>{item.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold text-gray-900">{item.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  <span className="text-sm text-gray-600">{item.rating}</span>
                                </div>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-600">{item.skills}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Heart className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* New List Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New List</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List Name
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter list name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility
                </label>
                <select
                  value={newListVisibility}
                  onChange={(e) => setNewListVisibility(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowNewListModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateList}>
                Create List
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}