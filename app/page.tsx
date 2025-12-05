'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import MasterForm from '@/components/MasterForm';
import { Zap, Wifi, Phone, Car, Home as HomeIcon, CreditCard, Bell, RefreshCw, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

interface Master {
  _id: string;
  name: string;
  category: string;
  provider: string;
  dueDateDay?: number;
}

export default function Home() {
  const { data: session } = useSession();
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMasters = async () => {
    try {
      const res = await axios.get('/api/masters');
      setMasters(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  const getIcon = (category: string) => {
    switch (category) {
      case 'Electricity': return <Zap className="w-6 h-6 text-yellow-400" />;
      case 'Internet': return <Wifi className="w-6 h-6 text-blue-400" />;
      case 'Phone': return <Phone className="w-6 h-6 text-green-400" />;
      case 'Insurance': return <Car className="w-6 h-6 text-red-400" />;
      case 'PropertyTax': return <HomeIcon className="w-6 h-6 text-purple-400" />;
      default: return <CreditCard className="w-6 h-6 text-gray-400" />;
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Bill Command Center
          </h1>
          <p className="text-gray-400 mt-2">Manage your empire's expenses</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.href = '/activity'}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-medium transition-all"
          >
            Activity Log
          </button>
          <button
            onClick={() => window.location.href = '/rules'}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-medium transition-all"
          >
            Forwarding Rules
          </button>
          <button
            onClick={() => window.location.href = '/categories'}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium transition-all"
          >
            Categories
          </button>
          <button
            onClick={() => window.location.href = '/emails'}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all"
          >
            Email Manager
          </button>
          <button
            onClick={() => window.location.href = '/telegram'}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition-all"
          >
            Telegram
          </button>
          <button
            onClick={() => window.location.href = '/debug'}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-medium transition-all"
          >
            Debug Console
          </button>
          <button
            onClick={() => window.location.href = '/gmail-activation'}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all"
          >
            ⚡ Activate Push
          </button>
          <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors relative">
            <Bell className="w-6 h-6 text-gray-300" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{session?.user?.name || 'User'}</p>
              <p className="text-xs text-gray-400">{session?.user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-3 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card bg-gradient-to-br from-purple-900/20 to-blue-900/20">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Due This Month</h3>
          <p className="text-3xl font-bold text-white">₹ 12,450</p>
        </div>
        <div className="glass-card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Pending Bills</h3>
          <p className="text-3xl font-bold text-yellow-400">3</p>
        </div>
        <div className="glass-card">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Next Due</h3>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">Airtel Fiber</span>
            <span className="text-sm text-red-400">(2 days)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Connections */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Active Connections</h2>
            <button onClick={fetchMasters} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <RefreshCw className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MasterForm onSuccess={fetchMasters} />

            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="glass-card animate-pulse h-[200px]"></div>
              ))
            ) : (
              masters.map((master) => (
                <div key={master._id} className="glass-card relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">Edit</button>
                  </div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      {getIcon(master.category)}
                    </div>
                    {master.dueDateDay && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Due: {master.dueDateDay}th
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{master.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{master.provider}</p>

                  <div className="flex gap-2 mt-auto">
                    <span className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/5">
                      {master.category}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity / Upcoming */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
          <div className="glass-card p-0 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-medium text-white">This Month</h3>
            </div>
            <div className="divide-y divide-white/5">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Electricity Bill Paid</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                  <span className="text-sm font-bold text-white">₹ 1,200</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
