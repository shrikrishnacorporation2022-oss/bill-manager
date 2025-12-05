'use client';

import { useState } from 'react';
import axios from 'axios';
import { CheckCircle, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function GmailActivationPage() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState('');

    const activatePush = async () => {
        setLoading(true);
        setError('');
        setResults(null);

        try {
            const res = await axios.post('/api/gmail/watch', {
                topicName: 'projects/bill-agent-480206/topics/gmail-push'
            });

            setResults(res.data.results);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8">
            <header className="mb-8">
                <button
                    onClick={() => window.location.href = '/'}
                    className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </button>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    Gmail Push Activation
                </h1>
                <p className="text-gray-400 mt-2">Activate instant email forwarding</p>
            </header>

            <div className="max-w-2xl mx-auto">
                <div className="glass-card p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-white mb-2">What This Does</h2>
                        <p className="text-gray-300">
                            This will tell Gmail to start sending push notifications to your app.
                            Instead of checking email every hour, emails will be forwarded <strong>instantly</strong> when they arrive!
                        </p>
                    </div>

                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <h3 className="text-sm font-semibold text-blue-300 mb-2">📋 Prerequisites (Already Done)</h3>
                        <ul className="text-sm text-gray-300 space-y-1">
                            <li>✓ Google Cloud Pub/Sub API enabled</li>
                            <li>✓ Topic: <code className="text-xs bg-black/30 px-1 py-0.5 rounded">gmail-push</code></li>
                            <li>✓ Subscription configured with webhook endpoint</li>
                            <li>✓ Permissions granted to Gmail service account</li>
                        </ul>
                    </div>

                    {!results && !error && (
                        <button
                            onClick={activatePush}
                            disabled={loading}
                            className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Activating...
                                </>
                            ) : (
                                <>
                                    ⚡ Activate Gmail Push Notifications
                                </>
                            )}
                        </button>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-red-300 mb-1">Activation Failed</h3>
                                    <p className="text-sm text-gray-300">{error}</p>
                                    <button
                                        onClick={activatePush}
                                        className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {results && (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-green-300 mb-1">Activation Successful!</h3>
                                        <p className="text-sm text-gray-300 mb-3">
                                            Gmail is now configured to send instant push notifications. Emails will be forwarded immediately!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-semibold text-white">Account Status:</h3>
                                {results.map((result: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg ${result.status === 'success'
                                                ? 'bg-green-500/10 border border-green-500/30'
                                                : 'bg-red-500/10 border border-red-500/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white">{result.email}</span>
                                            <span className={`text-xs px-2 py-1 rounded ${result.status === 'success'
                                                    ? 'bg-green-500/20 text-green-300'
                                                    : 'bg-red-500/20 text-red-300'
                                                }`}>
                                                {result.status}
                                            </span>
                                        </div>
                                        {result.expiration && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Expires: {new Date(Number(result.expiration)).toLocaleString()}
                                            </p>
                                        )}
                                        {result.error && (
                                            <p className="text-xs text-red-400 mt-1">{result.error}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <h3 className="text-sm font-semibold text-blue-300 mb-2">🧪 Test It Now</h3>
                                <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                                    <li>Send yourself an email with "invoice" in the subject</li>
                                    <li>Check the Debug Console for "GMAIL PUSH RECEIVED"</li>
                                    <li>Check Activity Log to see the forwarding</li>
                                    <li>Check your forwarding email inbox!</li>
                                </ol>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.location.href = '/debug'}
                                    className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-medium transition-all"
                                >
                                    Open Debug Console
                                </button>
                                <button
                                    onClick={() => window.location.href = '/activity'}
                                    className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium transition-all"
                                >
                                    Open Activity Log
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <h3 className="text-sm font-semibold text-yellow-300 mb-2">⚠️ Important Notes</h3>
                    <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Gmail watch expires after 7 days (auto-renewed daily by cron job)</li>
                        <li>• You can re-activate anytime by clicking the button again</li>
                        <li>• The old hourly cron job is still active as a backup</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
