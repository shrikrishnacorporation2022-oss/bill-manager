'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Loader2, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react';

interface ForwardingActivity {
    _id: string;
    emailFrom: string;
    emailSubject: string;
    forwardedTo: string;
    masterId: { name: string };
    forwardedAt: string;
    status: 'success' | 'failed';
    errorMessage?: string;
}

export default function ActivityLogPage() {
    const [activities, setActivities] = useState<ForwardingActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);

    useEffect(() => {
        fetchActivities();
    }, []);

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchActivities();
            }, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const fetchActivities = async () => {
        try {
            const res = await axios.get('/api/activity');
            setActivities(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    };

    return (
        <main className="min-h-screen p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Forwarding Activity Log
                    </h1>
                    <p className="text-gray-400 mt-2">Track all email forwarding actions</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${autoRefresh
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-white hover:bg-gray-500'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                        Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium transition-all"
                    >
                        ← Home
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
            ) : activities.length === 0 ? (
                <div className="glass-card text-center p-12">
                    <Activity className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <h2 className="text-xl font-bold text-white mb-2">No Activity Yet</h2>
                    <p className="text-gray-400 mb-6">Forwarding activities will appear here once emails are processed</p>
                </div>
            ) : (
                <div className="glass-card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="p-4 text-left text-sm font-semibold text-gray-400">Status</th>
                                    <th className="p-4 text-left text-sm font-semibold text-gray-400">Date & Time</th>
                                    <th className="p-4 text-left text-sm font-semibold text-gray-400">From</th>
                                    <th className="p-4 text-left text-sm font-semibold text-gray-400">Subject</th>
                                    <th className="p-4 text-left text-sm font-semibold text-gray-400">Forwarded To</th>
                                    <th className="p-4 text-left text-sm font-semibold text-gray-400">Rule</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activities.map((activity) => (
                                    <tr key={activity._id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            {activity.status === 'success' ? (
                                                <div className="flex items-center gap-2 text-green-400">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Success</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-400">
                                                    <XCircle className="w-5 h-5" />
                                                    <span className="text-sm font-medium" title={activity.errorMessage}>
                                                        Failed
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-sm">{formatDate(activity.forwardedAt)}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-white font-mono truncate max-w-xs block">
                                                {activity.emailFrom}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-gray-300 truncate max-w-md block">
                                                {activity.emailSubject}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-green-300 font-mono">
                                                {activity.forwardedTo}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                {activity.masterId?.name || 'Unknown'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </main>
    );
}
