"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Edit,
  Pause,
  Play,
  Trash2,
  Plus
} from "lucide-react";

const serviceCategories = [
  "Web Development",
  "Mobile Development",
  "Graphic Design",
  "Writing & Translation",
  "Digital Marketing",
  "Video & Animation"
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

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
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

  const handleCreateService = () => {
    if (newService.title.trim()) {
      const service = {
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

      setServices(prev => [...prev, service]);
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
    setServices(prev => prev.map(service => {
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
    }).filter((s): s is Service => s !== null));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-600 mt-2">Manage your freelance services</p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowServiceModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Service
          </Button>
        </div>

        {/* Content Area */}
        <div className="min-h-96">
          {services.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center py-20">
              <Card className="w-full max-w-md">
                <CardContent className="p-12 text-center">
                  <div className="mb-6">
                    <FileText className="h-16 w-16 text-indigo-500 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    You have no services yet
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    You will be able to view and manage your services here.
                  </p>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowServiceModal(true)}
                  >
                    Create a Service
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Services List
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
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
          )}
        </div>
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