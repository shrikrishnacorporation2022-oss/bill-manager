'use client';

import { useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import axios from 'axios';

export default function MasterForm({ onSuccess }: { onSuccess: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Electricity',
        consumerNumber: '',
        provider: '',
        dueDateDay: '',
        emailKeywords: '',
        autoForwardTo: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/masters', {
                ...formData,
                emailKeywords: formData.emailKeywords.split(',').map(k => k.trim()),
            });
            setIsOpen(false);
            setFormData({
                name: '',
                category: 'Electricity',
                consumerNumber: '',
                provider: '',
                dueDateDay: '',
                emailKeywords: '',
                autoForwardTo: '',
            });
            onSuccess();
        } catch (error) {
            console.error('Failed to save master', error);
            alert('Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="glass-card flex items-center justify-center gap-2 w-full h-full min-h-[200px] border-dashed border-2 border-white/20 hover:border-purple-500 group cursor-pointer"
            >
                <div className="p-4 rounded-full bg-white/5 group-hover:bg-purple-500/20 transition-colors">
                    <Plus className="w-8 h-8 text-gray-400 group-hover:text-purple-400" />
                </div>
                <span className="text-xl font-medium text-gray-400 group-hover:text-white">Add New Connection</span>
            </button>
        );
    }

    return (
        <div className="glass-card relative animate-in fade-in zoom-in duration-200">
            <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
                <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                New Connection
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Name (e.g. Home WiFi)</label>
                        <input
                            required
                            type="text"
                            className="input-field"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Category</label>
                        <select
                            className="input-field appearance-none"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="Electricity">Electricity</option>
                            <option value="Phone">Phone</option>
                            <option value="Internet">Internet</option>
                            <option value="PropertyTax">Property Tax</option>
                            <option value="Insurance">Insurance</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Consumer/Policy No.</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.consumerNumber}
                            onChange={e => setFormData({ ...formData, consumerNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Provider</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.provider}
                            onChange={e => setFormData({ ...formData, provider: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">Email Keywords (comma separated)</label>
                    <input
                        type="text"
                        placeholder="e.g. Airtel Bill, Act Fibernet"
                        className="input-field"
                        value={formData.emailKeywords}
                        onChange={e => setFormData({ ...formData, emailKeywords: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {loading ? 'Saving...' : <><Save className="w-5 h-5" /> Save Connection</>}
                </button>
            </form>
        </div>
    );
}
