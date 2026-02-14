"use client";

import React, { useEffect, useState } from "react";
import { WalletBalanceSection } from "@/components/wallet/wallet-balance-section";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function WalletPage() {
    const [balance, setBalance] = useState(0);
    const [inrValue, setInrValue] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Balance
            const balanceRes = await fetch('/api/wallet/balance');
            const balanceData = await balanceRes.json();

            if (balanceRes.ok) {
                setBalance(balanceData.tokenBalance);
                setInrValue(balanceData.inrValue);
            } else {
                console.error("Failed to fetch balance");
            }

            // Fetch Transactions
            const txRes = await fetch('/api/wallet/transactions');
            const txData = await txRes.json();

            if (txRes.ok) {
                setTransactions(txData.transactions || []);
            }

        } catch (err) {
            console.error("Error fetching wallet data:", err);
            setError("Failed to load wallet data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-5xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wallet</h1>
                <p className="text-gray-600 mb-8">Manage your platform tokens and transaction history.</p>

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <WalletBalanceSection
                    balance={balance}
                    inrValue={inrValue}
                    loading={loading}
                    onRefresh={fetchData}
                />

                <TransactionHistory
                    transactions={transactions}
                    loading={loading}
                />
            </div>
        </div>
    );
}
