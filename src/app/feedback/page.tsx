"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Star,
  Calendar
} from "lucide-react";

interface Project {
  id: number;
  title: string;
  clientName: string;
  completionDate: string;
  amount: number;
}

const initialProjects: Project[] = [
  // Empty by default - will show empty state
];

export default function FeedbackPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comment: ""
  });

  const handleLeaveFeedback = (project: Project) => {
    setSelectedProject(project);
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = () => {
    if (selectedProject) {
      // Remove project from awaiting feedback list
      setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
      setShowFeedbackModal(false);
      setSelectedProject(null);
      setFeedback({ rating: 5, comment: "" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Projects Awaiting Feedback</h1>
          <p className="text-gray-600 mt-2">Leave feedback for completed projects</p>
        </div>

        {/* Content */}
        {projects.length === 0 ? (
          // Empty State
          <div className="flex justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="p-12 text-center">
                <div className="mb-6">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto" />
                </div>
                <p className="text-gray-600 leading-relaxed">
                  You have no projects awaiting feedback.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Projects List
          <div className="space-y-6">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <span>Client: {project.clientName}</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Completed: {project.completionDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Completed
                        </Badge>
                        <Badge variant="secondary">
                          ${project.amount}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleLeaveFeedback(project)}
                    >
                      Leave Feedback
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Leave Feedback</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{selectedProject.title}</h4>
                <p className="text-sm text-gray-600">Client: {selectedProject.clientName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                      className={`p-1 ${star <= feedback.rating ? "text-yellow-500" : "text-gray-300"
                        }`}
                    >
                      <Star className="h-6 w-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment
                </label>
                <textarea
                  value={feedback.comment}
                  onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Share your experience working with this client..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowFeedbackModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitFeedback}>
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}