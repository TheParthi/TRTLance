"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft,
    Briefcase,
    MapPin,
    Clock,
    DollarSign,
    Star,
    Send,
    AlertCircle,
    Plus,
    Minus,
} from "lucide-react";
import { RiskAnalysisModal } from "@/components/RiskAnalysisModal";
import { useAuth } from "@/contexts/auth-context";
import { getUserRoleInJob, canApplyToJob } from "@/lib/roles";

interface Job {
    id: string;
    title: string;
    description: string;
    budget_min: number;
    budget_max: number;
    status: string;
    created_by: string;
    created_at: string;
    category?: string;
    skills?: string[];
    location?: string;
    client?: {
        name: string;
        rating: number;
        completedJobs: number;
    };
}

interface Bid {
    id: string;
    freelancer_id: string;
    amount: number;
    proposal: string;
    milestones: Array<{
        title: string;
        amount: number;
        description: string;
    }>;
    created_at: string;
    freelancer?: {
        name: string;
        rating: number;
    };
}

export default function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
    const router = useRouter();
    const { user } = useAuth();
    const { jobId } = React.use(params);

    const [job, setJob] = useState<Job | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBidForm, setShowBidForm] = useState(false);
    const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false);

    // Bid form state
    const [bidAmount, setBidAmount] = useState("");
    const [proposal, setProposal] = useState("");
    const [duration, setDuration] = useState("");
    const [milestones, setMilestones] = useState<Array<{
        title: string;
        amount: string;
        description: string;
        duration: string;
    }>>([
        { title: "", amount: "", description: "", duration: "" }
    ]);
    const [submitting, setSubmitting] = useState(false);

    // Risk Analysis State

    const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [autoDownloadRisk, setAutoDownloadRisk] = useState(true);

    const [riskReport, setRiskReport] = useState(null);
    const [riskError, setRiskError] = useState<string | null>(null);

    useEffect(() => {
        fetchJobDetails();
    }, [jobId]);

    const fetchJobDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/jobs/${jobId}`);

            if (!response.ok) {
                console.error('Failed to fetch job');
                setJob(getMockJob());
                setBids([]);
                return;
            }

            const data = await response.json();
            setJob(data);

            // If user is client, fetch bids
            if (data.client_id === user?.id) {
                const bidsResponse = await fetch(`/api/jobs/${jobId}/bids`);
                if (bidsResponse.ok) {
                    const bidsData = await bidsResponse.json();
                    setBids(Array.isArray(bidsData) ? bidsData : []);
                } else {
                    setBids([]);
                }
            } else if (user?.id) {
                // Check if user has already applied
                const userBidsResponse = await fetch(`/api/bids/my-bids?freelancer_id=${user.id}`);
                if (userBidsResponse.ok) {
                    const userBids = await userBidsResponse.json();
                    const alreadyApplied = Array.isArray(userBids) &&
                        userBids.some((bid: any) => bid.job_id === jobId);
                    setHasAlreadyApplied(alreadyApplied);
                }
            }
        } catch (error) {
            console.error('Error fetching job:', error);
            // Mock data
            setJob(getMockJob());
            setBids([]);
        } finally {
            setLoading(false);
        }
    };

    const getMockJob = (): Job => ({
        id: jobId,
        title: "Build a Modern E-commerce Website",
        description: "Looking for an experienced full-stack developer to build a modern e-commerce platform with React and Node.js. Must have experience with payment gateways and product management systems.\n\nRequirements:\n- 5+ years of experience\n- Strong portfolio\n- Available to start immediately\n- Good communication skills",
        budget_min: 5000,
        budget_max: 8000,
        status: "OPEN",
        created_by: "client123",
        created_at: new Date().toISOString(),
        category: "Web Development",
        skills: ["React", "Node.js", "MongoDB", "Stripe", "API Development"],
        location: "Remote",
        client: {
            name: "TechCorp Inc",
            rating: 4.8,
            completedJobs: 47
        }
    });

    const getMockBids = (): Bid[] => [
        {
            id: "1",
            freelancer_id: "freelancer1",
            amount: 6500,
            proposal: "I have 7 years of experience building e-commerce platforms. I can deliver this project in 6 weeks with high quality code and complete documentation.",
            milestones: [
                { title: "UI/UX Design & Setup", amount: 1500, description: "Complete design and project setup" },
                { title: "Frontend Development", amount: 2500, description: "React frontend with all pages" },
                { title: "Backend & API", amount: 2000, description: "Node.js backend and API integration" },
                { title: "Testing & Deployment", amount: 500, description: "Final testing and deployment" }
            ],
            created_at: new Date().toISOString(),
            freelancer: {
                name: "John Smith",
                rating: 4.9
            }
        }
    ];

    const handleSubmitBid = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // TODO: Replace with actual API call
            const response = await fetch('/api/bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    freelancer_id: user?.id,
                    amount: parseFloat(bidAmount),
                    proposal,
                    duration,
                    milestones: milestones.map(m => ({
                        title: m.title,
                        amount: parseFloat(m.amount),
                        description: m.description,
                        duration: m.duration
                    }))
                }),
            });

            if (response.ok) {
                // Redirect to My Projects - Freelancer View to see pending bid
                router.push('/my-projects?tab=freelancer');
            } else {
                const errorData = await response.json();
                alert(`Failed to submit bid: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error submitting bid:', error);
            alert('Failed to submit bid. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAcceptBid = async (bidId: string) => {
        // Removed confirm dialog as per user request

        try {
            const response = await fetch(`/api/bids/${bidId}/accept`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                // Redirect to the contract page using the returned contractId
                router.push(`/contracts/${data.contractId}`);
            } else {
                const errorData = await response.json();
                alert(`Failed to accept bid: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error accepting bid:', error);
            alert('Failed to accept bid');
        }
    };

    const handleApplyClick = async () => {
        setIsRiskModalOpen(true);
        setIsAnalyzing(true);
        setAutoDownloadRisk(true);
        setRiskReport(null);

        try {
            const response = await fetch('/api/ai/project-risk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: jobId }),
            });

            if (response.ok) {
                const data = await response.json();
                setRiskReport(data);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Failed to fetch risk report', errorData);
                setRiskError(errorData.error || 'Failed to generate risk report. Please try again.');
            }
        } catch (error) {
            console.error('Error fetching risk report:', error);
            setRiskError('Network error. Check your connection or server logs.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleProceedApplication = () => {
        setIsRiskModalOpen(false);
        setShowBidForm(true);
    };

    if (loading || !job) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4 max-w-5xl">
                    <p className="text-center text-gray-600">Loading job details...</p>
                </div>
            </div>
        );
    }

    const userRole = getUserRoleInJob(job, user?.id);
    const canApply = canApplyToJob(job, user?.id);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-5xl">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-6 flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Jobs
                </Button>

                {/* Job Details */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-2xl mb-3">{job.title}</CardTitle>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4" />
                                        ${job.budget_min?.toLocaleString() || 0} - ${job.budget_max?.toLocaleString() || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {job.location || "Remote"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        Posted {new Date(job.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <Badge
                                variant={job.status === 'OPEN' ? 'default' : 'secondary'}
                                className="text-sm"
                            >
                                {job.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Description */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">Description</h3>
                            <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
                        </div>

                        {/* Skills */}
                        {job.skills && job.skills.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-2">Required Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {job.skills.map((skill) => (
                                        <Badge key={skill} variant="outline">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Client Info */}
                        {job.client && (
                            <div className="pt-6 border-t">
                                <h3 className="font-semibold mb-3">About the Client</h3>
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                        {job.client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium">{job.client.name}</p>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                {job.client.rating}
                                            </span>
                                            <span>{job.client.completedJobs} jobs completed</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Role-based Actions */}
                {userRole === 'CLIENT' ? (
                    /* Client View - Show Bids */
                    <Card>
                        <CardHeader>
                            <CardTitle>Bids ({bids.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {bids.length === 0 ? (
                                <div className="text-center py-8 text-gray-600">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                    <p>No bids received yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {bids.map((bid) => (
                                        <Card key={bid.id}>
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div>
                                                        <p className="font-semibold">{bid.freelancer?.name}</p>
                                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                            {bid.freelancer?.rating}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold text-green-600">${bid.amount.toLocaleString()}</p>
                                                        <p className="text-sm text-gray-600">
                                                            {new Date(bid.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <p className="text-gray-700 mb-4">{bid.proposal}</p>

                                                {bid.milestones && bid.milestones.length > 0 && (
                                                    <div className="mb-4">
                                                        <h4 className="font-semibold mb-2">Proposed Milestones</h4>
                                                        <div className="space-y-2">
                                                            {bid.milestones.map((milestone, idx) => (
                                                                <div key={idx} className="flex justify-between text-sm border-l-2 border-blue-500 pl-3">
                                                                    <span>{milestone.title}</span>
                                                                    <span className="font-semibold">${milestone.amount}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <Button onClick={() => handleAcceptBid(bid.id)} className="w-full">
                                                    Accept Bid
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : canApply ? (
                    /* Visitor View - Apply/Bid Form */
                    <Card>
                        <CardHeader>
                            <CardTitle>Submit Your Proposal</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {hasAlreadyApplied ? (
                                <div className="text-center py-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                        <Send className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Already Applied</h3>
                                    <p className="text-gray-600 mb-4">
                                        You have already submitted a proposal for this job.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push('/my-projects?tab=freelancer')}
                                    >
                                        View My Applications
                                    </Button>
                                </div>
                            ) : !showBidForm ? (
                                <div className="text-center py-8">
                                    <Button onClick={handleApplyClick} size="lg">
                                        <Send className="h-4 w-4 mr-2" />
                                        Apply to this Job
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmitBid} className="space-y-6">
                                    {/* Risk Report Access */}
                                    {riskReport && (
                                        <div className="flex justify-end p-2 bg-blue-50 rounded-lg border border-blue-100">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setAutoDownloadRisk(false);
                                                    setIsRiskModalOpen(true);
                                                }}
                                                className="gap-2 text-blue-700 hover:text-blue-800 hover:bg-blue-100"
                                            >
                                                <AlertCircle className="h-4 w-4" />
                                                View Risk Analysis Report
                                            </Button>
                                        </div>
                                    )}

                                    {/* Budget Reference */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm text-blue-900">
                                            <strong>Client's Budget:</strong> ${job.budget_min?.toLocaleString() || 0} - ${job.budget_max?.toLocaleString() || 0}
                                        </p>
                                    </div>

                                    {/* Bid Amount */}
                                    <div>
                                        <Label htmlFor="amount">Your Bid Amount (USD)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            value={bidAmount}
                                            onChange={(e) => setBidAmount(e.target.value)}
                                            placeholder="Enter your total bid amount"
                                            required
                                        />
                                    </div>

                                    {/* Duration */}
                                    <div>
                                        <Label htmlFor="duration">Project Duration</Label>
                                        <select
                                            id="duration"
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            required
                                        >
                                            <option value="">Select duration</option>
                                            <option value="1-week">1 Week</option>
                                            <option value="2-weeks">2 Weeks</option>
                                            <option value="1-month">1 Month</option>
                                            <option value="2-months">2 Months</option>
                                            <option value="3-months">3 Months</option>
                                            <option value="6-months">6+ Months</option>
                                        </select>
                                    </div>

                                    {/* Milestones */}
                                    <div>
                                        <Label>Project Milestones</Label>
                                        <p className="text-sm text-gray-600 mb-3">Break down your work into milestones with specific budgets</p>

                                        <div className="space-y-4">
                                            {milestones.map((milestone, index) => (
                                                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="font-semibold">Milestone {index + 1}</h4>
                                                        {milestones.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const newMilestones = milestones.filter((_, i) => i !== index);
                                                                    setMilestones(newMilestones);
                                                                }}
                                                                className="text-red-600"
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <Label>Title</Label>
                                                            <Input
                                                                value={milestone.title}
                                                                onChange={(e) => {
                                                                    const newMilestones = [...milestones];
                                                                    newMilestones[index].title = e.target.value;
                                                                    setMilestones(newMilestones);
                                                                }}
                                                                placeholder="e.g., UI Design & Mockups"
                                                                required
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <Label>Amount ($)</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={milestone.amount}
                                                                    onChange={(e) => {
                                                                        const newMilestones = [...milestones];
                                                                        newMilestones[index].amount = e.target.value;
                                                                        setMilestones(newMilestones);
                                                                    }}
                                                                    placeholder="1000"
                                                                    required
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label>Duration</Label>
                                                                <select
                                                                    value={milestone.duration}
                                                                    onChange={(e) => {
                                                                        const newMilestones = [...milestones];
                                                                        newMilestones[index].duration = e.target.value;
                                                                        setMilestones(newMilestones);
                                                                    }}
                                                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                                                    required
                                                                >
                                                                    <option value="">Select</option>
                                                                    <option value="3-days">3 Days</option>
                                                                    <option value="1-week">1 Week</option>
                                                                    <option value="2-weeks">2 Weeks</option>
                                                                    <option value="1-month">1 Month</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Label>Description</Label>
                                                            <Textarea
                                                                value={milestone.description}
                                                                onChange={(e) => {
                                                                    const newMilestones = [...milestones];
                                                                    newMilestones[index].description = e.target.value;
                                                                    setMilestones(newMilestones);
                                                                }}
                                                                placeholder="Describe what will be delivered in this milestone"
                                                                rows={2}
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setMilestones([...milestones, { title: "", amount: "", description: "", duration: "" }])}
                                            className="w-full mt-3"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Milestone
                                        </Button>

                                        {/* Milestone Total Validation */}
                                        {bidAmount && milestones.some(m => m.amount) && (
                                            <div className={`mt-3 p-3 rounded-md ${milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0) === parseFloat(bidAmount)
                                                ? 'bg-green-50 text-green-800 border border-green-200'
                                                : 'bg-red-50 text-red-800 border border-red-200'
                                                }`}>
                                                <p className="text-sm font-medium">
                                                    Milestone Total: ${milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0).toLocaleString()}
                                                    {milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0) === parseFloat(bidAmount)
                                                        ? ' ✓ Matches bid amount'
                                                        : ` ✗ Must equal $${parseFloat(bidAmount).toLocaleString()}`
                                                    }
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Proposal */}
                                    <div>
                                        <Label htmlFor="proposal">Cover Letter / Proposal</Label>
                                        <Textarea
                                            id="proposal"
                                            value={proposal}
                                            onChange={(e) => setProposal(e.target.value)}
                                            placeholder="Explain why you're the best fit for this job, your relevant experience, and your approach..."
                                            rows={8}
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <Button type="button" variant="outline" onClick={() => setShowBidForm(false)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                submitting ||
                                                milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0) !== parseFloat(bidAmount)
                                            }
                                            className="flex-1"
                                        >
                                            {submitting ? 'Submitting...' : 'Submit Bid'}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    /* Cannot Apply */
                    <Card>
                        <CardContent className="p-8 text-center">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-600">
                                {job.status !== 'OPEN'
                                    ? 'This job is no longer accepting applications'
                                    : 'You cannot apply to your own job'}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <RiskAnalysisModal
                isOpen={isRiskModalOpen}
                onClose={() => setIsRiskModalOpen(false)}
                onProceed={handleProceedApplication}
                isLoading={isAnalyzing}
                autoDownload={autoDownloadRisk}
                report={riskReport}
                error={riskError}
            />
        </div>
    );
}
