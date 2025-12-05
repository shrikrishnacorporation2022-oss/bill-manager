'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Trash2, Loader2, Tag } from 'lucide-react';

interface Category {
    _id: string;
    name: string;
    icon: string;
    color: string;
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/categories');
            if (res.data.length === 0) {
                // Seed default categories if none exist
                await axios.post('/api/categories/seed');
                const res2 = await axios.get('/api/categories');
                setCategories(res2.data);
            } else {
                setCategories(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!name.trim()) return;

        setSaving(true);
        try {
            await axios.post('/api/categories', {
                name: name.trim(),
                icon: 'Tag',
                color: 'gray',
            });
            setName('');
            await fetchCategories();
        } catch (error) {
            console.error(error);
            alert('Failed to add category');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this category?')) return;

        try {
            await axios.delete(`/api/categories/${id}`);
            await fetchCategories();
        } catch (error) {
            console.error(error);
            alert('Failed to delete category');
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Category Master
                </h1>
                <p className="text-gray-400 mt-2">Manage your bill categories</p>
            </header>

            <div className="max-w-2xl">
                {/* Add New Category */}
                <div className="glass-card mb-6">
                    <h3 className="text-lg font-bold text-white mb-4">Add New Category</h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            className="input-field flex-1"
                            placeholder="e.g., Rent, Telephone, Water Bill"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={saving || !name.trim()}
                            className="btn-primary px-6"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Categories List */}
                <div className="glass-card p-0 overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h3 className="font-bold text-white">Your Categories</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {categories.map((category) => (
                                <div key={category._id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                            <Tag className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <span className="text-white font-medium">{category.name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(category._id)}
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
