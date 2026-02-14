"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wallet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TokenRedeemPage() {
    const router = useRouter();
    const [balance, setBalance] = useState(0);
    const [redeemAmount, setRedeemAmount] = useState("");
    const [bankDetails, setBankDetails] = useState({
        accountNumber: "",
        ifsc: "",
        name: "",
        upiId: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Fetch current balance
        fetch('/api/wallet/balance')
            .then(res => res.json())
            .then(data => {
                if (data.tokenBalance) setBalance(data.tokenBalance);
            })
            .catch(err => console.error(err));
    }, []);

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!redeemAmount) return;

        setLoading(true);
        setError("");

        try {
            const res = await fetch('/api/wallet/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amountTokens: parseInt(redeemAmount),
                    bankDetails
                })
            });

            const data = await res.json();

            if (res.ok) {
                router.push('/profile/wallet');
            } else {
                setError(data.error || 'Redemption failed');
            }

        } catch (err) {
            console.error(err);
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const inrValue = parseInt(redeemAmount || "0") * 10;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-2xl">
                <Button
                    variant="ghost"
                    className="mb-6 pl-0 hover:bg-transparent hover:text-blue-600"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Wallet
                </Button>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">Redeem Tokens</h1>
                <p className="text-gray-600 mb-8">Convert your earned tokens to INR and withdraw to your bank.</p>

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-6">
                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-900">Available Balance</p>
                                <h2 className="text-3xl font-bold text-blue-700">{balance} TKN</h2>
                            </div>
                            <Wallet className="h-10 w-10 text-blue-300" />
                        </CardContent>
                    </Card>

                    <form onSubmit={handleRedeem}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Withdrawal Details</CardTitle>
                                <CardDescription>Enter amount and bank details for payout</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Tokens to Redeem</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={redeemAmount}
                                        onChange={(e) => setRedeemAmount(e.target.value)}
                                        max={balance}
                                        required
                                    />
                                    <p className="text-sm text-gray-500 text-right">
                                        Equivalent Value: <span className="font-bold text-green-600">₹{inrValue}</span>
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Account Holder Name</Label>
                                    <Input
                                        placeholder="As per bank records"
                                        value={bankDetails.name}
                                        onChange={(e) => setBankDetails({ ...bankDetails, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Account Number</Label>
                                        <Input
                                            placeholder="XXXX-XXXX-XXXX"
                                            value={bankDetails.accountNumber}
                                            onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>IFSC Code</Label>
                                        <Input
                                            placeholder="SBIN000XXXX"
                                            value={bankDetails.ifsc}
                                            onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-muted-foreground">Or using UPI</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>UPI ID (Optional)</Label>
                                    <Input
                                        placeholder="username@upi"
                                        value={bankDetails.upiId}
                                        onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full mt-4"
                                    size="lg"
                                    disabled={loading || parseInt(redeemAmount) > balance || parseInt(redeemAmount) <= 0}
                                >
                                    {loading ? "Processing Request..." : "Submit Redemption Request"}
                                </Button>
                            </CardContent>
                        </Card>
                    </form>
                </div>
            </div>
        </div>
    );
}
