import { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../../api/axiosInstance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Loader2, MessageSquare, ShieldCheck, QrCode, PowerOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function WhatsAppSession({ isEmbedded }: { isEmbedded?: boolean }) {
  const [session, setSession] = useState<{
    status: string;
    qr: string | null;
    user: { number: string; name: string } | null;
    error: string | null;
  }>({
    status: 'disconnected',
    qr: null,
    user: null,
    error: null
  });

  const [isLoading, setIsLoading] = useState(false);

  // Poll connection status
  const fetchStatus = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:4000/api/whatsapp/status');
      setSession(res.data);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 3 seconds
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      await axios.post('http://127.0.0.1:4000/api/whatsapp/start');
      toast.success('Initializing WhatsApp client...');
      fetchStatus();
    } catch (err: any) {
      console.error('Error starting session:', err);
      toast.error('Failed to initialize WhatsApp connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSession = async () => {
    setIsLoading(true);
    try {
      await axios.post('http://127.0.0.1:4000/api/whatsapp/stop');
      toast.success('Session disconnected successfully');
      fetchStatus();
    } catch (err: any) {
      console.error('Error stopping session:', err);
      toast.error('Failed to disconnect WhatsApp session');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-green-500/10 text-green-500 border border-green-500/20">Connected</span>;
      case 'qr_ready':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20">Ready to Scan</span>;
      case 'connecting':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-500 border border-blue-500/20">Connecting...</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-slate-500/10 text-slate-500 border border-slate-500/20">Disconnected</span>;
    }
  };

  return (
    <div className={`space-y-8 w-full animate-in fade-in duration-200 ${isEmbedded ? '' : 'max-w-4xl mx-auto'}`}>
      {!isEmbedded && (
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">WhatsApp Session (Send via Session)</h1>
          <p className="text-slate-500 font-medium mt-1">Scan a QR code once to save your session. Messages will be sent silently from the server without opening your phone.</p>
        </div>
      )}

      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/20 p-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-500" />
              Session Setup
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-semibold mt-1">
              Link your WhatsApp number once via QR — session is saved on this computer for future sends.
            </CardDescription>
          </div>
          <div>
            {getStatusBadge(session.status)}
          </div>
        </CardHeader>

        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[350px]">
          {session.status === 'disconnected' && (
            <div className="text-center space-y-6 max-w-md">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center animate-in zoom-in-50 duration-300">
                <PowerOff className="w-8 h-8 text-slate-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800">WhatsApp Session Offline</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Headless sending is currently offline. Start the session to generate a login QR code.
                </p>
              </div>
              <Button
                onClick={handleStartSession}
                disabled={isLoading}
                className="bg-gradient-to-r from-red-500 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl shadow-md shadow-red-500/10 font-bold text-xs py-5 px-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start WhatsApp Session'
                )}
              </Button>
            </div>
          )}

          {session.status === 'connecting' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-800">Initializing Server Socket</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Setting up file-state authorization...</p>
              </div>
            </div>
          )}

          {session.status === 'qr_ready' && (
            <div className="text-center space-y-6 max-w-md">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  <QrCode className="w-5 h-5 text-red-500" />
                  Scan QR Code
                </h3>
                <p className="text-xs text-slate-400 font-semibold">Scan code to authenticate the connection</p>
              </div>

              {session.qr ? (
                <div className="p-4 bg-slate-550 rounded-2xl inline-block border border-slate-100 shadow-sm animate-in fade-in duration-300">
                  <img src={session.qr} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto select-none" />
                </div>
              ) : (
                <div className="w-64 h-64 mx-auto flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              )}

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                <h4 className="text-xs font-bold text-slate-700">Instructions:</h4>
                <ol className="list-decimal list-inside text-xs text-slate-500 font-medium space-y-1.5">
                  <li>Open WhatsApp on your phone.</li>
                  <li>Tap Menu or Settings and select <strong>Linked Devices</strong>.</li>
                  <li>Tap <strong>Link a Device</strong>.</li>
                  <li>Point your phone to this screen to capture the code.</li>
                </ol>
              </div>

              <Button
                variant="outline"
                onClick={handleStopSession}
                disabled={isLoading}
                className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs"
              >
                Remove Session
              </Button>
            </div>
          )}

          {session.status === 'connected' && (
            <div className="text-center space-y-6 max-w-md">
              {/* Session Saved Banner */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 animate-in zoom-in-50 duration-300">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-md shadow-green-200">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-green-700 font-extrabold text-base leading-tight">Session Saved ✓</p>
                    <p className="text-green-500 text-xs font-medium">Messages will send silently from this server</p>
                  </div>
                </div>
                {/* Phone Number Highlight */}
                <div className="bg-white rounded-xl border border-green-100 px-4 py-3 mt-2">
                  <p className="text-xs text-slate-400 font-semibold mb-0.5">Linked WhatsApp Number</p>
                  <p className="text-xl font-extrabold text-slate-800 tracking-wide">+{session.user?.number}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{session.user?.name || 'Owner'}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Session storage:</span>
                  <span className="text-slate-700 font-bold">Local (this computer)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Status:</span>
                  <span className="text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active — Ready to send
                  </span>
                </div>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="destructive"
                  onClick={handleStopSession}
                  disabled={isLoading}
                  className="rounded-xl hover:bg-red-700 text-white font-bold text-xs py-5 px-6 w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <PowerOff className="w-4 h-4 mr-2" />
                      Remove Session
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
