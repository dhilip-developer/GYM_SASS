import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import axiosInstance from '../../api/axiosInstance';
import { formatDistanceToNow } from 'date-fns';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Bell,
  Cake,
  Send,
  IndianRupee
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    expiring_soon: 0,
    unpaid: 0,
    revenue_this_month: 0,
    revenue_trend: []
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [gymSettings, setGymSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, alertsRes, membersRes, birthdaysRes, settingsRes] = await Promise.all([
        axiosInstance.get('/api/memberships/stats'),
        axiosInstance.get('/api/messages/logs?limit=10'),
        axiosInstance.get('/api/members?limit=5'),
        axiosInstance.get('/api/members/birthdays/today'),
        axiosInstance.get('/api/settings')
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (alertsRes.data?.logs) setRecentAlerts(alertsRes.data.logs.slice(0, 10));
      if (membersRes.data?.members) setRecentMembers(membersRes.data.members.slice(0, 5));
      if (birthdaysRes.data?.birthdays) setBirthdays(birthdaysRes.data.birthdays);
      if (settingsRes.data) setGymSettings(settingsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusPill = (member: any) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const m = member.latest_membership;

    if (!m) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-100">Expired</span>;
    
    if (m.payment_status === 'pending') {
      return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">Unpaid</span>;
    }

    const endDate = new Date(m.end_date);
    endDate.setHours(0,0,0,0);

    if (endDate < today) {
      return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-100">Expired</span>;
    }

    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-100">1 day left</span>;
    }

    if (diffDays > 1 && diffDays <= 3) {
      return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-100">{diffDays} days left</span>;
    }

    return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-50 text-red-800 border border-red-100">Active</span>;
  };

  const getAlertColor = (trigger: string) => {
    switch (trigger) {
      case 'expired':
        return 'bg-rose-500 shadow-rose-500/20';
      case 'expiry_1day':
      case 'expiry_3day':
        return 'bg-amber-500 shadow-amber-500/20';
      default:
        return 'bg-blue-500 shadow-blue-500/20';
    }
  };

  const getAlertDescription = (log: any) => {
    const trigger = log.trigger_type;
    const name = log.members?.full_name || 'Member';
    const status = log.status === 'sent' ? 'SMS sent' : 'SMS failed';
    
    if (trigger === 'expiry_3day') return `Membership expires in 3 days — ${status}`;
    if (trigger === 'expiry_1day') return `Membership expires tomorrow — ${status}`;
    if (trigger === 'expired') return `Membership expired — ${status}`;
    return `Manual alert sent — ${status}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-96 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
          <div className="h-96 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Send Happy Birthday WhatsApp
  const sendBirthdayMessage = (member: any) => {
    const gymName = gymSettings?.gym_name || 'our gym';
    const msg = `🎂 Happy Birthday ${member.full_name}! Wishing you a wonderful day. Thank you for being part of ${gymName}! 🎉`;
    const mode = gymSettings?.whatsapp_mode || 'redirect';
    if (mode === 'server_session') {
      axiosInstance.post('/api/messages/send-manual', {
        member_id: member.id,
        trigger_type: 'expired', // reuse template slot
        send_mode: 'server_session',
        override_message: msg
      }).then(() => toast.success(`Birthday message sent to ${member.full_name} 🎉`))
        .catch(() => toast.error('Failed to send birthday message'));
    } else {
      let phone = member.phone.replace(/\D/g, '');
      if (phone.length === 10) phone = '91' + phone;
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 bg-[#f7f7f7] pt-6 pb-3 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-black/5 mb-4">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 font-medium mt-1">Here is a quick overview of your gym operations.</p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {/* Total Members */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Members</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-700">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">{stats.total}</div>
            <p className="text-xs text-slate-400 font-semibold mt-1">All registered members</p>
          </CardContent>
        </Card>

        {/* Active Members */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">{stats.active}</div>
            <p className="text-xs text-slate-400 font-semibold mt-1">Paid and valid memberships</p>
          </CardContent>
        </Card>

        {/* Expired Members */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expired</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">{stats.expired}</div>
            <p className="text-xs text-slate-400 font-semibold mt-1">Needs renewal alerts</p>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiring Soon</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">{stats.expiring_soon}</div>
            <p className="text-xs text-slate-400 font-semibold mt-1">Expires within 3 days</p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800">₹{(stats.revenue_this_month || 0).toLocaleString('en-IN')}</div>
            <p className="text-xs text-slate-400 font-semibold mt-1">Collected this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart Row */}
      {stats.revenue_trend && stats.revenue_trend.length > 0 && (
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-500" />
              Revenue Over Time
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-medium">Last 6 months revenue performance</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-8">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenue_trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000) + 'k' : value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🎂 Birthday Reminders */}
      {birthdays.length > 0 && (
        <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-pink-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-pink-500 flex items-center justify-center shadow-md shadow-pink-200">
                <Cake className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-800">🎂 Birthdays Today!</CardTitle>
                <CardDescription className="text-xs text-pink-600 font-semibold">{birthdays.length} member{birthdays.length > 1 ? 's' : ''} celebrating today — wish them!</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              {birthdays.map(m => (
                <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-pink-100 shadow-sm">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                    {m.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{m.full_name}</p>
                    <p className="text-xs text-slate-400 font-medium">{m.phone}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => sendBirthdayMessage(m)}
                    className="ml-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold px-3 py-1.5 h-auto shadow-sm"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 mr-1 fill-current"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.74.002-2.523-.979-4.9-2.766-6.67C16.89 2.417 14.542 1.42 12.013 1.42c-5.442 0-9.867 4.373-9.87 9.741a9.553 9.553 0 001.493 5.116l-.984 3.593 3.698-.958zm12.502-6.52c-.3-.15-1.782-.88-2.057-.98-.275-.1-.475-.15-.675.15-.2.3-.775.98-.95 1.18-.175.2-.35.225-.65.075-.3-.15-1.266-.467-2.41-1.485-.89-.795-1.49-1.777-1.665-2.078-.175-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.589-.491-.51-.675-.52-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8 3.75a2.723 2.723 0 00.575 1.625c.075.1 1.83 2.795 4.43 3.92.62.268 1.1.428 1.477.548.623.198 1.19.17 1.637.103.498-.074 1.782-.73 2.032-1.432.25-.7.25-1.3.175-1.433-.075-.133-.275-.213-.575-.363z"/></svg>
                    Wish
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid: Recent Alerts & Recent Members */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Recent Alerts */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Recent Alerts</CardTitle>
              <CardDescription className="text-xs text-slate-400 font-medium">Notification dispatches today</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-700 hover:text-red-800 font-bold text-xs"
              onClick={() => navigate('/messages')}
            >
              View all
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                <Bell className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-semibold">No recent alerts sent</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {recentAlerts.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className={`mt-1.5 flex h-2.5 w-2.5 shrink-0 rounded-full ${getAlertColor(log.trigger_type)} shadow`} />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-bold text-slate-800">{log.members?.full_name || 'Member'}</p>
                      <p className="text-xs text-slate-500 font-medium">{getAlertDescription(log)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        {(() => {
                          try {
                            const d = log.sent_at ? new Date(log.sent_at) : null;
                            if (!d || isNaN(d.getTime())) return 'Just now';
                            return formatDistanceToNow(d, { addSuffix: true });
                          } catch { return 'Just now'; }
                        })()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Recent Members */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Recent Members</CardTitle>
              <CardDescription className="text-xs text-slate-400 font-medium">Latest registration records</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-700 hover:text-red-800 font-bold text-xs"
              onClick={() => navigate('/members')}
            >
              View all
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-semibold">No members registered yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMembers.map((member) => (
                      <tr key={member.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <p className="text-sm font-bold text-slate-800">{member.full_name}</p>
                          <span className="text-xs text-slate-400 font-medium">{member.phone}</span>
                        </td>
                        <td className="p-4 text-sm font-semibold text-slate-600">
                          {member.latest_membership?.plans?.name || 'N/A'}
                        </td>
                        <td className="p-4 text-sm font-semibold text-slate-500">
                          {member.latest_membership ? member.latest_membership.end_date : 'N/A'}
                        </td>
                        <td className="p-4 text-right">
                          {getStatusPill(member)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
