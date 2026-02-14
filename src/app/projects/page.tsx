"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Medal,
  Target,
  Trophy,
  CheckCircle,
  FileText,
  Edit,
  Pause,
  Play,
  Trash2,
  Plus
} from "lucide-react";

const tabs = [
  { id: "bids", label: "Bids" },
  { id: "current-work", label: "Current Work" },
  { id: "past-work", label: "Past Work" },
  { id: "contest-entries", label: "Contest Entries" },
  { id: "pending-prizes", label: "Pending Prizes" },
  { id: "prizes-released", label: "Prizes Released" },
  { id: "quotes", label: "Quotes" },
  { id: "services", label: "Services" }
];

interface Service {
  id: number;
  title: string;
  category: string;
  description: string;
  price: number;
  deliveryTime: string;
  revisions: number;
  status: string;
  createdAt: string;
}

interface ProjectItem {
  id: number;
  title: string;
  description: string;
  status: string;
  date: string;
}

interface ProjectData {
  role: string;
  bids: ProjectItem[];
  currentWork: ProjectItem[];
  pastWork: ProjectItem[];
  contestEntries: ProjectItem[];
  pendingPrizes: ProjectItem[];
  prizesReleased: ProjectItem[];
  quotes: ProjectItem[];
  services: Service[];
}

const initialData: ProjectData = {
  role: "freelancer",
  bids: [],
  currentWork: [],
  pastWork: [],
  contestEntries: [],
  pendingPrizes: [],
  prizesReleased: [],
  quotes: [],
  services: []
};

const serviceCategories = [
  "Web Development",
  "Mobile Development",
  "Graphic Design",
  "Writing & Translation",
  "Digital Marketing",
  "Video & Animation"
];

