"use client";

import { useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  User,
  DollarSign,
  Calendar,
  ArrowRight,
  CheckCircle,
  MessageCircle
} from "lucide-react";
import { useChat } from '@/contexts/chat-context';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const [projectCreated, setProjectCreated] = useState(false);

  // Mock project data
  const project = {
    id: id,
    title: "E-commerce Website Development",
    description: "Build a modern e-commerce platform with React and Node.js",
    budget: 2500,
    deadline: "2024-03-15",
    status: "PROPOSAL_ACCEPTED",
    client: {
      name: "TechCorp Inc.",
      avatar: "/api/placeholder/32/32"
    },
    freelancer: {
      name: "John Smith",
      avatar: "/api/placeholder/32/32",
      rating: 4.9
    }
  };

  const handleCreateProject = () => {
    setProjectCreated(true);
    // Simulate project creation process
    setTimeout(() => {
      // Redirect to workspace
      window.location.href = `/projects/${id}/workspace`;
    }, 2000);
  };

  if (projectCreated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Project Created Successfully!</h2>
            <p className="text-gray-600 mb-4">Redirecting to project workspace...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-blue-600" />
            Project Details
          </h1>
          <p className="text-gray-600 mt-2">Review and confirm project creation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{project.title}</CardTitle>
                  <Badge className="bg-green-100 text-green-800">
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Project Description</h3>
                    <p className="text-gray-700">{project.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Budget</p>
                        <p className="font-semibold">${project.budget}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Deadline</p>
                        <p className="font-semibold">{project.deadline}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>✓ Proposal accepted by client</li>
                      <li>• Create project workspace</li>
                      <li>• Set up escrow funding</li>
                      <li>• Begin milestone work</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">{project.client.name}</p>
                    <p className="text-sm text-gray-600">Project Owner</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => openChat(
                    project.id,
                    { id: 'client_1', name: project.client.name, role: 'client', status: 'online' },
                    project.title
                  )}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message Client
                </Button>
              </CardContent>
            </Card>

            {/* Freelancer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Freelancer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">{project.freelancer.name}</p>
                    <p className="text-sm text-gray-600">⭐ {project.freelancer.rating} rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Ready to create the project workspace and begin the escrow process?
                  </p>

                  <Button
                    onClick={handleCreateProject}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Create Project & Setup Workspace
                  </Button>

                  <p className="text-xs text-gray-500">
                    This will create the project workspace where escrow funding and milestone management will take place.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}