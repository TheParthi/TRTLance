"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  MapPin,
  Calendar,
  Star,
  Edit,
  CreditCard,
  Scale,
  Settings,
  Wallet
} from "lucide-react";

export default function ProfileOverviewPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="h-8 w-8 text-blue-600" />
            Profile Overview
          </h1>
          <p className="text-gray-600 mt-2">Manage your profile and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src="/api/placeholder/96/96" />
                  <AvatarFallback className="text-2xl">JD</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-gray-900">John Doe</h2>
                <p className="text-gray-600">@johndoe</p>
                <Badge className="mt-2 bg-blue-100 text-blue-800">Freelancer</Badge>

                <div className="space-y-3 mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-medium">4.9</span>
                    <span className="text-gray-600">(127 reviews)</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>Mumbai, India</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Member since Jan 2022</span>
                  </div>
                </div>

                <Button className="w-full mt-6">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => window.location.href = '/profile/wallet'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Wallet className="h-6 w-6 text-green-600" />
                    Wallet & Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">
                    Manage your platform tokens, buy credits, and track transaction history
                  </p>
                  <Button variant="outline" className="w-full">
                    Open Wallet
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => window.location.href = '/disputes'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Scale className="h-6 w-6 text-purple-600" />
                    Disputes & Resolutions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">
                    Manage project disputes and payment resolutions globally
                  </p>
                  <Button variant="outline" className="w-full">
                    View Disputes
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-blue-600" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">
                    Update your account preferences and security settings
                  </p>
                  <Button variant="outline" className="w-full">
                    View Settings
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">47</p>
                    <p className="text-sm text-gray-600">Jobs Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">₹4,52,000</p>
                    <p className="text-sm text-gray-600">Total Earnings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">3</p>
                    <p className="text-sm text-gray-600">Active Projects</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">98%</p>
                    <p className="text-sm text-gray-600">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}