'use client';

import { DashboardNavbar } from '@/components/DashboardNavbar';
import ProfileForm from '@/components/ProfileForm';
import { PageLoader } from '@/components/ui';
import { useRequireAuthRole } from '@/hooks/useRequireAuthRole';

export default function StudentProfilePage() {
  const { isReady } = useRequireAuthRole('student');

  if (!isReady) {
    return <PageLoader title="Preparing profile" />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,transparent_28%),radial-gradient(circle_at_top_right,#e0f2fe_0%,transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_45%,#f8fafc_100%)]">
      <DashboardNavbar role="student" title="Profile & Account" subtitle="Manage student details, activity, and account settings" />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProfileForm />
      </main>
    </div>
  );
}
