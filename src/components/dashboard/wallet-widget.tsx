"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function WalletWidget() {
    const router = useRouter();
    const [balance, setBalance] = useState<number | null>(null);

    useEffect(() => {
        fetch('/api/wallet/balance')
            .then(res => res.json())
            .then(data => {
                if (typeof data.tokenBalance === 'number') {
                    setBalance(data.tokenBalance);
                }
            })
            .catch(err => console.error(err));
    }, []);

    return (
        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300 flex items-center justify-between">
                    <span>Wallet Balance</span>
                    <Wallet className="h-4 w-4 text-blue-400" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-3xl font-bold">
                            {balance === null ? "..." : balance.toLocaleString()}
                            <span className="text-lg font-normal text-slate-400 ml-1">TKN</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            ≈ ₹{balance ? (balance * 10).toLocaleString() : '0'} INR
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs bg-blue-600 text-white hover:bg-blue-700 border-0"
                            onClick={() => router.push('/profile/token-store')}
                        >
                            <Plus className="h-3 w-3 mr-1" /> Buy
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                            onClick={() => router.push('/profile/wallet')}
                        >
                            Manage <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
