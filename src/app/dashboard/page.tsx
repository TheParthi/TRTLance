"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Search,
  DollarSign,
  Clock,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

import { WalletWidget } from "@/components/dashboard/wallet-widget";

interface Job {
  id: string;
  title: string;
  description: string;
  budget_min: number;
  budget_max: number;
  status: string;
  client_id: string;
  created_at: string;
  category?: string;
  skills?: string[];
  location?: string;
  client?: {
    username: string;
    name: string;
    rating: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAllJobs();
  }, []);

  const fetchAllJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/jobs?status=open"); // Changed status to lowercase
      const data = await response.json();

      // Filter out jobs created by current user (show only OTHER users' jobs)
      const otherUsersJobs = user?.id
        ? data.filter((job: Job) => job.client_id !== user.id) // Changed created_by to client_id
        : data;

      setJobs(otherUsersJobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Browse Available Projects
          </h1>
          <p className="text-gray-600">
            Find projects posted by clients looking for talented freelancers
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        {/* Wallet & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-1">
            <WalletWidget />
          </div>
          <Card>

            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Projects</p>
                <p className="text-2xl font-bold text-blue-600">{jobs.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New This Week</p>
                <p className="text-2xl font-bold text-green-600">
                  {jobs.filter(j => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(j.created_at) > weekAgo;
                  }).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(jobs.map(j => j.client_id)).size}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </CardContent>
          </Card>
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">Loading available projects...</p>
              </CardContent>
            </Card>
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  {searchTerm ? "No projects match your search" : "No projects available at the moment"}
                </p>
                <p className="text-sm text-gray-500">
                  Check back later for new opportunities
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/job/${job.id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${job.budget_min.toLocaleString()} - ${job.budget_max.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="text-sm">
                      {job.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {job.description}
                  </p>

                  {/* Skills */}
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.skills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Client Info */}
                  {job.client && (
                    <div className="flex items-center justify-between border-t pt-4">
                      <div className="text-sm text-gray-600">
                        Posted by{" "}
                        <span className="font-medium text-gray-900">
                          {job.client.name || job.client.username}
                        </span>
                        {job.client.rating > 0 && (
                          <span className="ml-2 text-yellow-600">
                            ⭐ {job.client.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <Link href={`/job/${job.id}`}>
                        <Button>Apply Now</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        {!loading && filteredJobs.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Want to post your own project?
            </p>
            <Link href="/post-project">
              <Button size="lg">
                Post a Project
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}