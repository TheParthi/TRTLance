'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, AlertOctagon, Download, ShieldAlert } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RiskReport {
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    risk_summary: string;
    issues: string[];
    confidence_score: number;
}

interface RiskAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    report: RiskReport | null;
    isLoading: boolean;
    error?: string | null;
    autoDownload?: boolean;
}

export function RiskAnalysisModal({ isOpen, onClose, onProceed, report, isLoading, error, autoDownload = true }: RiskAnalysisModalProps) {

    useEffect(() => {
        if (report && !isLoading && !error && autoDownload) {
            // Auto-download PDF after a short delay to ensure rendering
            const timer = setTimeout(() => {
                downloadPDF();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [report, isLoading, error, autoDownload]);

    const downloadPDF = () => {
        if (!report) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(41, 128, 185);
        doc.text('Project Risk Analysis Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        // Risk Level Section
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`Risk Level: ${report.risk_level}`, 14, 45);

        // Summary
        doc.setFontSize(12);
        doc.text('Summary:', 14, 60);
        doc.setFontSize(10);
        const splitSummary = doc.splitTextToSize(report.risk_summary, 180);
        doc.text(splitSummary, 14, 70);

        // Issues Table
        const lastY = 70 + (splitSummary.length * 5);
        doc.text('Identified Issues:', 14, lastY + 10);

        autoTable(doc, {
            startY: lastY + 15,
            head: [['Issue']],
            body: report.issues.map(issue => [issue]),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
        });

        // Disclaimer
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Disclaimer: This analysis is AI-generated and intended to assist decision-making.', 14, finalY);

        doc.save('project-risk-report.pdf');
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
            case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getRiskIcon = (level: string) => {
        switch (level) {
            case 'HIGH': return <AlertOctagon className="h-6 w-6 text-red-600" />;
            case 'MEDIUM': return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
            case 'LOW': return <CheckCircle className="h-6 w-6 text-green-600" />;
            default: return <ShieldAlert className="h-6 w-6" />;
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto w-full">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="text-xl">AI Project Risk Analysis</DialogTitle>
                    <DialogDescription>
                        Analyzing project details for potential risks...
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <p className="text-gray-500 font-medium animate-pulse">Consulting AI Oracle...</p>
                    </div>
                ) : report ? (
                    <div className="space-y-6">
                        {/* Risk Status Box */}
                        <div className={`p-6 rounded-xl border flex items-start gap-5 ${getRiskColor(report.risk_level)} shadow-sm`}>
                            <div className="mt-1 p-2 bg-white/50 rounded-full">{getRiskIcon(report.risk_level)}</div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-xl tracking-tight">{report.risk_level} RISK</h3>
                                <p className="text-base leading-relaxed opacity-90">{report.risk_summary}</p>
                            </div>
                        </div>

                        {/* Key Issues */}
                        <div className="bg-white rounded-lg border p-5 shadow-sm">
                            <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                                <AlertOctagon className="h-4 w-4 text-orange-500" />
                                Key Issues Identified
                            </h4>
                            <ul className="space-y-2">
                                {report.issues.map((issue, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                                        <span className="leading-relaxed">{issue}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Confidence & Footer Info */}
                        <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${report.confidence_score}%` }}
                                    />
                                </div>
                                <span className="font-medium">AI Confidence: {report.confidence_score}%</span>
                            </div>
                        </div>

                        <div className="bg-blue-50/80 p-4 rounded-lg border border-blue-100 text-xs text-blue-700 leading-relaxed flex gap-3">
                            <ShieldAlert className="h-5 w-5 shrink-0 text-blue-500" />
                            <p>
                                <strong>Disclaimer:</strong> This analysis is AI-generated and intended to assist decision-making.
                                It evaluates project parameters against common risk factors but does not guarantee outcomes.
                                You may proceed at your own discretion.
                            </p>
                        </div>

                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500 bg-red-50 rounded-xl border border-red-100">
                        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500/80" />
                        <h3 className="text-lg font-bold mb-1">Analysis Failed</h3>
                        <p className="text-sm max-w-xs mx-auto opacity-90">{error}</p>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        Initializing...
                    </div>
                )}

                <DialogFooter className="gap-3 sm:gap-2 pt-4 border-t mt-2">
                    {!isLoading && (
                        <>
                            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto order-2 sm:order-1">
                                Cancel Application
                            </Button>
                            <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                                {report && (
                                    <Button variant="secondary" onClick={downloadPDF} className="flex-1 sm:flex-none gap-2">
                                        <Download className="h-4 w-4" /> PDF
                                    </Button>
                                )}
                                <Button onClick={onProceed} className="flex-1 sm:flex-none bg-primary hover:bg-primary/90">
                                    Proceed Anyway
                                </Button>
                            </div>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
