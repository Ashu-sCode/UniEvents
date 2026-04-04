'use client';

import { DashboardNavbar } from '@/components/DashboardNavbar';
import ProfileForm from '@/components/ProfileForm';

export default function OrganizerProfilePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0%,transparent_24%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_45%,#f8fafc_100%)]">
      <DashboardNavbar role="organizer" title="Profile & Account" subtitle="Manage organizer details and account settings" />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProfileForm />
      </main>
    </div>
  );
}
