import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Settings as SettingsIcon, 
  Tag, 
  Edit2, 
  Check, 
  X, 
  Plus, 
  Loader2,
  Building
} from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  // Gym settings state
  const [gymSettings, setGymSettings] = useState({
    gym_name: '',
    owner_name: '',
    phone: '',
    whatsapp_number: '',
    email: '',
    address: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  // Inline editing state
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanPrice, setEditPlanPrice] = useState('');

  // Adding new plan state
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState('30'); // default 30 days
  const [newPlanPrice, setNewPlanPrice] = useState('');

  // Fetch settings & plans
  const fetchData = async () => {
    setIsLoadingSettings(true);
    setIsLoadingPlans(true);
    try {
      const [settingsRes, plansRes] = await Promise.all([
        axiosInstance.get('/api/settings'),
        axiosInstance.get('/api/settings/plans')
      ]);

      if (settingsRes.data && settingsRes.data.gym_name) {
        setGymSettings(settingsRes.data);
      }
      if (plansRes.data) {
        setPlans(plansRes.data);
      }
    } catch (error) {
      console.error('Error fetching settings & plans:', error);
      toast.error('Failed to load settings configuration');
    } finally {
      setIsLoadingSettings(false);
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Gym settings save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const response = await axiosInstance.post('/api/settings', gymSettings);
      toast.success('Gym settings saved successfully!');
      setGymSettings(response.data);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings changes');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Toggle plan active status
  const handleTogglePlanActive = async (plan: any) => {
    const updatedStatus = !plan.is_active;
    try {
      // Optimistic update
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: updatedStatus } : p));
      
      await axiosInstance.put(`/api/settings/plans/${plan.id}`, {
        is_active: updatedStatus
      });
      toast.success(`Plan ${plan.name} status updated`);
    } catch (error) {
      console.error('Error updating plan active status:', error);
      toast.error('Failed to toggle plan status');
      // Revert status
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !updatedStatus } : p));
    }
  };

  // Open inline editor
  const handleStartEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setEditPlanName(plan.name);
    setEditPlanPrice(plan.price.toString());
  };

  // Save inline edit
  const handleSavePlanEdit = async (id: string) => {
    if (!editPlanName.trim() || !editPlanPrice) {
      toast.error('Plan name and price are required');
      return;
    }

    try {
      const response = await axiosInstance.put(`/api/settings/plans/${id}`, {
        name: editPlanName,
        price: parseFloat(editPlanPrice)
      });
      toast.success('Plan updated successfully');
      setEditingPlanId(null);
      
      // Update plan list locally
      setPlans(prev => prev.map(p => p.id === id ? response.data : p));
    } catch (error) {
      console.error('Error updating plan details:', error);
      toast.error('Failed to save plan changes');
    }
  };

  // Create new plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim() || !newPlanPrice) {
      toast.error('Plan name and price are required');
      return;
    }

    try {
      const response = await axiosInstance.post('/api/settings/plans', {
        name: newPlanName,
        duration_days: parseInt(newPlanDuration),
        price: parseFloat(newPlanPrice)
      });

      toast.success(`Plan ${newPlanName} created successfully!`);
      
      // Reset new plan state
      setNewPlanName('');
      setNewPlanPrice('');
      setNewPlanDuration('30');
      setIsAddingPlan(false);
      
      // Refresh plans
      const plansRes = await axiosInstance.get('/api/settings/plans');
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Failed to add new membership plan');
    }
  };

  return (
    <div className="space-y-8 w-full">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Settings</h1>
        <p className="text-slate-500 font-medium mt-1">Configure gym information and customize subscription plans.</p>
      </div>

      {/* SECTION 1: Gym Settings */}
      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/20 p-6">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-5 h-5 text-red-500" />
            Gym Settings
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-semibold mt-1">
            Manage your basic business information.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 lg:p-8 xl:p-10">
          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin mr-2" />
              <span className="text-sm font-semibold">Loading settings...</span>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                {/* Gym Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="gym_name" className="text-slate-700 font-semibold text-xs">Gym Name *</Label>
                  <Input
                    id="gym_name"
                    value={gymSettings.gym_name}
                    onChange={(e) => setGymSettings(prev => ({ ...prev, gym_name: e.target.value }))}
                    placeholder="e.g. Raja Fitness"
                    required
                    className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Owner Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="owner_name" className="text-slate-700 font-semibold text-xs">Owner Name *</Label>
                  <Input
                    id="owner_name"
                    value={gymSettings.owner_name}
                    onChange={(e) => setGymSettings(prev => ({ ...prev, owner_name: e.target.value }))}
                    placeholder="Your full name"
                    required
                    className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-slate-700 font-semibold text-xs">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={gymSettings.phone}
                    onChange={(e) => setGymSettings(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="98XXX XXXXX (Used in templates)"
                    required
                    className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* WhatsApp Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp_number" className="text-slate-700 font-semibold text-xs">WhatsApp Number</Label>
                  <Input
                    id="whatsapp_number"
                    value={gymSettings.whatsapp_number}
                    onChange={(e) => setGymSettings(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                    placeholder="WhatsApp contact number"
                    className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 font-semibold text-xs">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={gymSettings.email}
                    onChange={(e) => setGymSettings(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="gym@email.com"
                    className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              {/* Address - spans full grid width */}
              <div className="space-y-1.5 sm:col-span-2 xl:col-span-3">
                <Label htmlFor="address" className="text-slate-700 font-semibold text-xs">Gym Address</Label>
                <Textarea
                  id="address"
                  value={gymSettings.address}
                  onChange={(e) => setGymSettings(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Optional address details"
                  rows={2}
                  className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 resize-none"
                />
              </div>
            </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  disabled={isSavingSettings}
                  className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-md shadow-red-500/10 font-bold text-xs py-5 px-6"
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: Membership Plans */}
      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/20 p-6">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Tag className="w-5 h-5 text-red-500" />
            Membership Plans
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-semibold mt-1">
            Configure subscription types, price options, and duration rules.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingPlans ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin mr-2" />
              <span className="text-sm font-semibold">Loading plans...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/50">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Name</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => {
                    const isEditing = editingPlanId === plan.id;
                    return (
                      <TableRow key={plan.id} className="border-b border-slate-5.0 last:border-0 hover:bg-slate-50/20 transition-colors">
                        <TableCell className="p-4">
                          {isEditing ? (
                            <Input
                              value={editPlanName}
                              onChange={(e) => setEditPlanName(e.target.value)}
                              className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 h-9 text-xs font-bold"
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-800">{plan.name}</span>
                          )}
                        </TableCell>
                        <TableCell className="p-4 text-sm font-semibold text-slate-500">
                          {plan.duration_days} days
                        </TableCell>
                        <TableCell className="p-4">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editPlanPrice}
                              onChange={(e) => setEditPlanPrice(e.target.value)}
                              className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 h-9 text-xs font-bold w-24"
                            />
                          ) : (
                            <span className="text-sm font-extrabold text-slate-700">₹{parseFloat(plan.price).toLocaleString()}</span>
                          )}
                        </TableCell>
                        <TableCell className="p-4">
                          <Switch
                            checked={plan.is_active}
                            onCheckedChange={() => handleTogglePlanActive(plan)}
                          />
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          {isEditing ? (
                            <div className="flex justify-end items-center gap-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Save changes"
                                onClick={() => handleSavePlanEdit(plan.id)}
                                className="text-red-700 hover:text-red-800 hover:bg-red-50 rounded-xl w-8 h-8"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Cancel edit"
                                onClick={() => setEditingPlanId(null)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl w-8 h-8"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Edit plan"
                              onClick={() => handleStartEditPlan(plan)}
                              className="text-slate-400 hover:text-red-700 rounded-xl w-8 h-8"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Inline adding row */}
                  {isAddingPlan && (
                    <TableRow className="bg-slate-50/50 border-t border-slate-100 border-dashed animate-in slide-in-from-bottom-2 duration-150">
                      <TableCell className="p-4">
                        <Input
                          value={newPlanName}
                          onChange={(e) => setNewPlanName(e.target.value)}
                          placeholder="e.g. Monthly"
                          className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 h-9 text-xs font-bold"
                        />
                      </TableCell>
                      <TableCell className="p-4">
                        <Select value={newPlanDuration} onValueChange={setNewPlanDuration}>
                          <SelectTrigger className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 h-9 text-xs font-semibold w-32 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">1 Month (30 days)</SelectItem>
                            <SelectItem value="90">3 Months (90 days)</SelectItem>
                            <SelectItem value="180">6 Months (180 days)</SelectItem>
                            <SelectItem value="365">1 Year (365 days)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-4">
                        <Input
                          type="number"
                          value={newPlanPrice}
                          onChange={(e) => setNewPlanPrice(e.target.value)}
                          placeholder="₹ Price"
                          className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 h-9 text-xs font-bold w-24"
                        />
                      </TableCell>
                      <TableCell className="p-4"></TableCell>
                      <TableCell className="p-4 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={handleCreatePlan}
                            className="bg-red-50 text-red-800 hover:bg-red-100 hover:text-red-800 border-none rounded-xl text-xs font-bold px-3 py-1"
                          >
                            Add
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setIsAddingPlan(false)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl w-8 h-8"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add Plan Toggle Button */}
          {!isAddingPlan && !isLoadingPlans && (
            <div className="p-4 bg-slate-50/30 border-t border-slate-50 flex justify-start">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingPlan(true)}
                className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add New Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
