import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dumbbell, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, token } = useAuth();

  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post('/api/auth/login', { email, password });
      const { access_token, user } = response.data;
      login(access_token, user);
      toast.success('Signed in successfully!');
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.error || 'Invalid email or password. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f0f0f]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f0f] via-[#1a0000] to-[#0f0f0f]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-800/15 rounded-full blur-3xl" />
        
        <div className="relative z-10 text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-red-900/50">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tight">GymOS</h1>
            <p className="text-white/40 text-lg font-medium mt-2">Gym Owner Management</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-xs mx-auto">
            {['Members', 'Payments', 'Messages'].map((label) => (
              <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
                <span className="text-white/60 text-xs font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f7f7f7]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-2xl text-slate-900">GymOS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 font-medium mt-1">Sign in to your owner dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-bold text-xs uppercase tracking-wider">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@yourgym.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl border-slate-200 bg-white focus:border-red-500 focus:ring-red-500 text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 font-bold text-xs uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 bg-white focus:border-red-500 focus:ring-red-500 pr-11 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/25 font-bold text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>

            <p className="text-[11px] text-slate-400 text-center font-medium pt-2">
              Only authorized gym owners can access this system.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
