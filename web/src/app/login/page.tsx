"use client";
import { useState } from 'react';
import { loginWithEmailPassword, setTokenCookie } from '@/lib/auth';
import Image from 'next/image';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
      const res = await loginWithEmailPassword(base, identifier, password);
      
      setTokenCookie(res.jwt, remember ? 30 : 1);
      try { if (remember) localStorage.setItem('last-identifier', identifier); } catch {}
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/booking';
      window.location.href = redirect;
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-[#00203FFF]">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <Image src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500" alt="Your Company" className="mx-auto h-10 w-auto" />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-white">Sign in to your account</h2>
        </div>
    
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
            <label className="block text-sm/6 font-medium text-gray-100">Email address</label>
            <div className="mt-2">
                <input value={identifier} onChange={e=>setIdentifier(e.target.value)} required autoComplete="email" className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6" />
            </div>
            </div>
    
            <div>
            <div className="flex items-center justify-between">
                <label className="block text-sm/6 font-medium text-gray-100">Password</label>
            </div>
            <div className="mt-2">
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6" />
            </div>
            </div>
    
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-200">
                <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} /> Ghi nhớ tôi
              </label>
            </div>
            {error && <div className="text-red-300 text-sm">{error}</div>}
            <button disabled={loading} type="submit" className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">{loading ? 'Đang đăng nhập...' : 'Sign in'}</button>
        </form>
        </div>
    </div>
  
  );
}


