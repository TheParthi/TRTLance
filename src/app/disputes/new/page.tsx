'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  DollarSign,
  Calendar,
  User,
  Building,
  AlertTriangle,
  CheckCircle,
  Bot,
  Scale,
  Clock
} from 'lucide-react';
import { DisputeLayout } from '@/components/disputes/dispute-layout';

const freelancerDisputeTypes = [
  { value: 'payment_not_released', label: 'Payment not released after milestone completion' },
  { value: 'work_rejected_unfairly', label: 'Client rejected work unfairly' },
  { value: 'client_unresponsive', label: 'Client stopped responding' },
  { value: 'scope_creep', label: 'Scope creep without payment' },
  { value: 'account_abuse', label: 'Account abuse / cheating' }
];

const clientDisputeTypes = [
  { value: 'work_not_delivered', label: 'Freelancer did not deliver work' },
  { value: 'low_quality_work', label: 'Low-quality or plagiarized work' },
  { value: 'freelancer_disappeared', label: 'Freelancer disappeared' },
  { value: 'missed_deadline', label: 'Missed deadline' },
  { value: 'refund_not_processed', label: 'Refund not processed' }
];

interface AiAnalysis {
  riskScore: number;
  likelyFault: string;
  faultPercentage: number;
  suggestedResolution: string;
  confidence: string;
  similarCases: number;
  estimatedResolution: string;
}

export default function NewDisputePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    role: '',
    disputeType: '',
    projectId: '',
    milestoneId: '',
    description: '',
    attachments: []
  });
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const analysis = {
        riskScore: Math.floor(Math.random() * 100),
        likelyFault: form.role === 'freelancer' ? 'client' : 'freelancer',
        faultPercentage: Math.floor(Math.random() * 40) + 30,
        suggestedResolution: 'Partial payment release',
        confidence: 'High',
        similarCases: 15,
        estimatedResolution: '3-5 business days'
      };
      setAiAnalysis(analysis);
      setIsAnalyzing(false);
    }, 3000);
  };

  const handleSubmit = () => {
    router.push('/disputes');
  };

  return (
    <DisputeLayout backUrl="/disputes" backLabel="Back to Disputes">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Scale className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Raise New Dispute</h1>
            <p className="text-gray-600">Follow the steps to submit your dispute for fair resolution</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardContent className="p-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Who is raising this dispute?</h2>
                  <p className="text-gray-600">Select your role in this dispute</p>
                </div>

                <RadioGroup
                  value={form.role}
                  onValueChange={(value) => setForm(prev => ({ ...prev, role: value }))}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="freelancer" id="freelancer" />
                      <Label htmlFor="freelancer" className="flex items-center gap-3 cursor-pointer">
                        <User className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Freelancer</div>
                          <div className="text-sm text-gray-500">I am the service provider</div>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="client" id="client" />
                      <Label htmlFor="client" className="flex items-center gap-3 cursor-pointer">
                        <Building className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium">Client</div>
                          <div className="text-sm text-gray-500">I hired the freelancer</div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select Dispute Type</h2>
                  <p className="text-gray-600">Choose the category that best describes your issue</p>
                </div>

                <div className="space-y-3">
                  {(form.role === 'freelancer' ? freelancerDisputeTypes : clientDisputeTypes).map((type) => (
                    <div
                      key={type.value}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${form.disputeType === type.value ? 'border-blue-500 bg-blue-50' : ''
                        }`}
                      onClick={() => setForm(prev => ({ ...prev, disputeType: type.value }))}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${form.disputeType === type.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                          {form.disputeType === type.value && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{type.label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select Project & Milestone</h2>
                  <p className="text-gray-600">Choose the project and specific milestone related to this dispute</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project">Project</Label>
                    <Select value={form.projectId} onValueChange={(value) => setForm(prev => ({ ...prev, projectId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">E-commerce Website Development - $2500</SelectItem>
                        <SelectItem value="2">Mobile App UI Design - $1800</SelectItem>
                        <SelectItem value="3">Logo Design Project - $500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.projectId && (
                    <div>
                      <Label htmlFor="milestone">Milestone</Label>
                      <Select value={form.milestoneId} onValueChange={(value) => setForm(prev => ({ ...prev, milestoneId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a milestone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Initial Design Mockups - $500</SelectItem>
                          <SelectItem value="2">Frontend Development - $1000</SelectItem>
                          <SelectItem value="3">Backend Integration - $1000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Explain the Issue</h2>
                  <p className="text-gray-600">Provide detailed description and supporting evidence</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="description">Detailed Description *</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the issue in detail. Include timeline, communications, and specific problems..."
                      className="min-h-32"
                    />
                  </div>

                  <div>
                    <Label>Attachments</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Upload files, screenshots, chat logs, or payment proof
                      </p>
                      <Button variant="outline" size="sm">
                        Choose Files
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">AI Pre-Analysis</h2>
                  <p className="text-gray-600">Our AI will analyze your case before human expert review</p>
                </div>

                {!aiAnalysis && !isAnalyzing && (
                  <div className="text-center py-8">
                    <Bot className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for AI Analysis</h3>
                    <p className="text-gray-600 mb-4">
                      Click below to run AI analysis on your dispute case
                    </p>
                    <Button onClick={runAIAnalysis} className="bg-blue-600 hover:bg-blue-700">
                      <Bot className="h-4 w-4 mr-2" />
                      Run AI Analysis
                    </Button>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Case...</h3>
                    <p className="text-gray-600">
                      AI is reviewing contract terms, communications, and similar cases
                    </p>
                  </div>
                )}

                {aiAnalysis && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="font-medium text-green-900">Analysis Complete</h3>
                      </div>
                      <p className="text-sm text-green-700">
                        AI has successfully analyzed your case with {aiAnalysis.confidence.toLowerCase()} confidence
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Risk Score</span>
                            <Badge variant={aiAnalysis.riskScore > 70 ? 'destructive' : aiAnalysis.riskScore > 40 ? 'default' : 'secondary'}>
                              {aiAnalysis.riskScore}/100
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-600 mb-2">Likely Fault</div>
                          <div className="text-lg font-semibold text-gray-900 capitalize">
                            {aiAnalysis.likelyFault} ({aiAnalysis.faultPercentage}%)
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Submit Dispute</h2>
                  <p className="text-gray-600">Review your dispute details and submit for expert review</p>
                </div>

                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Dispute Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Role:</span>
                        <span className="ml-2 capitalize">{form.role}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Type:</span>
                        <span className="ml-2">{form.disputeType.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 mb-1">Legal Disclaimer</h4>
                      <p className="text-sm text-yellow-700">
                        By submitting this dispute, you agree to our dispute resolution process and acknowledge that
                        all information provided is accurate. False claims may result in account penalties.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentStep < totalSteps ? (
                  <Button
                    onClick={handleNext}
                    disabled={
                      (currentStep === 1 && !form.role) ||
                      (currentStep === 2 && !form.disputeType) ||
                      (currentStep === 3 && (!form.projectId || !form.milestoneId)) ||
                      (currentStep === 4 && !form.description.trim()) ||
                      (currentStep === 5 && !aiAnalysis)
                    }
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                    Submit Dispute
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DisputeLayout>
  );
}