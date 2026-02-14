"use client";

import { useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Scale,
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Shield,
  CreditCard,
  ExternalLink,
  MessageCircle,
  FileText,
  Upload
} from "lucide-react";
import { useDisputeActions } from "@/hooks/use-dispute-actions";

interface DisputeDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function DisputeDetailsPage({ params }: DisputeDetailsPageProps) {
  const { id } = use(params);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [paypalConnected, setPaypalConnected] = useState(false);
  const { getDisputeById, resolveDispute, releasePayPalPayout, refundPayPalClient } = useDisputeActions();

  const dispute = getDisputeById(id);

  if (!dispute) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardContent className="p-8 text-center">
              <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Dispute not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handlePaymentAction = async (action: 'release' | 'refund') => {
    if (dispute.paymentMethod === 'PAYPAL_PLATFORM_MANAGED' && !paypalConnected) {
      setShowPayPalModal(true);
      return;
    }

    if (action === 'release') {
      await releasePayPalPayout(dispute.id, 'freelancer@example.com');
    } else {
      await refundPayPalClient(dispute.id, 'client@example.com');
    }
  };

  const connectPayPal = () => {
    window.location.href = `/profile/payments/paypal?redirect=/disputes/${dispute.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => window.location.href = '/disputes'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Disputes
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Scale className="h-8 w-8 text-purple-600" />
                Dispute {dispute.id}
              </h1>
              <p className="text-gray-600 mt-2">{dispute.projectName}</p>
            </div>
            <Badge className={
              dispute.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                dispute.status === 'UNDER_REVIEW' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
            }>
              {dispute.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Dispute Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Reason</p>
                    <p className="font-medium">{dispute.reason}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Your Role</p>
                      <p className="font-medium">{dispute.role}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="font-medium">{dispute.createdAt}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evidence Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Evidence Timeline
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Evidence
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium">Initial dispute filed</p>
                      <p className="text-sm text-gray-600">{dispute.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">{dispute.createdAt}</p>
                    </div>
                  </div>

                  {dispute.status === 'UNDER_REVIEW' && (
                    <div className="flex items-start gap-4 p-4 border rounded-lg bg-blue-50">
                      <MessageCircle className="h-5 w-5 text-blue-600 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium">AI Analysis Complete</p>
                        <p className="text-sm text-gray-600">Evidence reviewed, recommendation generated</p>
                        <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Locked Amount</span>
                    <span className="font-semibold text-green-600">${dispute.amount.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Method</span>
                    <Badge variant="outline">
                      {dispute.paymentMethod.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">Current Holder</p>
                    <p className="text-sm text-blue-700">PLATFORM ESCROW</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resolution Actions */}
            {dispute.outcome && (
              <Card>
                <CardHeader>
                  <CardTitle>Resolution Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dispute.outcome === 'FREELANCER' && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handlePaymentAction('release')}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Release Payment to Freelancer
                      </Button>
                    )}

                    {dispute.outcome === 'CLIENT' && (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => handlePaymentAction('refund')}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Refund Client
                      </Button>
                    )}

                    {dispute.outcome === 'PARTIAL' && (
                      <div className="space-y-2">
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => handlePaymentAction('release')}
                        >
                          Release 60% to Freelancer
                        </Button>
                        <Button
                          className="w-full bg-blue-600 hover:blue-700"
                          onClick={() => handlePaymentAction('refund')}
                        >
                          Refund 40% to Client
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Assistant Notice */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-medium text-sm">AI Guidance Only</p>
                    <p className="text-yellow-700 text-xs">
                      AI provides guidance only. Final decisions are human-approved.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* PayPal Connection Modal */}
        <Dialog open={showPayPalModal} onOpenChange={setShowPayPalModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Connect PayPal Required
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                You need to connect PayPal to receive dispute payouts. This ensures secure payment processing.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 font-medium text-sm mb-2">What happens next:</p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Secure PayPal OAuth connection</li>
                  <li>• Return to this dispute page</li>
                  <li>• Complete payment action</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={connectPayPal}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect PayPal Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPayPalModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}