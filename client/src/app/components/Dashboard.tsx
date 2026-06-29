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
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    expiring_soon: 0,
    unpaid: 0
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, alertsRes, membersRes] = await Promise.all([
        axiosInstance.get('/api/memberships/stats'),
        axiosInstance.get('/api/messages/logs?limit=10'),
        axiosInstance.get('/api/members?limit=5')
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }
      if (alertsRes.data && alertsRes.data.logs) {
        setRecentAlerts(alertsRes.data.logs.slice(0, 10));
      }
      if (membersRes.data && membersRes.data.members) {
        setRecentMembers(membersRes.data.members.slice(0, 5));
      }
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

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 bg-[#f7f7f7] pt-6 pb-3 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-black/5 mb-4">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 font-medium mt-1">Here is a quick overview of your gym operations.</p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

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
                        {formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })}
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
