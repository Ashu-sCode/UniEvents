'use client';

import { useRouter } from 'next/navigation';
import { Ticket, ArrowLeft, LogOut, UserCircle } from 'lucide-react';
import ProfileForm from '@/components/ProfileForm';
import { useAuth } from '@/context/AuthContext';

export default function OrganizerProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard/organizer')}
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2.5">
                <Ticket className="h-7 w-7 text-neutral-700" />
                <span className="text-xl font-semibold text-neutral-900">UniEvent</span>
                <span className="text-sm bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-lg font-medium">
                  Organizer
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-600 hidden sm:inline">
                <strong className="text-neutral-900">{user?.name}</strong> • {user?.department}
              </span>

              <button
                onClick={() => router.push('/dashboard/organizer/profile')}
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700"
                aria-label="Profile"
                title="Profile"
              >
                <UserCircle className="h-5 w-5" />
              </button>

              <button
                onClick={logout}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ProfileForm />
      </main>
    </div>
  );
}