export default function MyProjectsPage() {
  const [activeTab, setActiveTab] = useState("bids");
  const [viewRole, setViewRole] = useState("freelancer");
  const [projectData, setProjectData] = useState<ProjectData>(initialData);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [newService, setNewService] = useState({
    title: "",
    category: serviceCategories[0],
    description: "",
    price: "",
    deliveryTime: "",
    revisions: "3",
    published: true
  });

  const handleRoleSwitch = (role: string) => {
    setViewRole(role);
    setProjectData(prev => ({ ...prev, role }));
  };

  const handleCreateService = () => {
    if (newService.title.trim()) {
      const service: Service = {
        id: Date.now(),
        title: newService.title,
        category: newService.category,
        description: newService.description,
        price: parseFloat(newService.price) || 0,
        deliveryTime: newService.deliveryTime,
        revisions: parseInt(newService.revisions) || 3,
        status: newService.published ? "Active" : "Draft",
        createdAt: new Date().toISOString()
      };

      setProjectData(prev => ({
        ...prev,
        services: [...prev.services, service]
      }));

      setNewService({
        title: "",
        category: serviceCategories[0],
        description: "",
        price: "",
        deliveryTime: "",
        revisions: "3",
        published: true
      });
      setShowServiceModal(false);
    }
  };

  const handleServiceAction = (serviceId: number, action: string) => {
    setProjectData(prev => ({
      ...prev,
      services: prev.services.map(service => {
        if (service.id === serviceId) {
          switch (action) {
            case "pause":
              return { ...service, status: "Paused" };
            case "activate":
              return { ...service, status: "Active" };
            case "delete":
              return null;
            default:
              return service;
          }
        }
        return service;
      }).filter((s): s is Service => s !== null)
    }));
  };

  const getEmptyStateContent = () => {
    switch (activeTab) {
      case "bids":
        return {
          icon: <Target className="h-16 w-16 text-blue-500" />,
          title: "No bids yet",
          subtitle: "Start bidding on projects to build your portfolio and earn money.",
          buttonText: "Browse Projects"
        };
      case "current-work":
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-500" />,
          title: "No current work",
          subtitle: "Once you win a project, it will appear here for you to manage.",
          buttonText: "Find Work"
        };
      case "contest-entries":
        return {
          icon: <Trophy className="h-16 w-16 text-yellow-500" />,
          title: "No contest entries",
          subtitle: "Participate in contests to showcase your skills and win prizes.",
          buttonText: "Browse Contests"
        };
      case "services":
        return {
          icon: <FileText className="h-16 w-16 text-indigo-500" />,
          title: "You have no services yet",
          subtitle: "You will be able to view and manage your services here.",
          buttonText: "Create a Service",
          action: () => setShowServiceModal(true)
        };
      default:
        return {
          icon: <Medal className="h-16 w-16 text-purple-500" />,
          title: "Take a Skills Test",
          subtitle: "Stand out to prospective employers by certifying your skills.",
          buttonText: "Take a Test Now"
        };
    }
  };

  const getCurrentTabData = () => {
    switch (activeTab) {
      case "bids":
        return projectData.bids;
      case "current-work":
        return projectData.currentWork;
      case "past-work":
        return projectData.pastWork;
      case "contest-entries":
        return projectData.contestEntries;
      case "pending-prizes":
        return projectData.pendingPrizes;
      case "prizes-released":
        return projectData.prizesReleased;
      case "quotes":
        return projectData.quotes;
      case "services":
        return projectData.services;
      default:
        return [];
    }
  };

  const emptyState = getEmptyStateContent();
  const currentData = getCurrentTabData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Projects, Contests and Quotes</h1>

          {/* View As Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">View as:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleRoleSwitch("client")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewRole === "client"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Client
              </button>
              <button
                onClick={() => handleRoleSwitch("freelancer")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewRole === "freelancer"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Freelancer
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                    ? "border-blue-500 text-blue-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-96">
          {activeTab === "services" && viewRole === "client" ? (
            // Client View for Services
            <div className="flex flex-col items-center justify-center py-20">
              <Card className="w-full max-w-md">
                <CardContent className="p-12 text-center">
                  <div className="mb-6">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    You are viewing as Client
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Services are only available in Freelancer view.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : currentData.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center py-20">
              <Card className="w-full max-w-md">
                <CardContent className="p-12 text-center">
                  <div className="mb-6">
                    {emptyState.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {emptyState.title}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {emptyState.subtitle}
                  </p>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={emptyState.action || (() => { })}
                  >
                    {emptyState.buttonText}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : activeTab === "services" ? (
            // Services List
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(currentData as Service[]).map((service) => (
                <Card key={service.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{service.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{service.category}</p>
                        <p className="text-lg font-bold text-green-600">₹{service.price}</p>
                      </div>
                      <Badge
                        variant={service.status === "Active" ? "default" : service.status === "Draft" ? "secondary" : "outline"}
                        className={service.status === "Active" ? "bg-green-100 text-green-800" : ""}
                      >
                        {service.status}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600 mb-4">
                      <p>Delivery: {service.deliveryTime}</p>
                      <p>Revisions: {service.revisions}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={service.status === "Active" ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                        onClick={() => handleServiceAction(service.id, service.status === "Active" ? "pause" : "activate")}
                      >
                        {service.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleServiceAction(service.id, "delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Other Tabs Data Content
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(currentData as ProjectItem[]).map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{item.status}</Badge>
                      <span className="text-sm text-gray-500">{item.date}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Role-specific Content Hint */}
        {viewRole === "client" && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 text-sm">
              <strong>Client View:</strong> This view shows your posted projects, hired freelancers, and received quotes.
            </p>
          </div>
        )}

        {viewRole === "freelancer" && (
          <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800 text-sm">
              <strong>Freelancer View:</strong> This view shows your bids, current work, past projects, and contest entries.
            </p>
          </div>
        )}
      </div>

      {/* Create Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Service</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Title *
                </label>
                <input
                  type="text"
                  value={newService.title}
                  onChange={(e) => setNewService(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter service title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newService.category}
                  onChange={(e) => setNewService(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {serviceCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe your service"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    value={newService.price}
                    onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Time
                  </label>
                  <input
                    type="text"
                    value={newService.deliveryTime}
                    onChange={(e) => setNewService(prev => ({ ...prev, deliveryTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 3 days"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revisions
                </label>
                <input
                  type="number"
                  value={newService.revisions}
                  onChange={(e) => setNewService(prev => ({ ...prev, revisions: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="3"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={newService.published}
                  onChange={(e) => setNewService(prev => ({ ...prev, published: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="published" className="text-sm font-medium text-gray-700">
                  Publish immediately
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowServiceModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateService}>
                Create Service
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}