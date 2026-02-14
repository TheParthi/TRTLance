"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, CreditCard, Wallet, Smartphone, Globe } from "lucide-react";

export default function TokenStorePage() {
    const router = useRouter();
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
    const [customAmount, setCustomAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("upi");
    const [processing, setProcessing] = useState(false);

    const packages = [
        { id: "pack_10", tokens: 10, price: 100, label: "Starter" },
        { id: "pack_50", tokens: 50, price: 500, label: "Pro", popular: true },
        { id: "pack_100", tokens: 100, price: 1000, label: "Enterprise" },
    ];

    const handleBuy = async () => {
        if (!selectedPackage && !customAmount) return;

        setProcessing(true);
        try {
            const res = await fetch('/api/wallet/buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    packageId: selectedPackage || 'custom',
                    customAmount: selectedPackage ? null : customAmount,
                    paymentMethod
                })
            });

            const data = await res.json();

            if (res.ok) {
                // Redirect to wallet on success
                router.push('/profile/wallet');
            } else {
                alert(data.error || 'Payment failed');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                <Button
                    variant="ghost"
                    className="mb-6 pl-0 hover:bg-transparent hover:text-blue-600"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Wallet
                </Button>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">Token Store</h1>
                <p className="text-gray-600 mb-8">Purchase tokens to fund projects and unlock premium features.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {packages.map((pkg) => (
                        <Card
                            key={pkg.id}
                            className={`cursor-pointer transition-all border-2 relative ${selectedPackage === pkg.id
                                    ? 'border-blue-600 shadow-md bg-blue-50/50'
                                    : 'border-transparent hover:border-blue-200'
                                }`}
                            onClick={() => {
                                setSelectedPackage(pkg.id);
                                setCustomAmount("");
                            }}
                        >
                            {pkg.popular && (
                                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                                    POPULAR
                                </div>
                            )}
                            <CardHeader className="text-center pb-2">
                                <Badge variant="secondary" className="mb-2 mx-auto w-fit">{pkg.label}</Badge>
                                <h3 className="text-4xl font-bold text-gray-900">{pkg.tokens}</h3>
                                <p className="text-gray-500 font-medium">Tokens</p>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-2xl font-bold text-blue-600">₹{pkg.price}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Custom Amount */}
                <Card className="mb-8">
                    <CardContent className="p-6 flex items-center gap-6">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">Custom Amount</h3>
                            <p className="text-sm text-gray-500">Enter specific number of tokens (min 5)</p>
                        </div>
                        <div className="w-1/3">
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={customAmount}
                                    onChange={(e) => {
                                        setCustomAmount(e.target.value);
                                        setSelectedPackage(null);
                                    }}
                                    className="pr-16"
                                />
                                <span className="absolute right-3 top-2.5 text-gray-400 text-sm">Tokens</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div
                                className={`border rounded-lg p-4 cursor-pointer flex items-center gap-3 ${paymentMethod === 'upi' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}
                                onClick={() => setPaymentMethod('upi')}
                            >
                                <Smartphone className="h-5 w-5 text-purple-600" />
                                <span className="font-medium">UPI</span>
                                {paymentMethod === 'upi' && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                            </div>

                            <div
                                className={`border rounded-lg p-4 cursor-pointer flex items-center gap-3 ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}
                                onClick={() => setPaymentMethod('card')}
                            >
                                <CreditCard className="h-5 w-5 text-blue-600" />
                                <span className="font-medium">Card</span>
                                {paymentMethod === 'card' && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                            </div>

                            <div
                                className={`border rounded-lg p-4 cursor-pointer flex items-center gap-3 ${paymentMethod === 'netbanking' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}
                                onClick={() => setPaymentMethod('netbanking')}
                            >
                                <Globe className="h-5 w-5 text-green-600" />
                                <span className="font-medium">NetBanking</span>
                                {paymentMethod === 'netbanking' && <Check className="h-4 w-4 ml-auto text-blue-600" />}
                            </div>
                        </div>

                        <Separator className="my-6" />

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Payable</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    ₹{selectedPackage
                                        ? packages.find(p => p.id === selectedPackage)?.price
                                        : (parseInt(customAmount || '0') * 10).toLocaleString()}
                                </p>
                            </div>
                            <Button
                                size="lg"
                                className="px-8 bg-green-600 hover:bg-green-700"
                                onClick={handleBuy}
                                disabled={processing || (!selectedPackage && (!customAmount || parseInt(customAmount) < 5))}
                            >
                                {processing ? "Processing..." : "Proceed to Pay"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
