import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { ClipboardList, CheckCircle2, User, Clock, AlertCircle } from 'lucide-react';

export function Attendance() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check-in form state
  const [entityType, setEntityType] = useState('member');
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [attRes, memRes, trainRes] = await Promise.all([
        axiosInstance.get('/api/attendance'),
        axiosInstance.get('/api/members'), // returns { members: [] }
        axiosInstance.get('/api/trainers')
      ]);
      setAttendance(attRes.data);
      setMembers(memRes.data.members || []);
      setTrainers(trainRes.data || []);
    } catch (err) {
      console.error('Failed to fetch attendance data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return alert('Please select a person');

    try {
      await axiosInstance.post('/api/attendance', {
        entity_type: entityType,
        entity_id: selectedId
      });
      setSelectedId('');
      fetchData();
      alert('Checked in successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to check in');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Attendance</h1>
          <p className="text-sm text-slate-500">Log entries for members and staff</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Check-in Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              New Check-In
            </h2>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Person Type</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setEntityType('member'); setSelectedId(''); }}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                      entityType === 'member' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Member
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEntityType('trainer'); setSelectedId(''); }}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                      entityType === 'trainer' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Staff/Trainer
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Person</label>
                <select
                  required
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                >
                  <option value="">Select...</option>
                  {entityType === 'member'
                    ? members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.phone}) - {m.computed_status}
                        </option>
                      ))
                    : trainers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.role})
                        </option>
                      ))
                  }
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Attendance Log */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-slate-400" />
                Today's Log
              </h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                {attendance.length} Entries
              </span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {attendance.map(log => {
                const isMember = log.entity_type === 'member';
                const person = isMember ? log.members : log.trainers;
                const name = person ? (isMember ? person.full_name : person.name) : 'Unknown';
                const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Check for expired member warning
                const warning = isMember && person?.computed_status === 'expired' 
                  ? 'Membership is expired!' : null;

                return (
                  <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        isMember ? 'bg-indigo-100 text-indigo-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{name}</h4>
                        <div className="flex items-center gap-2 text-xs font-medium mt-0.5">
                          <span className={`${isMember ? 'text-indigo-500' : 'text-red-500'} uppercase tracking-wider`}>
                            {log.entity_type}
                          </span>
                          {warning && (
                            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              <AlertCircle className="w-3 h-3" />
                              {warning}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {time}
                    </div>
                  </div>
                );
              })}
              {attendance.length === 0 && (
                <div className="py-12 text-center">
                  <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No one has checked in today.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}