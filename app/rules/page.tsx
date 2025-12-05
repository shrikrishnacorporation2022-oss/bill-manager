'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Mail, Trash2, Loader2, Tag, User, Edit2, X, Save } from 'lucide-react';

interface Master {
    _id: string;
    name: string;
    emailSender?: string;
    emailKeywords?: string[];
    autoForwardTo?: string;
    category: string;
}

export default function ForwardingRulesPage() {
    const [rules, setRules] = useState<Master[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRule, setEditingRule] = useState<Master | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        emailSender: '',
        emailKeywords: '',
        autoForwardTo: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const res = await axios.get('/api/masters');
            // Filter only rules with forwarding configured
            const forwardingRules = res.data.filter((m: Master) => m.autoForwardTo);
            setRules(forwardingRules);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (rule: Master) => {
        setEditingRule(rule);
        setEditForm({
            name: rule.name,
            emailSender: rule.emailSender || '',
            emailKeywords: rule.emailKeywords?.join(', ') || '',
            autoForwardTo: rule.autoForwardTo || '',
        });
    };

    const handleSaveEdit = async () => {
        if (!editingRule) return;

        setSaving(true);
        try {
            const keywordArray = editForm.emailKeywords
                .split(',')
                .map(k => k.trim())
                .filter(k => k);

            await axios.put(`/api/masters/${editingRule._id}`, {
                name: editForm.name,
                emailSender: editForm.emailSender || undefined,
                emailKeywords: keywordArray.length > 0 ? keywordArray : undefined,
                autoForwardTo: editForm.autoForwardTo,
            });

            setEditingRule(null);
            await fetchRules();
        } catch (error) {
            console.error(error);
            alert('Failed to update rule');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this forwarding rule?')) return;

        try {
            await axios.delete(`/api/masters/${id}`);
            await fetchRules();
        } catch (error) {
            console.error(error);
            alert('Failed to delete rule');
        }
    };

    const getRuleType = (rule: Master) => {
        if (rule.emailSender) return 'sender';
        if (rule.emailKeywords && rule.emailKeywords.length > 0) return 'keywords';
        return 'unknown';
    };

    return (
        <main className="min-h-screen p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Forwarding Rules
                    </h1>
                    <p className="text-gray-400 mt-2">View and manage your email forwarding rules</p>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium transition-all"
                >
                    ← Home
                </button>
            </header>

            {/* Edit Modal */}
            {editingRule && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Edit Forwarding Rule</h2>
                            <button
                                onClick={() => setEditingRule(null)}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Rule Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Email Sender (optional)</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    placeholder="e.g., bills@company.com"
                                    value={editForm.emailSender}
                                    onChange={(e) => setEditForm({ ...editForm, emailSender: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave empty if using keywords instead</p>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Keywords (comma-separated)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g., invoice, bill, receipt"
                                    value={editForm.emailKeywords}
                                    onChange={(e) => setEditForm({ ...editForm, emailKeywords: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave empty if using sender email instead</p>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Forward To Email</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    placeholder="recipient@example.com"
                                    value={editForm.autoForwardTo}
                                    onChange={(e) => setEditForm({ ...editForm, autoForwardTo: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={saving || !editForm.name || !editForm.autoForwardTo}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setEditingRule(null)}
                                    className="px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
            ) : rules.length === 0 ? (
                <div className="glass-card text-center p-12">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <h2 className="text-xl font-bold text-white mb-2">No Forwarding Rules</h2>
                    <p className="text-gray-400 mb-6">Create your first rule in Email Manager</p>
                    <button
                        onClick={() => window.location.href = '/emails'}
                        className="btn-primary"
                    >
                        Go to Email Manager
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rules.map((rule) => {
                        const ruleType = getRuleType(rule);
                        return (
                            <div key={rule._id} className="glass-card hover:scale-105 transition-transform">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {ruleType === 'sender' ? (
                                            <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
                                                <User className="w-5 h-5 text-blue-400" />
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
                                                <Tag className="w-5 h-5 text-purple-400" />
                                            </div>
                                        )}
                                        <div>
                                            <span className={`text-xs px-2 py-1 rounded ${ruleType === 'sender'
                                                ? 'bg-blue-500/20 text-blue-300'
                                                : 'bg-purple-500/20 text-purple-300'
                                                }`}>
                                                {ruleType === 'sender' ? 'By Sender' : 'By Keywords'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(rule)}
                                            className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
                                            title="Edit rule"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule._id)}
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                            title="Delete rule"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-3 line-clamp-2">{rule.name}</h3>

                                {ruleType === 'sender' && rule.emailSender && (
                                    <div className="mb-3 p-3 bg-white/5 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">FROM</p>
                                        <p className="text-sm text-white font-mono break-all">{rule.emailSender}</p>
                                    </div>
                                )}

                                {ruleType === 'keywords' && rule.emailKeywords && (
                                    <div className="mb-3 p-3 bg-white/5 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-2">KEYWORDS</p>
                                        <div className="flex flex-wrap gap-2">
                                            {rule.emailKeywords.map((keyword, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                    <p className="text-xs text-gray-500 mb-1">FORWARDS TO</p>
                                    <p className="text-sm text-green-300 font-mono break-all">{rule.autoForwardTo}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
                <div className="space-y-3 text-sm text-gray-300">
                    <div className="flex gap-3">
                        <div className="p-2 rounded bg-blue-500/20">
                            <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">Sender-Based Rules</p>
                            <p className="text-gray-400">Forwards all emails from a specific sender</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="p-2 rounded bg-purple-500/20">
                            <Tag className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">Keyword-Based Rules</p>
                            <p className="text-gray-400">Forwards emails from <strong>ANY sender</strong> containing the specified keywords in subject or body</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
