'use client';

import { useEffect, useState, Suspense } from 'react';
import axios from 'axios';
import { Mail, Plus, Loader2, Check, ArrowRight, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface GmailAccount {
    id: string;
    email: string;
    createdAt: string;
}

interface Email {
    id: string;
    from: string;
    subject: string;
    date: string;
}

function EmailsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [accounts, setAccounts] = useState<GmailAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<GmailAccount | null>(null);
    const [emails, setEmails] = useState<Email[]>([]);
    const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
    const [loading, setLoading] = useState(true);
    const [emailsLoading, setEmailsLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [forwardTo, setForwardTo] = useState('');
    const [keywords, setKeywords] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [ruleType, setRuleType] = useState<'sender' | 'keywords'>('sender');
    const [manualSender, setManualSender] = useState('');

    useEffect(() => {
        fetchAccounts();

        if (searchParams.get('success') === 'true') {
            alert('Gmail account connected successfully!');
            router.replace('/emails');
        }
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredEmails(emails);
        } else {
            const filtered = emails.filter(email =>
                email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
                email.subject.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredEmails(filtered);
        }
    }, [searchQuery, emails]);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get('/api/gmail/accounts');
            setAccounts(res.data);
            if (res.data.length > 0) {
                setSelectedAccount(res.data[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnectGmail = async () => {
        try {
            const res = await axios.get('/api/gmail/connect');
            window.location.href = res.data.authUrl;
        } catch (error) {
            console.error(error);
            alert('Failed to initiate Gmail connection');
        }
    };

    const fetchEmails = async (accountId: string) => {
        setEmailsLoading(true);
        try {
            const res = await axios.get(`/api/emails?accountId=${accountId}`);
            setEmails(res.data);
            setFilteredEmails(res.data);
        } catch (error) {
            console.error(error);
            alert('Failed to fetch emails');
        } finally {
            setEmailsLoading(false);
        }
    };

    const [syncing, setSyncing] = useState(false);

    const handleSyncMissed = async () => {
        if (!selectedAccount) return;
        setSyncing(true);
        try {
            const res = await axios.post('/api/gmail/sync-missed', {
                accountId: selectedAccount.id
            });
            alert(res.data.message);
            fetchEmails(selectedAccount.id);
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || 'Failed to sync missed emails');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (selectedAccount) {
            fetchEmails(selectedAccount.id);
        }
    }, [selectedAccount]);

    const extractSenderEmail = (from: string) => {
        const match = from.match(/<(.+?)>/);
        return match ? match[1] : from;
    };

    const handleCreateRule = async () => {
        if (!forwardTo) {
            alert('Please enter a forwarding email address');
            return;
        }

        if (ruleType === 'keywords' && !keywords.trim()) {
            alert('Please enter at least one keyword');
            return;
        }

        if (ruleType === 'sender' && !selectedEmail && !manualSender.trim()) {
            alert('Please select an email or enter an email address manually');
            return;
        }

        setSaving(true);
        try {
            const senderEmail = manualSender.trim()
                ? manualSender.trim()
                : selectedEmail
                    ? extractSenderEmail(selectedEmail.from)
                    : '';
            const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);

            await axios.post('/api/masters', {
                name: ruleType === 'sender'
                    ? `Emails from ${senderEmail}`
                    : `Emails with keywords: ${keywordArray.join(', ')}`,
                category: 'Other',
                emailSender: ruleType === 'sender' ? senderEmail : undefined,
                emailKeywords: ruleType === 'keywords' ? keywordArray : undefined,
                autoForwardTo: forwardTo,
                whatsappReminder: false,
                gmailAccountId: selectedAccount?.id,
            });

            alert('Forwarding rule created successfully!');
            setForwardTo('');
            setKeywords('');
            setSelectedEmail(null);
            setManualSender('');
        } catch (error) {
            console.error(error);
            alert('Failed to create rule');
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Email Manager
                    </h1>
                    <p className="text-gray-400 mt-2">Connect Gmail accounts and manage forwarding rules</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium transition-all"
                    >
                        ← Home
                    </button>
                    <button
                        onClick={handleConnectGmail}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Connect Gmail Account
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
            ) : accounts.length === 0 ? (
                <div className="glass-card text-center p-12">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <h2 className="text-xl font-bold text-white mb-2">No Gmail Accounts Connected</h2>
                    <p className="text-gray-400 mb-6">Connect your first Gmail account to start managing emails</p>
                    <button onClick={handleConnectGmail} className="btn-primary">
                        <Plus className="w-5 h-5 inline mr-2" />
                        Connect Gmail Account
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Account Selector */}
                    <div className="glass-card p-4">
                        <h3 className="text-sm text-gray-400 mb-3">Connected Accounts</h3>
                        <div className="flex gap-3 flex-wrap items-center">
                            {accounts.map((account) => (
                                <button
                                    key={account.id}
                                    onClick={() => setSelectedAccount(account)}
                                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${selectedAccount?.id === account.id
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                        }`}
                                >
                                    {selectedAccount?.id === account.id && <Check className="w-4 h-4" />}
                                    <Mail className="w-4 h-4" />
                                    {account.email}
                                </button>
                            ))}

                            {selectedAccount && (
                                <button
                                    onClick={handleSyncMissed}
                                    disabled={syncing}
                                    className="ml-auto px-4 py-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-all flex items-center gap-2"
                                >
                                    {syncing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Mail className="w-4 h-4" />
                                    )}
                                    {syncing ? 'Syncing...' : 'Sync Missed Emails'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Emails */}
                        <div className="glass-card p-0 overflow-hidden">
                            <div className="p-4 border-b border-white/10">
                                <h2 className="font-bold text-white mb-3">Recent Emails</h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search emails..."
                                        className="input-field pl-10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {emailsLoading ? (
                                <div className="p-8 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                                    {filteredEmails.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">
                                            No emails found
                                        </div>
                                    ) : (
                                        filteredEmails.map((email) => (
                                            <div
                                                key={email.id}
                                                onClick={() => {
                                                    setSelectedEmail(email);
                                                    setRuleType('sender');
                                                }}
                                                className={`p-4 cursor-pointer transition-colors ${selectedEmail?.id === email.id
                                                    ? 'bg-purple-500/20 border-l-4 border-purple-500'
                                                    : 'hover:bg-white/5'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Mail className="w-5 h-5 text-gray-400 mt-1" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">
                                                            {email.from}
                                                        </p>
                                                        <p className="text-sm text-gray-400 truncate mt-1">
                                                            {email.subject}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">{email.date}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Forwarding Config */}
                        <div className="glass-card">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Create Forwarding Rule</h3>
                                    <p className="text-sm text-gray-400">
                                        Forward emails based on sender or keywords
                                    </p>
                                </div>

                                {/* Rule Type Selector */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setRuleType('sender')}
                                        className={`flex-1 py-2 px-4 rounded-lg transition-all ${ruleType === 'sender'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                            }`}
                                    >
                                        By Sender
                                    </button>
                                    <button
                                        onClick={() => setRuleType('keywords')}
                                        className={`flex-1 py-2 px-4 rounded-lg transition-all ${ruleType === 'keywords'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                            }`}
                                    >
                                        By Keywords
                                    </button>
                                </div>

                                {ruleType === 'sender' ? (
                                    <div className="space-y-4">
                                        {selectedEmail && (
                                            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                                <p className="text-xs text-gray-500 mb-1">SELECTED FROM LIST</p>
                                                <p className="text-sm font-medium text-white break-all">
                                                    {extractSenderEmail(selectedEmail.from)}
                                                </p>
                                                <button
                                                    onClick={() => setSelectedEmail(null)}
                                                    className="text-xs text-purple-400 hover:text-purple-300 mt-2"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">
                                                {selectedEmail ? 'Or Enter Different Email' : 'Enter Email Address'}
                                            </label>
                                            <input
                                                type="email"
                                                className="input-field"
                                                placeholder="e.g., utcl-mum.wfbatch@adityabirla.com"
                                                value={manualSender}
                                                onChange={(e) => {
                                                    setManualSender(e.target.value);
                                                    if (e.target.value.trim()) {
                                                        setSelectedEmail(null);
                                                    }
                                                }}
                                            />
                                            <p className="text-xs text-gray-500 mt-2">
                                                {manualSender.trim()
                                                    ? 'Using manually entered email'
                                                    : selectedEmail
                                                        ? 'Manual entry will override selection above'
                                                        : 'Type any email address or select from list'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">
                                            Keywords (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g., invoice, bill, statement, receipt"
                                            value={keywords}
                                            onChange={(e) => setKeywords(e.target.value)}
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            Emails containing ANY of these keywords will be forwarded
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center justify-center">
                                    <ArrowRight className="w-6 h-6 text-purple-400" />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Forward To</label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        placeholder="recipient@example.com"
                                        value={forwardTo}
                                        onChange={(e) => setForwardTo(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={handleCreateRule}
                                    disabled={saving || !forwardTo}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Forwarding Rule'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function EmailsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
        }>
            <EmailsContent />
        </Suspense>
    );
}
