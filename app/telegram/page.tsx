'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Send, Loader2, CheckCircle, Settings } from 'lucide-react';

export default function TelegramSettingsPage() {
    const [forwardEmail, setForwardEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/telegram/settings');
            if (res.data.autoForwardTo) {
                setForwardEmail(res.data.autoForwardTo);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!forwardEmail.trim()) {
            alert('Please enter an email address');
            return;
        }

        setSaving(true);
        try {
            await axios.post('/api/telegram/settings', {
                autoForwardTo: forwardEmail.trim(),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error(error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Telegram Settings
                    </h1>
                    <p className="text-gray-400 mt-2">Configure Telegram message forwarding</p>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium transition-all"
                >
                    ← Home
                </button>
            </header>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
            ) : (
                <div className="max-w-2xl">
                    <div className="glass-card">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 rounded-xl bg-blue-500/20">
                                <Send className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Email Forwarding</h3>
                                <p className="text-sm text-gray-400">All Telegram messages will be forwarded to this email</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Forward To Email</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    placeholder="e.g., bills@yourcompany.com"
                                    value={forwardEmail}
                                    onChange={(e) => setForwardEmail(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Messages will be sent from your connected Gmail account
                                </p>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving || !forwardEmail.trim()}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : saved ? (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Saved!
                                    </>
                                ) : (
                                    <>
                                        <Settings className="w-5 h-5" />
                                        Save Settings
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="glass-card mt-6 p-6">
                        <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
                        <div className="space-y-3 text-sm text-gray-300">
                            <div className="flex gap-3">
                                <div className="text-purple-400 font-bold">1.</div>
                                <p>Send any message, image, or document to your Telegram bot</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="text-purple-400 font-bold">2.</div>
                                <p>The bot automatically forwards it to the email you configured above</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="text-purple-400 font-bold">3.</div>
                                <p>Email is sent FROM your connected Gmail account</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="text-purple-400 font-bold">4.</div>
                                <p>Attachments (PDFs, images) are included in the email</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
