"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  MessageCircle,
  CheckCircle,
  Calendar,
  User,
  Briefcase
} from "lucide-react";

interface Update {
  id: number;
  projectName: string;
  clientName: string;
  lastUpdateDate: string;
  summary: string;
  status: string;
  progress: number;
}

interface ProjectUpdatesData {
  inProgress: Update[];
  completed: Update[];
}

const initialData: ProjectUpdatesData = {
  inProgress: [],
  completed: []
};

export default function ProjectUpdatesPage() {
  const [activeTab, setActiveTab] = useState("in-progress");
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdatesData>(initialData);

  const getCurrentTabData = () => {
    return activeTab === "in-progress" ? projectUpdates.inProgress : projectUpdates.completed;
  };

  const currentData = getCurrentTabData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Project Updates</h1>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab("in-progress")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "in-progress"
                    ? "border-blue-500 text-blue-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "completed"
                    ? "border-blue-500 text-blue-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Completed
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {currentData.length === 0 ? (
          // Empty State
          <div className="flex justify-center">
            <Card className="w-full max-w-4xl">
              <CardContent className="p-12">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-8">
                    Keep clients engaged with project updates!
                  </h2>

                  {/* Three Illustration Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Set your reminder */}
                    <div className="text-center">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell className="h-10 w-10 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Set your reminder</h3>
                      <p className="text-sm text-gray-600">
                        Set regular reminders to post a project update.
                      </p>
                    </div>

                    {/* Update your client */}
                    <div className="text-center">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="h-10 w-10 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Update your client</h3>
                      <p className="text-sm text-gray-600">
                        Clients get instant notifications when you post an update.
                      </p>
                    </div>

                    {/* Complete your project */}
                    <div className="text-center">
                      <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Complete your project</h3>
                      <p className="text-sm text-gray-600">
                        Keep clients posted to make project delivery smoother than ever.
                      </p>
                    </div>
                  </div>

                  {/* Helper Text */}
                  <p className="text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                    Post updates once you have been awarded a project and linked it to a workspace.
                    Start by browsing and bidding on projects.
                  </p>

                  {/* CTA Button */}
                  <Button className="bg-blue-600 hover:bg-blue-700 px-8 py-3">
                    Browse Projects
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Project Updates List (Future-ready)
          <div className="space-y-6">
            {currentData.map((update) => (
              <Card key={update.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {update.projectName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{update.clientName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Last update: {update.lastUpdateDate}</span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{update.summary}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={update.status === "In Progress" ? "default" : "secondary"}
                          className={update.status === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}
                        >
                          {update.status}
                        </Badge>
                        <Badge variant="outline">
                          {update.progress}% Complete
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Post Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}