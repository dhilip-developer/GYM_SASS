import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axiosInstance from '../../api/axiosInstance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { UserPlus, Search, Phone, Edit, Trash2, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const FOLLOWUP_OPTIONS = [
  { value: 'none',           label: 'New Lead',          color: 'bg-slate-100 text-slate-500' },
  { value: 'spoke',          label: 'Spoke ✓',           color: 'bg-green-100 text-green-700' },
  { value: 'didnt_pick',     label: "Didn't Pick 📵",    color: 'bg-rose-100 text-rose-700'   },
  { value: 'call_back',      label: 'Call Back Later ⏰', color: 'bg-amber-100 text-amber-700'},
  { value: 'not_interested', label: 'Not Interested ✗',  color: 'bg-gray-200 text-gray-600'  },
  { value: 'interested',     label: 'Interested 🔥',     color: 'bg-blue-100 text-blue-700'  }
];

export function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    interested_in: '',
    notes: '',
    followup_status: 'none'
  });

  const fetchLeads = async () => {
    try {
      const res = await axiosInstance.get('/api/leads');
      setLeads(res.data?.leads || []);
    } catch (e) {
      toast.error('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleOpenAdd = () => {
    setEditMode(false);
    setFormData({ name: '', phone: '', interested_in: '', notes: '', followup_status: 'none' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lead: any) => {
    setEditMode(true);
    setCurrentId(lead.id);
    setFormData({
      name: lead.name,
      phone: lead.phone,
      interested_in: lead.interested_in || '',
      notes: lead.notes || '',
      followup_status: lead.followup_status || 'none'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axiosInstance.patch(`/api/leads/${currentId}`, formData);
        toast.success('Lead updated successfully');
      } else {
        await axiosInstance.post('/api/leads', formData);
        toast.success('Lead added successfully');
      }
      setIsModalOpen(false);
      fetchLeads();
    } catch (e) {
      toast.error(editMode ? 'Failed to update lead' : 'Failed to add lead');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await axiosInstance.delete(`/api/leads/${id}`);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (e) {
      toast.error('Failed to delete lead');
    }
  };

  const handleFollowupChange = async (lead: any, val: string) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, followup_status: val } : l));
    try {
      await axiosInstance.patch(`/api/leads/${lead.id}`, { followup_status: val });
      toast.success('Follow-up status updated');
    } catch (e) {
      toast.error('Failed to update status');
      fetchLeads();
    }
  };

  const handleConvertToMember = (lead: any) => {
    // Navigate to register page and pass state
    navigate('/register', { state: { prefill: { full_name: lead.name, phone: lead.phone } } });
  };

  const filtered = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Leads & Enquiries</h1>
          <p className="text-slate-500 font-medium mt-1">Track visitors and follow up to convert them to members.</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl h-11 px-6 shadow-md shadow-slate-200">
          <Plus className="w-4 h-4 mr-2" /> Add New Lead
        </Button>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 pb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <Input
              placeholder="Search leads by name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-11 rounded-xl border-slate-200 focus:border-red-500 h-11"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Lead Details</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Interested In</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center p-8 text-slate-400">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center p-8 text-slate-400 font-medium">No leads found.</TableCell></TableRow>
              ) : (
                filtered.map(lead => (
                  <TableRow key={lead.id} className="border-b border-slate-50">
                    <TableCell className="p-4">
                      <p className="font-bold text-slate-800">{lead.name}</p>
                      <p className="text-xs text-slate-400 font-medium">{lead.phone}</p>
                    </TableCell>
                    <TableCell className="p-4 text-sm font-semibold text-slate-600">
                      {lead.interested_in || '-'}
                    </TableCell>
                    <TableCell className="p-4 text-xs font-medium text-slate-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="p-4">
                      <Select value={lead.followup_status || 'none'} onValueChange={v => handleFollowupChange(lead, v)}>
                        <SelectTrigger className={`h-8 text-xs font-bold rounded-xl border-0 px-3 w-[140px] focus:ring-0 ${FOLLOWUP_OPTIONS.find(o => o.value === (lead.followup_status || 'none'))?.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FOLLOWUP_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${opt.color}`}>{opt.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-4 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleConvertToMember(lead)} className="text-green-600 hover:text-green-700 hover:bg-green-50 font-bold text-xs h-8 px-3 rounded-lg mr-2">
                          Join
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(lead)} className="text-slate-400 hover:text-slate-700 h-8 w-8 rounded-lg"><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(lead.id)} className="text-slate-400 hover:text-rose-600 h-8 w-8 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">{editMode ? 'Edit Lead' : 'Add New Lead'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Name *</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Phone *</Label>
                <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Interested In</Label>
                <Input placeholder="e.g. Yearly Plan, Weight Loss" value={formData.interested_in} onChange={e => setFormData({...formData, interested_in: e.target.value})} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                <Textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 rounded-xl resize-none" />
              </div>
              <Button type="submit" className="w-full bg-slate-800 text-white rounded-xl h-11 font-bold">{editMode ? 'Save Changes' : 'Add Lead'}</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
