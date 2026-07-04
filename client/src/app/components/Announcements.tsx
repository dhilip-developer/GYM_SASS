import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHeader, TableRow } from './ui/table';
import { Megaphone, Send, Clock, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Announcements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');

  const fetchData = async () => {
    try {
      const [annRes, memRes] = await Promise.all([
        axiosInstance.get('/api/announcements'),
        axiosInstance.get('/api/members')
      ]);
      setAnnouncements(annRes.data?.announcements || []);
      setMembers(memRes.data?.members || []);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTargetMembers = () => {
    if (audience === 'all') return members;
    if (audience === 'active') return members.filter(m => m.computed_status === 'active');
    if (audience === 'expired') return members.filter(m => m.computed_status === 'expired');
    return [];
  };

  const handleSend = async () => {
    const targets = getTargetMembers();
    if (targets.length === 0) {
      toast.info('No members in the selected audience.');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter an announcement message.');
      return;
    }

    if (!window.confirm(`Send announcement to ${targets.length} members via WhatsApp?`)) return;

    setIsSending(true);
    const toastId = toast.loading(`Sending to ${targets.length} members...`);
    
    let sentCount = 0;
    // Send one by one via manual trigger route
    for (const member of targets) {
      try {
        await axiosInstance.post('/api/messages/send-manual', {
          member_id: member.id,
          trigger_type: 'expired', // Reuse WhatsApp session
          send_mode: 'server_session',
          override_message: `📢 *GYM ANNOUNCEMENT*\n\n${message}`
        });
        sentCount++;
      } catch (e) {}
      // delay to avoid spam block
      await new Promise(r => setTimeout(r, 400));
    }

    // Save record to DB
    try {
      await axiosInstance.post('/api/announcements', {
        message,
        audience,
        sent_count: sentCount
      });
    } catch(e) {}

    toast.dismiss(toastId);
    toast.success(`Announcement sent to ${sentCount} members!`);
    setMessage('');
    setIsSending(false);
    fetchData();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gym Announcements</h1>
        <p className="text-slate-500 font-medium mt-1">Broadcast messages to your members via WhatsApp.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Composer */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-800">New Announcement</CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-400">Write your message below</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">Target Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members ({members.length})</SelectItem>
                  <SelectItem value="active">Active Only ({members.filter(m => m.computed_status === 'active').length})</SelectItem>
                  <SelectItem value="expired">Expired Only ({members.filter(m => m.computed_status === 'expired').length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1 block">Message</Label>
              <Textarea 
                rows={5} 
                placeholder="e.g. Gym will be closed tomorrow for maintenance..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="rounded-xl border-slate-200 resize-none focus:border-blue-500"
              />
            </div>
            <Button 
              onClick={handleSend} 
              disabled={isSending || !message.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-bold shadow-md shadow-blue-500/20"
            >
              {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Broadcast Now</>}
            </Button>
            <p className="text-[10px] text-center text-slate-400 font-medium">Messages are sent automatically via the saved WhatsApp session.</p>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Past Broadcasts</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : announcements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">No previous announcements.</div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {announcements.map(a => (
                  <div key={a.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-semibold text-slate-800 mb-2">{a.message}</p>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                      <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {new Date(a.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> {a.sent_count} sent ({a.audience})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
