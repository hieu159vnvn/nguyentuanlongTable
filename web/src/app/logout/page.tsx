"use client";
import { useEffect } from 'react';
import { logout } from '@/lib/auth';

export default function LogoutPage() {
  useEffect(() => {
    logout();
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="text-gray-600">Đang đăng xuất...</div>
    </div>
  );
}





