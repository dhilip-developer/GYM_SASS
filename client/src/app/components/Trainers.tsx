import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Users2, Plus, Phone, Building2 } from 'lucide-react';

export function Trainers() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ name: '', phone: '', branch_id: '', role: 'trainer' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [trainersRes, branchesRes] = await Promise.all([
        axiosInstance.get('/api/trainers'),
        axiosInstance.get('/api/branches')
      ]);
      setTrainers(trainersRes.data);
      setBranches(branchesRes.data);
    } catch (err) {
      console.error('Failed to fetch trainers data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/trainers', newTrainer);
      setIsModalOpen(false);
      setNewTrainer({ name: '', phone: '', branch_id: '', role: 'trainer' });
      fetchData();
      alert('Trainer/Staff added successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add trainer');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Trainers & Staff</h1>
          <p className="text-sm text-slate-500">View and manage your gym personnel</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainers.map(trainer => (
          <div key={trainer.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600 shrink-0 font-bold text-xl">
                {trainer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{trainer.name}</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider">
                  {trainer.role}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-50 text-sm">
              <div className="flex items-center text-slate-600">
                <Phone className="w-4 h-4 mr-2 text-slate-400" />
                {trainer.phone}
              </div>
              <div className="flex items-center text-slate-600">
                <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                {trainer.branches ? trainer.branches.name : 'Unassigned (All Branches)'}
              </div>
            </div>
          </div>
        ))}
        {trainers.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No trainers or staff added yet.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Add Staff Member</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateTrainer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newTrainer.name}
                  onChange={e => setNewTrainer({...newTrainer, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                  placeholder="e.g. Sarah Connor"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  required
                  value={newTrainer.phone}
                  onChange={e => setNewTrainer({...newTrainer, phone: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
                <select
                  value={newTrainer.role}
                  onChange={e => setNewTrainer({...newTrainer, role: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                >
                  <option value="trainer">Trainer</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assign to Branch</label>
                <select
                  value={newTrainer.branch_id}
                  onChange={e => setNewTrainer({...newTrainer, branch_id: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-red-600/20 transition-all"
                >
                  Save Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
