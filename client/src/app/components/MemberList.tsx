import { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Search, Edit, Trash2, Mail, Loader2, X, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';

export function MemberList() {
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    expiring_soon: 0,
    unpaid: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    dob: '',
    gender: '',
    address: '',
    plan_id: '',
    start_date: '',
    payment_status: '',
    amount_paid: '',
    payment_mode: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounce(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 3000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      // Fetch members, plans, and stats in parallel
      const statusParam = statusFilter ? `status=${statusFilter}` : '';
      const searchParam = searchDebounce ? `&search=${searchDebounce}` : '';
      const pageParam = `&page=${page}&limit=${limit}`;

      const [membersRes, statsRes, plansRes] = await Promise.all([
        axiosInstance.get(`/api/members?${statusParam}${searchParam}${pageParam}`),
        axiosInstance.get('/api/memberships/stats'),
        axiosInstance.get('/api/settings/plans')
      ]);

      if (membersRes.data) {
        setMembers(membersRes.data.members || []);
        setTotal(membersRes.data.total || 0);
      }
      if (statsRes.data) {
        setStats(statsRes.data);
      }
      if (plansRes.data) {
        setPlans(plansRes.data.filter((p: any) => p.is_active));
      }
    } catch (error) {
      console.error('Error fetching members list:', error);
      toast.error('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, statusFilter, searchDebounce]);

  const handleDelete = async (member: any) => {
    const confirmDelete = window.confirm(`Delete ${member.full_name}? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      await axiosInstance.delete(`/api/members/${member.id}`);
      toast.success(`${member.full_name} deleted successfully`);
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Failed to delete member');
    }
  };

  const handleSendManualSMS = async (member: any) => {
    try {
      const response = await axiosInstance.post('/api/messages/send-manual', {
        member_id: member.id,
        trigger_type: 'expired'
      });
      toast.success(`Expiry alert SMS sent to ${member.full_name}`);
    } catch (error: any) {
      console.error('Error sending manual alert:', error);
      const msg = error.response?.data?.error || 'Failed to send alert SMS';
      toast.error(msg);
    }
  };

  const handleOpenEdit = (member: any) => {
    setSelectedMember(member);
    const m = member.latest_membership || {};
    setEditForm({
      full_name: member.full_name || '',
      phone: member.phone || '',
      email: member.email || '',
      dob: member.dob || '',
      gender: member.gender || '',
      address: member.address || '',
      plan_id: m.plan_id || '',
      start_date: m.start_date || '',
      payment_status: m.payment_status || '',
      amount_paid: m.amount_paid ? m.amount_paid.toString() : '',
      payment_mode: m.payment_mode || 'cash'
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    // Validate phone number
    const cleanPhone = editForm.phone.replace(/\s+/g, '').replace(/^\+91/, '');
    if (cleanPhone.length !== 10 || isNaN(Number(cleanPhone))) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }

    setIsSaving(true);
    try {
      await axiosInstance.put(`/api/members/${selectedMember.id}`, {
        ...editForm,
        phone: cleanPhone,
        amount_paid: editForm.payment_status === 'paid' ? parseFloat(editForm.amount_paid || '0') : 0
      });
      toast.success('Changes saved successfully');
      setIsEditOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error updating member:', error);
      const msg = error.response?.data?.error || 'Failed to update member details';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Avatar Initials with consistent color mapping
  const getAvatarInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-red-100 text-red-800',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-sky-100 text-sky-700',
      'bg-purple-100 text-purple-700'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-800 border border-red-100">Active</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-100">Expired</span>;
      case 'expiring':
        return <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100">Expiring soon</span>;
      case 'unpaid':
        return <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">Unpaid</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">Unknown</span>;
    }
  };

  const filterChips = [
    { label: 'All', value: '', count: stats.total },
    { label: 'Active', value: 'active', count: stats.active },
    { label: 'Expired', value: 'expired', count: stats.expired },
    { label: 'Expiring soon', value: 'expiring', count: stats.expiring_soon },
    { label: 'Unpaid', value: 'unpaid', count: stats.unpaid }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Member Directory</h1>
          <p className="text-slate-500 font-medium mt-1">View, search, and manage memberships profiles.</p>
        </div>
      </div>

      {/* Filter Chips row */}
      <div className="flex flex-wrap gap-2 pb-2">
        {filterChips.map(chip => (
          <button
            key={chip.label}
            onClick={() => {
              setStatusFilter(chip.value);
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 hover:scale-[1.01] border ${
              statusFilter === chip.value
                ? 'bg-gradient-to-r from-red-500 to-red-700 text-white border-transparent shadow-sm shadow-red-500/10'
                : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
            }`}
          >
            {chip.label} ({chip.count})
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <Input
              placeholder="Search members by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members List Table */}
      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Member</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3, 4].map(i => (
                    <TableRow key={i} className="animate-pulse border-b border-slate-50">
                      <TableCell colSpan={7} className="p-6">
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                            <div className="h-3 bg-slate-100 rounded w-1/6"></div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400 space-y-2">
                      <div className="flex flex-col items-center">
                        <Users className="w-12 h-12 text-slate-300 mb-2" />
                        <p className="text-sm font-semibold">No members found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filter or search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <TableCell className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarColor(member.full_name)}`}>
                          {getAvatarInitials(member.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{member.full_name}</p>
                          <span className="text-xs text-slate-400 font-semibold">{member.email || 'No email address'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-4 text-sm font-semibold text-slate-600">
                        {member.phone}
                      </TableCell>
                      <TableCell className="p-4 text-sm font-semibold text-slate-600">
                        {member.latest_membership?.plans?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 text-sm font-medium text-slate-500">
                        {member.latest_membership?.start_date || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 text-sm font-semibold text-slate-600">
                        {member.latest_membership?.end_date || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4">
                        {getStatusPill(member.computed_status)}
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit profile"
                            onClick={() => handleOpenEdit(member)}
                            className="text-slate-400 hover:text-red-700 rounded-xl"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Send Expiry SMS"
                            onClick={() => handleSendManualSMS(member)}
                            className="text-slate-400 hover:text-red-700 rounded-xl"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete member"
                            onClick={() => handleDelete(member)}
                            className="text-slate-400 hover:text-rose-600 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {total > limit && (
            <div className="flex items-center justify-between border-t border-slate-50 p-4 bg-slate-50/30">
              <span className="text-xs text-slate-400 font-semibold">
                Showing {Math.min(total, (page - 1) * limit + 1)}-{Math.min(total, page * limit)} of {total} members
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * limit >= total}
                  onClick={() => setPage(page + 1)}
                  className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Centered Edit Member Modal */}
      {isEditOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/30">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Member Details</h3>
                <p className="text-xs text-slate-400 font-medium">Update profile, plan types, and settings.</p>
              </div>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveEdit} className="overflow-y-auto p-6 space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full name */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-slate-700 font-semibold text-xs">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                    className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone" className="text-slate-700 font-semibold text-xs">Phone Number *</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    placeholder="98XXXXXXXX"
                    className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email" className="text-slate-700 font-semibold text-xs">Email Address</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* DOB */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-dob" className="text-slate-700 font-semibold text-xs">Date of Birth</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-gender" className="text-slate-700 font-semibold text-xs">Gender</Label>
                  <Select 
                    value={editForm.gender} 
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, gender: val }))}
                  >
                    <SelectTrigger id="edit-gender" className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-start" className="text-slate-700 font-semibold text-xs">Start Date *</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                    className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Plan Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-plan" className="text-slate-700 font-semibold text-xs">Membership Plan *</Label>
                  <Select 
                    value={editForm.plan_id} 
                    onValueChange={(val) => {
                      const selectedPlan = plans.find(p => p.id === val);
                      setEditForm(prev => ({ 
                        ...prev, 
                        plan_id: val,
                        amount_paid: selectedPlan ? selectedPlan.price.toString() : prev.amount_paid
                      }));
                    }}
                  >
                    <SelectTrigger id="edit-plan" className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — ₹{p.price} ({p.duration_days} days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-payment-status" className="text-slate-700 font-semibold text-xs">Payment Status *</Label>
                  <Select 
                    value={editForm.payment_status} 
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, payment_status: val }))}
                  >
                    <SelectTrigger id="edit-payment-status" className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Mode (only shown if status=paid) */}
                {editForm.payment_status === 'paid' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-payment-mode" className="text-slate-700 font-semibold text-xs">Payment Mode</Label>
                    <Select 
                      value={editForm.payment_mode} 
                      onValueChange={(val) => setEditForm(prev => ({ ...prev, payment_mode: val }))}
                    >
                      <SelectTrigger id="edit-payment-mode" className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Amount Paid (only shown if status=paid) */}
                {editForm.payment_status === 'paid' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-amount" className="text-slate-700 font-semibold text-xs">Amount Paid</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      value={editForm.amount_paid}
                      onChange={(e) => setEditForm(prev => ({ ...prev, amount_paid: e.target.value }))}
                      className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-address" className="text-slate-700 font-semibold text-xs">Address / Notes</Label>
                <Textarea
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-sm shadow-red-500/10 font-bold text-xs py-5 px-6"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
