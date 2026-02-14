"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from "lucide-react";

interface Transaction {
    id: string;
    type: 'BUY' | 'SPEND' | 'RECEIVE' | 'REDEEM';
    tokens: number;
    amount_inr: number;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    description: string;
    created_at: string;
}

interface TransactionHistoryProps {
    transactions: Transaction[];
    loading: boolean;
}

export function TransactionHistory({ transactions, loading }: TransactionHistoryProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
                <CardContent className="h-48 flex items-center justify-center">
                    <p className="text-gray-500">Loading transactions...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No transactions found.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors bg-white hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${tx.type === 'BUY' || tx.type === 'RECEIVE'
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-red-100 text-red-600'
                                        }`}>
                                        {tx.type === 'BUY' || tx.type === 'RECEIVE' ? (
                                            <ArrowDownLeft className="h-5 w-5" />
                                        ) : (
                                            <ArrowUpRight className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{tx.description || tx.type}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-lg ${tx.type === 'BUY' || tx.type === 'RECEIVE'
                                            ? 'text-green-600'
                                            : 'text-gray-900'
                                        }`}>
                                        {tx.type === 'BUY' || tx.type === 'RECEIVE' ? '+' : '-'}{tx.tokens} TKN
                                    </p>
                                    <div className="flex items-center justify-end gap-2 mt-1">
                                        <span className="text-xs text-gray-400 font-medium">
                                            ₹{tx.amount_inr?.toFixed(2)}
                                        </span>
                                        <Badge variant="secondary" className={`
                        text-xs px-2 py-0.5
                        ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                                                tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
                    `}>
                                            {tx.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
