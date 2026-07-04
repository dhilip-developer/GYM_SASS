import { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Search, Edit, Trash2, Mail, Loader2, X, Sparkles, Users, MessageSquare, ExternalLink, Phone } from 'lucide-react';
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
  const [modalTab, setModalTab] = useState<'edit'|'history'>('edit');
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

  const [gymSettings, setGymSettings] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);

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

      const [membersRes, statsRes, plansRes, settingsRes, templatesRes] = await Promise.all([
        axiosInstance.get(`/api/members?${statusParam}${searchParam}${pageParam}`),
        axiosInstance.get('/api/memberships/stats'),
        axiosInstance.get('/api/settings/plans'),
        axiosInstance.get('/api/settings'),
        axiosInstance.get('/api/messages/templates')
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
      if (settingsRes.data) {
        setGymSettings(settingsRes.data);
      }
      if (templatesRes.data) {
        setTemplates(templatesRes.data);
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

  // Helper to determine the template trigger type based on member's computed status
  const getTriggerType = (member: any) => {
    const status = member.computed_status;
    if (status === 'expired') {
      return 'expired';
    }
    if (status === 'expiring') {
      const endDateStr = member.latest_membership?.end_date;
      if (endDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDateStr);
        end.setHours(0, 0, 0, 0);
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          return 'expiry_1day';
        }
      }
      return 'expiry_3day';
    }
    return 'expired'; // fallback default
  };

  const handleSendMessage = async (member: any, method: 'sms' | 'whatsapp') => {
    const triggerType = getTriggerType(member);

    if (method === 'whatsapp') {
      const mode = gymSettings?.whatsapp_mode || 'redirect';
      if (mode === 'redirect') {
        const template = templates.find(t => t.trigger_type === triggerType);
        if (!template) {
          toast.error('Message template not found');
          return;
        }
        const expiryDate = member.latest_membership?.end_date || 'N/A';
        const gymName = gymSettings?.gym_name || 'FitPro Gym';
        const ownerPhone = gymSettings?.phone || '8122715213';

        const msgText = template.template_body
          .replace(/{Name}/g, member.full_name || '')
          .replace(/{ExpiryDate}/g, expiryDate)
          .replace(/{GymName}/g, gymName)
          .replace(/{OwnerPhone}/g, ownerPhone);

        let cleanPhone = member.phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) {
          cleanPhone = '91' + cleanPhone;
        }
        const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msgText)}`;
        window.open(waUrl, '_blank');
        toast.success('Redirecting to WhatsApp...');
      } else {
        const toastId = toast.loading('Sending via server WhatsApp...');
        try {
          await axiosInstance.post('/api/messages/send-manual', {
            member_id: member.id,
            trigger_type: triggerType,
            send_mode: 'server_session'
          });
          toast.dismiss(toastId);
          toast.success(`Reminder sent via WhatsApp server to ${member.full_name}`);
        } catch (error: any) {
          toast.dismiss(toastId);
          console.error('Error sending message:', error);
          const msg = error.response?.data?.error || 'Failed to dispatch reminder';
          toast.error(msg);
        }
      }
    } else {
      const toastId = toast.loading('Sending SMS...');
      try {
        await axiosInstance.post('/api/messages/send-manual', {
          member_id: member.id,
          trigger_type: triggerType,
          send_mode: 'sms'
        });
        toast.dismiss(toastId);
        toast.success(`SMS reminder sent to ${member.full_name}`);
      } catch (error: any) {
        toast.dismiss(toastId);
        console.error('Error sending message:', error);
        const msg = error.response?.data?.error || 'Failed to dispatch reminder';
        toast.error(msg);
      }
    }
  };

  // Follow-up status options
  const FOLLOWUP_OPTIONS = [
    { value: 'none',           label: 'No Follow-up',       color: 'bg-slate-100 text-slate-500' },
    { value: 'spoke',          label: 'Spoke ✓',            color: 'bg-green-100 text-green-700' },
    { value: 'didnt_pick',     label: "Didn't Pick 📵",     color: 'bg-rose-100 text-rose-700'   },
    { value: 'call_back',      label: 'Call Back Later ⏰', color: 'bg-amber-100 text-amber-700' },
    { value: 'not_interested', label: 'Not Interested ✗',  color: 'bg-gray-200 text-gray-600'   },
    { value: 'interested',     label: 'Interested 🔥',      color: 'bg-blue-100 text-blue-700'   },
    { value: 'rejoined',       label: 'Rejoined 🎉',        color: 'bg-purple-100 text-purple-700'},
  ];

  const getFollowupOption = (val: string) =>
    FOLLOWUP_OPTIONS.find(o => o.value === val) || FOLLOWUP_OPTIONS[0];

  const handleFollowupChange = async (member: any, newStatus: string) => {
    const prev_status = member.followup_status;
    setMembers(prev =>
      prev.map(m => m.id === member.id ? { ...m, followup_status: newStatus } : m)
    );
    try {
      await axiosInstance.patch(`/api/members/${member.id}/followup`, { followup_status: newStatus });
      toast.success(`Follow-up: ${getFollowupOption(newStatus).label}`);
    } catch (err: any) {
      toast.error('Failed to save follow-up status');
      setMembers(prev =>
        prev.map(m => m.id === member.id ? { ...m, followup_status: prev_status } : m)
      );
    }
  };

  const handleBulkWhatsApp = async () => {
    const targets = members.filter(m =>
      m.computed_status === 'expired' || m.computed_status === 'expiring'
    );
    if (targets.length === 0) {
      toast.info('No expired or expiring members to message.');
      return;
    }
    let sent = 0;
    const toastId = toast.loading(`Sending WhatsApp to ${targets.length} members...`);
    for (const member of targets) {
      try {
        await handleSendMessage(member, 'whatsapp');
        sent++;
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
    toast.dismiss(toastId);
    toast.success(`WhatsApp sent to ${sent} of ${targets.length} members!`);
  };

  const handleOpenEdit = (member: any) => {
    setSelectedMember(member);
    setModalTab('edit');
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
              placeholder="Search by name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk WhatsApp Banner */}
      {(statusFilter === 'expired' || statusFilter === 'expiring') && members.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3.5">
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-700">
              {members.length} {statusFilter === 'expired' ? 'expired' : 'expiring soon'} member{members.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-400 font-medium">Send a WhatsApp renewal reminder to all of them at once</p>
          </div>
          <Button
            onClick={handleBulkWhatsApp}
            className="bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold px-4 py-2 h-auto shadow-sm shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 mr-1.5 fill-current inline"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.74.002-2.523-.979-4.9-2.766-6.67C16.89 2.417 14.542 1.42 12.013 1.42c-5.442 0-9.867 4.373-9.87 9.741a9.553 9.553 0 001.493 5.116l-.984 3.593 3.698-.958zm12.502-6.52c-.3-.15-1.782-.88-2.057-.98-.275-.1-.475-.15-.675.15-.2.3-.775.98-.95 1.18-.175.2-.35.225-.65.075-.3-.15-1.266-.467-2.41-1.485-.89-.795-1.49-1.777-1.665-2.078-.175-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.589-.491-.51-.675-.52-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 3.75a2.723 2.723 0 00.575 1.625c.075.1 1.83 2.795 4.43 3.92.62.268 1.1.428 1.477.548.623.198 1.19.17 1.637.103.498-.074 1.782-.73 2.032-1.432.25-.7.25-1.3.175-1.433-.075-.133-.275-.213-.575-.363z"/></svg>
            Send WhatsApp to All ({members.length})
          </Button>
        </div>
      )}

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
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Follow-up</th>
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
                      {/* Follow-up Status Dropdown */}
                      <TableCell className="p-4">
                        <Select
                          value={member.followup_status || 'none'}
                          onValueChange={(val) => handleFollowupChange(member, val)}
                        >
                          <SelectTrigger className={`h-7 text-[11px] font-bold rounded-full border-0 px-2.5 w-auto min-w-[110px] focus:ring-0 shadow-none ${getFollowupOption(member.followup_status || 'none').color}`}>
                            <Phone className="w-3 h-3 mr-1 shrink-0" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FOLLOWUP_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${opt.color}`}>
                                  {opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                            title="Send SMS"
                            onClick={() => handleSendMessage(member, 'sms')}
                            className="text-slate-400 hover:text-red-700 rounded-xl"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={gymSettings?.whatsapp_mode === 'server_session' ? 'Send WhatsApp (Server Session)' : 'Send WhatsApp (Redirect Link)'}
                            onClick={() => handleSendMessage(member, 'whatsapp')}
                            className="text-slate-400 hover:text-green-600 rounded-xl"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.74.002-2.523-.979-4.9-2.766-6.67C16.89 2.417 14.542 1.42 12.013 1.42c-5.442 0-9.867 4.373-9.87 9.741a9.553 9.553 0 001.493 5.116l-.984 3.593 3.698-.958zm12.502-6.52c-.3-.15-1.782-.88-2.057-.98-.275-.1-.475-.15-.675.15-.2.3-.775.98-.95 1.18-.175.2-.35.225-.65.075-.3-.15-1.266-.467-2.41-1.485-.89-.795-1.49-1.777-1.665-2.078-.175-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.589-.491-.51-.675-.52-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 3.75a2.723 2.723 0 00.575 1.625c.075.1 1.83 2.795 4.43 3.92.62.268 1.1.428 1.477.548.623.198 1.19.17 1.637.103.498-.074 1.782-.73 2.032-1.432.25-.7.25-1.3.175-1.433-.075-.133-.275-.213-.575-.363z"/>
                            </svg>
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
                <h3 className="text-lg font-bold text-slate-800">{selectedMember.full_name}</h3>
                <p className="text-xs text-slate-400 font-medium">{selectedMember.phone}</p>
              </div>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-white px-6">
              <button
                onClick={() => setModalTab('edit')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                  modalTab === 'edit' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >✏️ Edit Profile</button>
              <button
                onClick={() => setModalTab('history')}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                  modalTab === 'history' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >📋 Renewal History</button>
            </div>

            {/* Modal Form Content - Edit Tab */}
            {modalTab === 'edit' && (
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
            )}

            {/* Renewal History Tab */}
            {modalTab === 'history' && (() => {
              const allMemberships = selectedMember.memberships || [];
              const sorted = [...allMemberships].sort((a: any, b: any) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
              const totalPaid = sorted.reduce((sum: number, m: any) => sum + (m.amount_paid || 0), 0);
              return (
                <div className="overflow-y-auto p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-700">All Memberships</p>
                      <p className="text-xs text-slate-400">{sorted.length} plan{sorted.length !== 1 ? 's' : ''} — Total paid: <span className="font-extrabold text-green-600">₹{totalPaid.toLocaleString()}</span></p>
                    </div>
                  </div>
                  {sorted.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <p className="text-sm font-semibold">No membership history found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sorted.map((m: any, i: number) => (
                        <div key={m.id} className={`rounded-xl border p-4 ${ i === 0 ? 'border-red-100 bg-red-50/30' : 'border-slate-100 bg-white'}` }>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{m.plans?.name || 'Plan'}</p>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">{m.start_date} → {m.end_date}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.status === 'active' ? 'bg-green-100 text-green-700' :
                                m.status === 'expired' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>{m.status}</span>
                              <p className="text-sm font-extrabold text-slate-800 mt-1">₹{(m.amount_paid || 0).toLocaleString()}</p>
                              <p className="text-[10px] text-slate-400">{m.payment_mode || 'cash'}</p>
                            </div>
                          </div>
                          {i === 0 && <span className="text-[10px] font-bold text-red-500 mt-1 block">Current / Latest</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
