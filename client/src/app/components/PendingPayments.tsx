import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  CreditCard, 
  XCircle, 
  IndianRupee, 
  Zap, 
  Mail, 
  Check, 
  Loader2, 
  X,
  AlertCircle,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export function PendingPayments() {
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    expired: 0,
    unpaid: 0,
    revenueAtRisk: 0,
    revenueThisMonth: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Mark Paid Modal State
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<any>(null);
  const [selectedMemberName, setSelectedMemberName] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [gymSettings, setGymSettings] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const fetchUnpaidData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, statsRes, settingsRes, templatesRes, plansRes] = await Promise.all([
        axiosInstance.get('/api/members'),
        axiosInstance.get('/api/memberships/stats'),
        axiosInstance.get('/api/settings'),
        axiosInstance.get('/api/messages/templates'),
        axiosInstance.get('/api/plans')
      ]);

      let allMembers = membersRes.data?.members || [];
      // Filter members who are either 'expired' or 'unpaid'
      let unpaidExpiredMembers = allMembers.filter((m: any) => 
        m.computed_status === 'expired' || m.computed_status === 'unpaid'
      );
      setMembers(unpaidExpiredMembers);

      // Calculate revenue at risk: sum of plans prices for expired/unpaid
      let riskSum = 0;
      unpaidExpiredMembers.forEach((m: any) => {
        const price = parseFloat(m.latest_membership?.plans?.price || '0');
        riskSum += price;
      });

      setStats({
        expired: statsRes.data?.expired || 0,
        unpaid: statsRes.data?.unpaid || 0,
        revenueAtRisk: riskSum,
        revenueThisMonth: statsRes.data?.revenue_this_month || 0
      });

      if (settingsRes.data) {
        setGymSettings(settingsRes.data);
      }
      if (templatesRes.data) {
        setTemplates(templatesRes.data);
      }
      if (plansRes.data?.plans) {
        setPlans(plansRes.data.plans.filter((p: any) => p.is_active !== false));
      }

    } catch (error) {
      console.error('Error fetching unpaid payments details:', error);
      toast.error('Failed to load pending payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnpaidData();
  }, []);

  const handleOpenMarkPaid = (member: any) => {
    const m = member.latest_membership;
    if (!m) {
      toast.error('No membership record exists for this member.');
      return;
    }
    setSelectedMembership(m);
    setSelectedMemberName(member.full_name);
    const defaultPlanId = m.plan_id || m.plans?.id || '';
    setSelectedPlanId(defaultPlanId);
    setAmountPaid(m.plans?.price ? m.plans.price.toString() : '');
    setPaymentMode('cash');
    setIsMarkPaidOpen(true);
  };

  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMembership) return;

    setIsSubmittingPayment(true);
    try {
      await axiosInstance.put(`/api/memberships/${selectedMembership.id}/mark-paid`, {
        amount_paid: parseFloat(amountPaid),
        payment_mode: paymentMode
      });

      toast.success('Payment recorded. Membership extended successfully.');
      setIsMarkPaidOpen(false);
      fetchUnpaidData();

      // Send Receipt via WhatsApp
      const gymName = gymSettings?.gym_name || 'our gym';
      const msg = `✅ Payment Receipt from ${gymName}\n\nHi ${selectedMemberName}, we have received your payment of ₹${amountPaid} via ${paymentMode.toUpperCase()}. Thank you!`;
      
      if (gymSettings?.whatsapp_mode === 'server_session') {
        axiosInstance.post('/api/messages/send-manual', {
          member_id: selectedMembership.member_id,
          trigger_type: 'expired',
          send_mode: 'server_session',
          override_message: msg,
          generate_receipt_pdf: true,
          receipt_details: {
            amount: amountPaid,
            method: paymentMode
          }
        }).catch(e => console.log('Silent fail sending receipt'));
      } else {
        // Find member phone from full list
        const m = members.find(x => x.id === selectedMembership.member_id);
        if (m && m.phone) {
          let phone = m.phone.replace(/\D/g, '');
          if (phone.length === 10) phone = '91' + phone;
          window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
        }
      }
    } catch (error) {
      console.error('Error marking paid:', error);
      toast.error('Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
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
    }
  };

  const handleBulkWhatsApp = async () => {
    if (members.length === 0) {
      toast.info('No overdue or unpaid members to alert.');
      return;
    }

    const confirmBulk = window.confirm(`Send WhatsApp reminders to all ${members.length} members?`);
    if (!confirmBulk) return;

    const toastId = toast.loading('Sending bulk reminder WhatsApp campaign...');
    try {
      const response = await axiosInstance.post('/api/messages/bulk-send', {
        trigger_type: 'expired'
      });
      
      const sent = response.data?.sent || 0;
      const failed = response.data?.failed || 0;
      
      toast.dismiss(toastId);
      toast.success(`${sent} messages sent successfully. ${failed} failed.`);
      fetchUnpaidData();
    } catch (error: any) {
      console.error('Error triggering bulk campaign:', error);
      toast.dismiss(toastId);
      const msg = error.response?.data?.error || 'Failed to execute bulk WhatsApp reminder campaign';
      toast.error(msg);
    }
  };


  const calculateOverdueDays = (endDateStr: string) => {
    if (!endDateStr) return 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(endDateStr);
    end.setHours(0,0,0,0);
    const diffTime = today.getTime() - end.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const renderOverdueDays = (member: any) => {
    if (member.computed_status === 'unpaid' && member.latest_membership?.status === 'active') {
      return <span className="text-slate-400 font-medium text-xs">Payment pending</span>;
    }
    const days = calculateOverdueDays(member.latest_membership?.end_date);
    if (days > 7) {
      return <span className="text-rose-600 font-bold text-sm">{days} days</span>;
    }
    if (days > 0) {
      return <span className="text-amber-500 font-bold text-sm">{days} days</span>;
    }
    return <span className="text-slate-400 font-medium text-xs">Due today</span>;
  };

  const getAvatarInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Payment Collection</h1>
          <p className="text-slate-500 font-medium mt-1">Review overdue invoices, collect payments, and track revenue.</p>
        </div>
      </div>

      {/* Stats Cards row */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total Collected */}
        <Card className="bg-gradient-to-br from-green-500 to-emerald-700 border-transparent shadow-md shadow-emerald-500/20 rounded-2xl text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-green-100 uppercase tracking-wider">Collected This Month</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">₹{stats.revenueThisMonth.toLocaleString('en-IN')}</div>
            <p className="text-xs text-green-100 font-medium mt-1">Total payments processed</p>
          </CardContent>
        </Card>

        {/* Expired Members */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expired Members</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">{stats.expired}</div>
            <p className="text-xs text-slate-400 font-semibold mt-1">Memberships requiring renewal</p>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Payment</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">{stats.unpaid}</div>
            <p className="text-xs text-slate-400 font-semibold mt-1">Active profiles with pending invoices</p>
          </CardContent>
        </Card>

        {/* Revenue at Risk */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue at Risk</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-700">
              <IndianRupee className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">₹{stats.revenueAtRisk.toLocaleString('en-IN')}</div>
            <p className="text-xs text-slate-400 font-semibold mt-1">Total pending and overdue value</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">Unpaid & Expired Members</CardTitle>
            <CardDescription className="text-xs text-slate-400 font-semibold">
              List of all members with pending fees or lapsed memberships.
            </CardDescription>
          </div>
          <Button
            onClick={handleBulkWhatsApp}
            className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-sm shadow-green-500/10 font-bold text-xs py-5"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Bulk WhatsApp All ({members.length})
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No unpaid or expired members</p>
              <p className="text-xs text-slate-400">Great! All memberships are up to date and fully paid.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/50">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Member</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expired On</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Days Overdue</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Due</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-slate-50 hover:bg-slate-50/20 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                          {getAvatarInitials(member.full_name)}
                        </div>
                        <span className="text-sm font-bold text-slate-800">{member.full_name}</span>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-600">{member.phone}</td>
                      <td className="p-4 text-sm font-medium text-slate-500">
                        {member.latest_membership?.end_date || 'N/A'}
                      </td>
                      <td className="p-4">{renderOverdueDays(member)}</td>
                      <td className="p-4 text-sm font-semibold text-slate-600">
                        {member.latest_membership?.plans?.name || 'N/A'}
                      </td>
                      <td className="p-4 text-sm font-extrabold text-slate-700">
                        ₹{parseFloat(member.latest_membership?.plans?.price || '0').toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleOpenMarkPaid(member)}
                            className="bg-red-50 text-red-800 hover:bg-red-100 hover:text-red-800 border-none rounded-xl text-xs font-bold px-3 py-1.5"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Mark Paid
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Mark Payment Received */}
      {isMarkPaidOpen && selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/20">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Mark Payment Received</h3>
                <p className="text-[10px] text-slate-400 font-medium">Record fee collection and renew membership dates.</p>
              </div>
              <button 
                onClick={() => setIsMarkPaidOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleMarkPaidSubmit} className="p-6 space-y-5">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Member Name</span>
                <span className="text-sm font-extrabold text-slate-800">{selectedMemberName}</span>
              </div>

              {/* Plan Selector */}
              {plans.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="pay-plan" className="text-slate-700 font-semibold text-xs">Plan</Label>
                  <select
                    id="pay-plan"
                    value={selectedPlanId}
                    onChange={(e) => {
                      const planId = e.target.value;
                      setSelectedPlanId(planId);
                      const plan = plans.find((p: any) => p.id === planId);
                      if (plan) setAmountPaid(plan.price.toString());
                    }}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">— Select Plan —</option>
                    {plans.map((plan: any) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — ₹{Number(plan.price).toLocaleString('en-IN')} ({plan.duration_days} days)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount" className="text-slate-700 font-semibold text-xs">Amount Received * <span className="text-slate-400 font-normal">(editable)</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <Input
                    id="pay-amount"
                    type="number"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 h-10 pl-7 font-bold text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Auto-filled from plan price. You can override for this customer.</p>
              </div>

              {/* Payment Mode */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Label className="text-slate-700 font-bold text-xs block mb-1">Payment Mode</Label>
                <div className="flex gap-4">
                  {['cash', 'upi', 'card'].map((mode) => (
                    <label key={mode} className="flex items-center gap-2 text-xs font-bold text-slate-600 capitalize cursor-pointer">
                      <input
                        type="radio"
                        name="pay_mode"
                        value={mode}
                        checked={paymentMode === mode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-4 h-4 text-red-700 border-slate-300 focus:ring-red-500"
                      />
                      {mode}
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMarkPaidOpen(false)}
                  className="rounded-xl border-slate-200 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-sm shadow-red-500/15 text-xs font-bold py-5 px-6"
                >
                  {isSubmittingPayment ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Confirm payment'
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
