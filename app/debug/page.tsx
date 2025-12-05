'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, MessageSquare, Mail, AlertCircle } from 'lucide-react';

interface DebugLog {
    timestamp: string;
    type: 'telegram' | 'email' | 'cron';
    message: string;
    data?: any;
}

export default function DebugPage() {
    const [logs, setLogs] = useState<DebugLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(fetchLogs, 3000); // Refresh every 3 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const fetchLogs = async () => {
        try {
            const res = await axios.get('/api/debug/logs');
            setLogs(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'telegram':
                return <MessageSquare className="w-5 h-5 text-blue-400" />;
            case 'email':
                return <Mail className="w-5 h-5 text-green-400" />;
            case 'cron':
                return <RefreshCw className="w-5 h-5 text-purple-400" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Debug Console
                    </h1>
                    <p className="text-gray-400 mt-2">Real-time logs for Telegram & Email forwarding</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${autoRefresh ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
                            } text-white`}
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

            <div className="glass-card p-0 overflow-hidden">
                {loading ? (
                    <div className="p-8 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                        <p className="text-gray-400">No logs yet. Send a Telegram message or wait for cron job.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                        {logs.map((log, idx) => (
                            <div key={idx} className="p-4 hover:bg-white/5 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded bg-white/5">
                                        {getIcon(log.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs px-2 py-1 rounded ${log.type === 'telegram' ? 'bg-blue-500/20 text-blue-300' :
                                                    log.type === 'email' ? 'bg-green-500/20 text-green-300' :
                                                        'bg-purple-500/20 text-purple-300'
                                                }`}>
                                                {log.type.toUpperCase()}
                                            </span>
                                            <span className="text-xs text-gray-500">{log.timestamp}</span>
                                        </div>
                                        <p className="text-sm text-white mb-2">{log.message}</p>
                                        {log.data && (
                                            <pre className="text-xs text-gray-400 bg-black/20 p-2 rounded overflow-x-auto">
                                                {JSON.stringify(log.data, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
