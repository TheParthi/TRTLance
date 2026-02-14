"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  FileText,
  Upload,
  MessageCircle,
  Gavel
} from "lucide-react";
import { useProjectWorkspace, ProjectData, ProjectState } from "@/hooks/use-project-workspace";

interface ProjectWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectWorkspacePage({ params }: ProjectWorkspacePageProps) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [userRole, setUserRole] = useState<'CLIENT' | 'FREELANCER' | null>(null);
  const [deliverables, setDeliverables] = useState("");
  const [feedback, setFeedback] = useState("");

  const {
    loading,
    getProject,
    fundEscrow,
    submitMilestone,
    approveMilestone,
    requestChanges,
    raiseDispute
  } = useProjectWorkspace(id);

  useEffect(() => {
    const projectData = getProject();
    setProject(projectData);

    // Mock user role determination - in real app, check auth
    const currentUserId = "client_123"; // Mock current user
    if (currentUserId === projectData.clientId) {
      setUserRole('CLIENT');
    } else if (currentUserId === projectData.freelancerId) {
      setUserRole('FREELANCER');
    } else {
      // Unauthorized access - redirect to dashboard
      window.location.href = '/dashboard';
    }
  }, []);

  const handleFundEscrow = async () => {
    if (!project) return;

    const success = await fundEscrow(project.totalAmount);
    if (success) {
      setProject(prev => prev ? { ...prev, state: 'ESCROW_FUNDED' } : null);
    }
  };

  const handleSubmitMilestone = async () => {
    if (!project || !deliverables.trim()) return;

    const currentMilestone = project.milestones[project.currentMilestone];
    const success = await submitMilestone(currentMilestone.id, deliverables);

    if (success) {
      setProject(prev => prev ? {
        ...prev,
        state: 'MILESTONE_SUBMITTED',
        milestones: prev.milestones.map((m, i) =>
          i === prev.currentMilestone ? { ...m, state: 'SUBMITTED', submittedAt: new Date().toISOString() } : m
        )
      } : null);
      setDeliverables("");
    }
  };

  const handleApproveMilestone = async () => {
    if (!project) return;

    const currentMilestone = project.milestones[project.currentMilestone];
    const success = await approveMilestone(currentMilestone.id);

    if (success) {
      const isLastMilestone = project.currentMilestone === project.milestones.length - 1;

      setProject(prev => prev ? {
        ...prev,
        state: isLastMilestone ? 'COMPLETED' : 'PAYMENT_RELEASED',
        currentMilestone: isLastMilestone ? prev.currentMilestone : prev.currentMilestone + 1,
        milestones: prev.milestones.map((m, i) =>
          i === prev.currentMilestone ? { ...m, state: 'PAID', approvedAt: new Date().toISOString() } : m
        )
      } : null);
    }
  };

  const handleRequestChanges = async () => {
    if (!project || !feedback.trim()) return;

    const currentMilestone = project.milestones[project.currentMilestone];
    const success = await requestChanges(currentMilestone.id, feedback);

    if (success) {
      setProject(prev => prev ? {
        ...prev,
        state: 'IN_PROGRESS',
        milestones: prev.milestones.map((m, i) =>
          i === prev.currentMilestone ? { ...m, state: 'PENDING' } : m
        )
      } : null);
      setFeedback("");
    }
  };

  const handleRaiseDispute = async () => {
    if (!project) return;

    const success = await raiseDispute("Milestone delivery issues");
    if (success) {
      setProject(prev => prev ? { ...prev, state: 'DISPUTED' } : null);
    }
  };

  if (!project || !userRole) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  const currentMilestone = project.milestones[project.currentMilestone];
  const completedMilestones = project.milestones.filter(m => m.state === 'PAID').length;
  const progressPercentage = (completedMilestones / project.milestones.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => window.location.href = '/dashboard'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-gray-600 mt-2">Project ID: {project.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">{userRole}</Badge>
              <Badge className={
                project.state === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  project.state === 'DISPUTED' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
              }>
                {project.state.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* ESCROW_PENDING State */}
            {project.state === 'ESCROW_PENDING' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-600" />
                    Escrow Funding Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userRole === 'CLIENT' ? (
                    <div className="space-y-4">
                      <p className="text-gray-700">
                        Fund the project escrow to begin work. Funds will be locked in a smart contract
                        and released upon milestone completion.
                      </p>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-blue-800 font-medium">Total Amount: ${project.totalAmount}</p>
                        <p className="text-blue-700 text-sm">Payment Method: {project.paymentMethod.replace('_', ' ')}</p>
                      </div>
                      <Button
                        onClick={handleFundEscrow}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        {loading ? 'Deploying Contract...' : 'Fund Project Escrow'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Waiting for client to fund the project escrow</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ESCROW_FUNDED State */}
            {project.state === 'ESCROW_FUNDED' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Escrow Funded Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-green-800 font-medium">✓ Smart contract deployed</p>
                      <p className="text-green-700 text-sm">✓ ${project.totalAmount} locked in escrow</p>
                      <p className="text-green-700 text-sm">✓ Work can now begin</p>
                    </div>
                    {userRole === 'FREELANCER' && (
                      <Button
                        onClick={() => setProject(prev => prev ? { ...prev, state: 'IN_PROGRESS' } : null)}
                        className="w-full"
                      >
                        Start Working on Milestone 1
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* IN_PROGRESS State */}
            {project.state === 'IN_PROGRESS' && userRole === 'FREELANCER' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Submit Milestone: {currentMilestone.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-700 mb-2">{currentMilestone.description}</p>
                      <p className="text-sm text-gray-600">Amount: ${currentMilestone.amount}</p>
                      <p className="text-sm text-gray-600">Due: {currentMilestone.dueDate}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deliverables & Work Summary
                      </label>
                      <Textarea
                        value={deliverables}
                        onChange={(e) => setDeliverables(e.target.value)}
                        placeholder="Describe your completed work and provide links to deliverables..."
                        rows={4}
                      />
                    </div>

                    <Button
                      onClick={handleSubmitMilestone}
                      disabled={loading || !deliverables.trim()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Milestone for Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* MILESTONE_SUBMITTED State */}
            {project.state === 'MILESTONE_SUBMITTED' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Milestone Under Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userRole === 'CLIENT' ? (
                    <div className="space-y-4">
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-orange-800 font-medium">Milestone submitted for review</p>
                        <p className="text-orange-700 text-sm">Review the work and choose an action below</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Button
                          onClick={handleApproveMilestone}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve & Release Payment
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            // Show feedback form
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Request Changes
                        </Button>

                        <Button
                          variant="outline"
                          onClick={handleRaiseDispute}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Gavel className="h-4 w-4 mr-2" />
                          Raise Dispute
                        </Button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Feedback (optional)
                        </label>
                        <Textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Provide feedback or request specific changes..."
                          rows={3}
                        />
                        {feedback.trim() && (
                          <Button
                            onClick={handleRequestChanges}
                            disabled={loading}
                            variant="outline"
                            className="mt-2"
                          >
                            Send Feedback & Request Changes
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Waiting for client review and approval</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment & Escrow Status Panel - Appears after milestone approval */}
            {(currentMilestone.state === 'PAID' || project.state === 'PAYMENT_RELEASED' || project.state === 'COMPLETED') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Payment & Escrow Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Payment Method:</span>
                        <p className="font-medium">
                          {project.paymentMethod === 'BLOCKCHAIN_ESCROW' ? 'Smart Contract' : 'PayPal (Platform Escrow)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Escrow Status:</span>
                        <p className="font-medium text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {project.paymentMethod === 'BLOCKCHAIN_ESCROW' ? 'Funds Released' : 'Released'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Milestone Amount:</span>
                        <p className="font-medium">
                          {project.paymentMethod === 'BLOCKCHAIN_ESCROW' ? `${currentMilestone.amount} ETH` : `$${currentMilestone.amount}`}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Milestone Status:</span>
                        <Badge className="bg-green-100 text-green-800">PAID</Badge>
                      </div>
                    </div>

                    {project.paymentMethod === 'BLOCKCHAIN_ESCROW' ? (
                      <div className="space-y-3 pt-4 border-t">
                        <div>
                          <span className="text-gray-600 text-sm">Contract Address:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {project.contractAddress || '0xABCD...1234'}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`https://etherscan.io/address/${project.contractAddress}`, '_blank')}
                            >
                              View on Explorer
                            </Button>
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-600 text-sm">Transaction Hash:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {currentMilestone.transactionHash || '0x5678...EF90'}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`https://etherscan.io/tx/${currentMilestone.transactionHash}`, '_blank')}
                            >
                              View Tx
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t">
                        <span className="text-gray-600 text-sm">Transaction ID:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {currentMilestone.paypalTransactionId || 'PAYPAL_TXN_12345'}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PAYMENT_RELEASED State */}
            {project.state === 'PAYMENT_RELEASED' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Payment Released Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800 font-medium">✓ Milestone approved and payment released</p>
                    <p className="text-green-700 text-sm">✓ ${currentMilestone.amount} transferred to freelancer</p>
                    <p className="text-green-700 text-sm">✓ Ready for next milestone</p>
                  </div>

                  {project.currentMilestone < project.milestones.length && (
                    <Button
                      onClick={() => setProject(prev => prev ? { ...prev, state: 'IN_PROGRESS' } : null)}
                      className="w-full mt-4"
                    >
                      Continue to Next Milestone
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* DISPUTED State */}
            {project.state === 'DISPUTED' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Dispute in Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-red-50 p-4 rounded-lg mb-4">
                    <p className="text-red-800 font-medium">Project is under dispute resolution</p>
                    <p className="text-red-700 text-sm">All payments are frozen until resolution</p>
                  </div>

                  <Button
                    onClick={() => window.location.href = `/disputes/DSP-${project.id}`}
                    variant="outline"
                    className="w-full"
                  >
                    <Gavel className="h-4 w-4 mr-2" />
                    View Dispute Details
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* COMPLETED State */}
            {project.state === 'COMPLETED' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Project Completed Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800 font-medium">🎉 All milestones completed</p>
                    <p className="text-green-700 text-sm">✓ Total ${project.totalAmount} paid</p>
                    <p className="text-green-700 text-sm">✓ Smart contract closed</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Progress</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>{completedMilestones} of {project.milestones.length} milestones completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Milestones */}
            <Card>
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.milestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className={`p-3 border rounded-lg ${index === project.currentMilestone ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{milestone.title}</h4>
                        <Badge variant={
                          milestone.state === 'PAID' ? 'default' :
                            milestone.state === 'SUBMITTED' ? 'secondary' :
                              'outline'
                        }>
                          {milestone.state}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">${milestone.amount}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount</span>
                    <span className="font-medium">${project.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span className="font-medium text-green-600">
                      ${project.milestones.filter(m => m.state === 'PAID').reduce((sum, m) => sum + m.amount, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining</span>
                    <span className="font-medium">
                      ${project.milestones.filter(m => m.state !== 'PAID').reduce((sum, m) => sum + m.amount, 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Payment Method</span>
                      <span>{project.paymentMethod.replace('_', ' ')}</span>
                    </div>
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