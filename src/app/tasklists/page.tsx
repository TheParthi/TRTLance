"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import {
  Plus,
  Edit,
  Users,
  Trash2,
  CheckSquare,
  Square,
  Calendar,
  User,
  ClipboardList
} from "lucide-react";

interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  assignee?: { id: number; name: string; avatar: string };
  dueDate: string;
  createdAt: string;
}

interface Tasklist {
  id: number;
  name: string;
  owner: string;
  tasks: Task[];
}

const initialTasklists: Tasklist[] = [
  {
    id: 1,
    name: "@johndoe's tasklist",
    owner: "johndoe",
    tasks: []
  }
];

const dummyUsers = [
  { id: 1, name: "John Doe", avatar: "/api/placeholder/32/32" },
  { id: 2, name: "Sarah Johnson", avatar: "/api/placeholder/32/32" },
  { id: 3, name: "Mike Chen", avatar: "/api/placeholder/32/32" }
];

export default function TasklistsPage() {
  const { user } = useAuth();
  const [tasklists, setTasklists] = useState<Tasklist[]>(initialTasklists);
  const [activeTasklistId, setActiveTasklistId] = useState(1);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTasklistModal, setShowTasklistModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    assigneeId: 1
  });
  const [newTasklistName, setNewTasklistName] = useState("");

  const activeTasklist = tasklists.find(tl => tl.id === activeTasklistId);

  const handleCreateTask = () => {
    if (newTask.title.trim()) {
      const task = {
        id: Date.now(),
        title: newTask.title,
        description: newTask.description,
        completed: false,
        assignee: dummyUsers.find(u => u.id === newTask.assigneeId),
        dueDate: newTask.dueDate,
        createdAt: new Date().toISOString()
      };

      setTasklists(prev => prev.map(tl =>
        tl.id === activeTasklistId
          ? { ...tl, tasks: [...tl.tasks, task] }
          : tl
      ));

      setNewTask({ title: "", description: "", dueDate: "", assigneeId: 1 });
      setShowTaskModal(false);
    }
  };

  const handleCreateTasklist = () => {
    if (newTasklistName.trim()) {
      const tasklist = {
        id: Date.now(),
        name: newTasklistName,
        owner: user?.username || "user",
        tasks: []
      };
      setTasklists(prev => [...prev, tasklist]);
      setNewTasklistName("");
      setShowTasklistModal(false);
      setActiveTasklistId(tasklist.id);
    }
  };

  const toggleTaskComplete = (taskId: number) => {
    setTasklists(prev => prev.map(tl =>
      tl.id === activeTasklistId
        ? {
          ...tl,
          tasks: tl.tasks.map(task =>
            task.id === taskId
              ? { ...task, completed: !task.completed }
              : task
          )
        }
        : tl
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Left Sidebar - Tasklists */}
        <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Tasklists</h1>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTasklistModal(true)}
                className="text-gray-600 hover:text-gray-900"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {tasklists.map((tasklist) => (
                <button
                  key={tasklist.id}
                  onClick={() => setActiveTasklistId(tasklist.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-left transition-colors ${activeTasklistId === tasklist.id
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="font-medium">{tasklist.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Task Area */}
        <div className="flex-1 p-8">
          {activeTasklist && (
            <>
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-gray-900">{activeTasklist.name}</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900"
                      onClick={() => setShowTaskModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content */}
              {activeTasklist.tasks.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-64 h-48 bg-gray-100 rounded-lg mb-8 flex items-center justify-center">
                    <ClipboardList className="h-16 w-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-600 text-center mb-8 max-w-md">
                    Create tasks and assign them to people to help keep your team on track.
                  </p>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowTaskModal(true)}
                  >
                    Create your first task
                  </Button>
                </div>
              ) : (
                // Task List
                <div className="space-y-3">
                  {activeTasklist.tasks.map((task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleTaskComplete(task.id)}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            {task.completed ? (
                              <CheckSquare className="h-5 w-5 text-green-600" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>

                          <div className="flex-1">
                            <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            {task.assignee && (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={task.assignee.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {task.assignee.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-gray-600">{task.assignee.name}</span>
                              </div>
                            )}

                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}

                            <Badge variant={task.completed ? "default" : "secondary"}>
                              {task.completed ? "Completed" : "Pending"}
                            </Badge>
                          </div>
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

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignee
                </label>
                <select
                  value={newTask.assigneeId}
                  onChange={(e) => setNewTask(prev => ({ ...prev, assigneeId: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {dummyUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTaskModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>
                Create Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tasklist Modal */}
      {showTasklistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add Tasklist</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tasklist Name
                </label>
                <input
                  type="text"
                  value={newTasklistName}
                  onChange={(e) => setNewTasklistName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tasklist name"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTasklistModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTasklist}>
                Create Tasklist
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}