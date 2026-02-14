"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

interface WalletBalanceProps {
    balance: number;
    inrValue: number;
    loading: boolean;
    onRefresh: () => void;
}

export function WalletBalanceSection({ balance, inrValue, loading, onRefresh }: WalletBalanceProps) {
    const router = useRouter();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Main Balance Card */}
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-lg relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white opacity-10 blur-3xl"></div>

                <CardContent className="p-8 relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-blue-100 font-medium mb-1 flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                Token Balance
                            </p>
                            <h2 className="text-5xl font-bold mb-2">
                                {loading ? "..." : balance.toLocaleString()}
                                <span className="text-2xl font-normal opacity-80 z-20"> TKN</span>
                            </h2>
                            <p className="text-blue-100 opacity-90">
                                ≈ ₹{loading ? "..." : inrValue.toLocaleString("en-IN")} INR
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onRefresh}
                            className="text-blue-100 hover:text-white hover:bg-blue-600/20"
                        >
                            <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    <div className="flex gap-4 mt-4">
                        <Button
                            onClick={() => router.push('/profile/token-store')}
                            className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm border-0"
                            size="lg"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Buy Tokens
                        </Button>
                        <Button
                            onClick={() => router.push('/profile/token-redeem')}
                            variant="outline"
                            className="bg-blue-600/30 text-white border-white/30 hover:bg-blue-600/40 hover:text-blue-50 backdrop-blur-sm"
                            size="lg"
                        >
                            <ArrowDownLeft className="h-5 w-5 mr-2" />
                            Redeem
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Info Card / Quick Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-gray-700 font-medium">Wallet Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <ArrowUpRight className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Total Purchased</p>
                                <p className="text-xs text-gray-500">Lifetime</p>
                            </div>
                        </div>
                        <p className="font-bold text-gray-900">-- TKN</p>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <ArrowDownLeft className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Total Redeemed</p>
                                <p className="text-xs text-gray-500">Lifetime</p>
                            </div>
                        </div>
                        <p className="font-bold text-gray-900">-- TKN</p>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center">
                            1 Token = ₹10.00 • Secure Blockchain Ledger
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
