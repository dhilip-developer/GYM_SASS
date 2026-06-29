import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import axiosInstance from '../../api/axiosInstance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { UserPlus, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function MemberRegistration() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'Male',
    address: '',
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    payment_status: 'paid',
    payment_mode: 'cash',
    amount_paid: ''
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Fetch plans on load
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axiosInstance.get('/api/settings/plans');
        const activePlans = (response.data || []).filter((p: any) => p.is_active);
        setPlans(activePlans);
        if (activePlans.length > 0) {
          // Preselect first plan
          setForm(prev => ({
            ...prev,
            plan_id: activePlans[0].id,
            amount_paid: activePlans[0].price.toString()
          }));
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        toast.error('Failed to fetch membership plans');
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  // Calculate live expiry helper text
  const getCalculatedExpiry = () => {
    if (!form.plan_id || !form.start_date) return '';
    const plan = plans.find(p => p.id === form.plan_id);
    if (!plan) return '';

    const d = new Date(form.start_date);
    d.setDate(d.getDate() + plan.duration_days);
    
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handlePlanChange = (value: string) => {
    const plan = plans.find(p => p.id === value);
    setForm(prev => ({
      ...prev,
      plan_id: value,
      amount_paid: plan ? plan.price.toString() : ''
    }));
    validateField('plan_id', value);
  };

  // Inline Validation
  const validateField = (field: string, value: string) => {
    let err = '';
    if (field === 'full_name' && !value.trim()) {
      err = 'Full name is required';
    }
    if (field === 'phone') {
      const clean = value.replace(/\s+/g, '').replace(/^\+91/, '');
      if (!clean) {
        err = 'Phone number is required';
      } else if (clean.length !== 10 || isNaN(Number(clean))) {
        err = 'Enter a valid 10-digit phone number';
      }
    }
    if (field === 'plan_id' && !value) {
      err = 'Membership plan is required';
    }
    if (field === 'start_date' && !value) {
      err = 'Start date is required';
    }

    setErrors(prev => ({ ...prev, [field]: err }));
    return err;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, (form as any)[field]);
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const e1 = validateField('full_name', form.full_name);
    const e2 = validateField('phone', form.phone);
    const e3 = validateField('plan_id', form.plan_id);
    const e4 = validateField('start_date', form.start_date);

    setTouched({
      full_name: true,
      phone: true,
      plan_id: true,
      start_date: true
    });

    if (e1 || e2 || e3 || e4) {
      toast.error('Please fix form validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPhone = form.phone.replace(/\s+/g, '').replace(/^\+91/, '');
      
      await axiosInstance.post('/api/members', {
        ...form,
        phone: cleanPhone,
        amount_paid: form.payment_status === 'paid' ? parseFloat(form.amount_paid || '0') : 0
      });

      toast.success('Member registered successfully!');
      
      // Delay navigation slightly so they see the toast
      setTimeout(() => {
        navigate('/members');
      }, 1500);

    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response && error.response.status === 400) {
        const errMsg = error.response.data?.error || '';
        if (errMsg.toLowerCase().includes('phone')) {
          setErrors(prev => ({ ...prev, phone: 'This phone number is already registered' }));
          toast.error('Registration failed: Phone number is already registered.');
        } else {
          toast.error(errMsg);
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setForm({
      full_name: '',
      phone: '',
      email: '',
      dob: '',
      gender: 'Male',
      address: '',
      plan_id: plans.length > 0 ? plans[0].id : '',
      start_date: new Date().toISOString().split('T')[0],
      payment_status: 'paid',
      payment_mode: 'cash',
      amount_paid: plans.length > 0 ? plans[0].price.toString() : ''
    });
    setErrors({});
    setTouched({});
  };

  // Get max DOB date constraint (today)
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Member Registration</h1>
        <p className="text-slate-500 font-medium mt-1">Register a new profile and configure billing plans.</p>
      </div>

      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/20 p-6">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-red-500" />
            New Member Form
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-semibold mt-1">
            Complete the form below. Red asterisk (*) fields are mandatory.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 lg:p-8 xl:p-10">
          {isLoadingPlans ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-sm font-semibold">Loading membership plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <p className="text-sm font-semibold">No active membership plans found</p>
              <p className="text-xs text-slate-400 text-center">
                Please add plans inside the <Link to="/settings" className="text-red-700 hover:underline">Settings</Link> panel before registering members.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-slate-700 font-semibold text-xs">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    onBlur={() => handleBlur('full_name')}
                    placeholder="e.g. Arjun Kumar"
                    required
                    className={`rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500 ${
                      touched.full_name && errors.full_name ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''
                    }`}
                  />
                  {touched.full_name && errors.full_name && (
                    <p className="text-[11px] text-rose-600 font-semibold">{errors.full_name}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-slate-700 font-semibold text-xs">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    placeholder="98XXX XXXXX"
                    required
                    className={`rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500 ${
                      touched.phone && errors.phone ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''
                    }`}
                  />
                  {touched.phone && errors.phone && (
                    <p className="text-[11px] text-rose-600 font-semibold">{errors.phone}</p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 font-semibold text-xs">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="member@email.com"
                    className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <Label htmlFor="dob" className="text-slate-700 font-semibold text-xs">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    max={todayStr}
                    value={form.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                    className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Membership Plan */}
                <div className="space-y-1.5">
                  <Label htmlFor="plan_id" className="text-slate-700 font-semibold text-xs">Membership Plan *</Label>
                  <Select value={form.plan_id} onValueChange={handlePlanChange}>
                    <SelectTrigger id="plan_id" className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — ₹{p.price} ({p.duration_days} days)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.plan_id && form.start_date && (
                    <p className="text-[11px] text-red-700 font-bold mt-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Expiry will be: {getCalculatedExpiry()}
                    </p>
                  )}
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="start_date" className="text-slate-700 font-semibold text-xs">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    onBlur={() => handleBlur('start_date')}
                    required
                    className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-slate-700 font-semibold text-xs">Gender</Label>
                  <Select value={form.gender} onValueChange={(val) => handleChange('gender', val)}>
                    <SelectTrigger id="gender" className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="payment_status" className="text-slate-700 font-semibold text-xs">Payment Status *</Label>
                  <Select value={form.payment_status} onValueChange={(val) => handleChange('payment_status', val)}>
                    <SelectTrigger id="payment_status" className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Mode (Only visible if Paid) */}
              {form.payment_status === 'paid' && (
                <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-100 w-full">
                  <Label className="text-slate-700 font-bold text-xs">Payment Mode</Label>
                  <div className="flex flex-wrap gap-6">
                    {['cash', 'upi', 'card'].map((mode) => (
                      <label key={mode} className="flex items-center gap-2 text-sm font-semibold text-slate-600 capitalize cursor-pointer">
                        <input
                          type="radio"
                          name="payment_mode"
                          value={mode}
                          checked={form.payment_mode === mode}
                          onChange={(e) => handleChange('payment_mode', e.target.value)}
                          className="w-4 h-4 text-red-700 border-slate-300 focus:ring-red-500"
                        />
                        {mode}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="amount_paid" className="text-slate-700 font-semibold text-xs">Amount Paid</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    min="0"
                    value={form.amount_paid}
                    onChange={(e) => handleChange('amount_paid', e.target.value)}
                    placeholder="₹0"
                    className="rounded-xl h-11 border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Address / Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-slate-700 font-semibold text-xs">Address / Notes</Label>
                  <Textarea
                    id="address"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Optional address or extra notes"
                    rows={2}
                    className="rounded-xl border-slate-200 focus:border-red-500 focus:ring-red-500 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-xs py-5 px-6"
                >
                  Clear Form
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-md shadow-red-500/10 font-bold text-xs py-5 px-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register Member'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
