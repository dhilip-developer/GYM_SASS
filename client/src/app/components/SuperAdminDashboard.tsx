import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { Dumbbell, Plus, Send, Building2, User, LogOut, Database, CheckCircle2 } from 'lucide-react';
import { useLocation } from 'react-router';
import { WhatsAppSession } from './WhatsAppSession';

export function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGym, setNewGym] = useState({
    name: '',
    owner_name: '',
    email: '',
    password: '',
    billing_date: ''
  });

  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    try {
      const response = await axiosInstance.get('/api/superadmin/gyms');
      setGyms(response.data);
    } catch (err) {
      console.error('Failed to fetch gyms', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/superadmin/gyms', newGym);
      setIsModalOpen(false);
      setNewGym({ name: '', owner_name: '', email: '', password: '', billing_date: '' });
      fetchGyms();
      alert('Gym and Owner created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create gym');
    }
  };

  const handleSendInvoice = async (gymId: string) => {
    try {
      await axiosInstance.post(`/api/superadmin/invoice/${gymId}`);
      alert('Invoice sent successfully via WhatsApp!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send invoice');
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await axiosInstance.get('/api/sheets/auth');
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initiate Google Auth');
    }
  };

  const handleForceSync = async () => {
    try {
      await axiosInstance.post('/api/sheets/force-sync');
      alert('Manual sync triggered successfully. Check your Google Drive!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to force sync');
    }
  };

  const isGoogleSynced = new URLSearchParams(location.search).get('google_sync') === 'success';

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">GymOS Super Admin</h1>
            <p className="text-xs text-white/50">Manage tenants and subscriptions</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Integrations Section */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Google Sheets Database Backup</h2>
              <p className="text-sm text-white/50">Automatically sync all tenant data to a Google Spreadsheet in real-time.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            {isGoogleSynced && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg text-sm font-semibold border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" /> Connected
              </div>
            )}
            <button
              onClick={handleForceSync}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Force Sync Now
            </button>
            <button
              onClick={handleConnectGoogle}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/30 transition-all"
            >
              Connect Google Account
            </button>
          </div>
        </div>

        {/* Super Admin Master WhatsApp Session */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Master WhatsApp Connection</h2>
            <p className="text-sm text-white/50 mt-1">Connect your master phone number to send subscription invoices directly to gym owners.</p>
          </div>
          <div className="bg-[#0f0f0f] rounded-xl p-4 border border-white/5">
            <WhatsAppSession isEmbedded={true} />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 mt-8">
          <h2 className="text-2xl font-bold">Registered Gyms</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold shadow-lg shadow-red-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Gym
          </button>
        </div>

        {/* Table */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/50 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Gym Name</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Billing Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {gyms.map(gym => (
                <tr key={gym.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-semibold">{gym.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-white/40" />
                      <div>
                        <p className="font-medium">{gym.owner_name}</p>
                        <p className="text-xs text-white/50">{gym.owner_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                      {gym.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    {gym.billing_date}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleSendInvoice(gym.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-emerald-900/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Invoice
                    </button>
                  </td>
                </tr>
              ))}
              {gyms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">
                    No gyms found. Click "Add New Gym" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Gym Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-bold">Add New Gym</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateGym} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Gym Name</label>
                <input
                  type="text"
                  required
                  value={newGym.name}
                  onChange={e => setNewGym({...newGym, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="e.g. FitPro Gym"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Owner Name</label>
                <input
                  type="text"
                  required
                  value={newGym.owner_name}
                  onChange={e => setNewGym({...newGym, owner_name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Owner Email (Login)</label>
                <input
                  type="email"
                  required
                  value={newGym.email}
                  onChange={e => setNewGym({...newGym, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="owner@gym.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={newGym.password}
                  onChange={e => setNewGym({...newGym, password: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Next Billing Date</label>
                <input
                  type="date"
                  required
                  value={newGym.billing_date}
                  onChange={e => setNewGym({...newGym, billing_date: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-red-900/30"
                >
                  Create Gym
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}