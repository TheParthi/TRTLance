"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

      if (data) {
        setReviews(data as any);
      }
      setLoading(false);
    }

    fetchReviews();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">What Our Clients Say</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Trusted by thousands of freelancers and clients worldwide. Here's what they have to say about their experience with TrustLance.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reviews.map((review) => (
              <Card key={review.id} className="border-none shadow-lg hover:shadow-xl transition-shadow bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Quote className="h-24 w-24 text-blue-600 transform rotate-12" />
                </div>

                <CardContent className="p-8 relative z-10">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                  </div>

                  <p className="text-gray-700 text-lg italic mb-6 leading-relaxed">
                    "{review.feedback}"
                  </p>

                  <div className="flex items-center gap-4 mt-auto">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={review.user.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                        {review.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-gray-900">{review.user.name}</h4>
                      <div className="text-sm text-gray-500 flex flex-col">
                        <span className="capitalize">{review.user.role}</span>
                        {review.project && (
                          <span className="text-xs text-blue-600 mt-0.5 truncate max-w-[150px]">
                            Project: {review.project.title}
                          </span>
                        )}
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
        )}
      </main>
    </div>
  );
}