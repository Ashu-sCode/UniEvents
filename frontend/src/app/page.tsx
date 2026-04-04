import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  QrCode,
  Shield,
  Ticket,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui';

const projectStats = [
  { value: '3', label: 'core user journeys', description: 'Browse, register, and verify events in one flow' },
  { value: 'QR', label: 'ticket verification', description: 'Fast check-in with duplicate-entry protection' },
  { value: 'PWA', label: 'installable experience', description: 'Works like an app for repeated campus use' },
  { value: 'Live', label: 'role-based dashboards', description: 'Different tools for students and organizers' },
];

const studentBenefits = [
  'Find public and departmental events in one place.',
  'Register instantly and keep digital tickets ready on your phone.',
  'Track waitlist movement, attendance, and certificates from your dashboard.',
];

const organizerBenefits = [
  'Create events with seat limits, waitlists, banners, and status control.',
  'Scan QR tickets at entry and maintain attendance records automatically.',
  'Review analytics, registrations, and certificate readiness without manual spreadsheets.',
];

const workflowSteps = [
  {
    title: 'Create or discover',
    description: 'Organizers publish events with date, venue, seat limits, and stream targeting. Students browse upcoming opportunities clearly.',
  },
  {
    title: 'Register and manage seats',
    description: 'Students register or join the waitlist. The system keeps confirmed seats, waitlists, and updates in sync automatically.',
  },
  {
    title: 'Verify and close the loop',
    description: 'Organizers scan tickets, attendance is recorded, and eligible participants can receive certificates after completion.',
  },
];

const features = [
  {
    icon: <Calendar className="h-6 w-6" aria-hidden="true" />,
    title: 'Structured Event Control',
    description: 'Event creation includes timing, venue, department targeting, seat limits, waitlists, and status updates.',
  },
  {
    icon: <Ticket className="h-6 w-6" aria-hidden="true" />,
    title: 'Digital Ticketing',
    description: 'Registrations create trackable tickets with clear status for confirmed, used, cancelled, and waitlisted entries.',
  },
  {
    icon: <QrCode className="h-6 w-6" aria-hidden="true" />,
    title: 'Fast Entry Verification',
    description: 'Organizers can validate tickets quickly at the event gate and attendance is captured as part of the same workflow.',
  },
  {
    icon: <Shield className="h-6 w-6" aria-hidden="true" />,
    title: 'Role-Aware Experience',
    description: 'Students and organizers see different dashboards, actions, notifications, and operational tools.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_38%,#f8fafc_100%)] text-neutral-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-xl focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/90 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Primary">
          <div className="flex items-center gap-2.5">
            <Ticket className="h-7 w-7 text-neutral-800" aria-hidden="true" />
            <span className="text-xl font-semibold tracking-tight">UniEvent</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900"
            >
              Login
            </Link>
            <Link href="/signup" aria-label="Create a new UniEvent account">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr,0.95fr] lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-800">
              University event management with tickets, waitlists, analytics, and certificates
            </span>
            <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight text-neutral-950 sm:text-6xl lg:text-7xl">
              One campus platform for students, organizers, and event operations.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-700 sm:text-xl">
              UniEvent helps students discover and attend events while giving organizers the tools to manage seats,
              registrations, verification, attendance, notifications, and certificates from a single workflow.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?role=student" aria-label="Sign up as a student and start browsing events">
                <Button className="w-full px-8 py-3 text-base sm:w-auto">
                  Join as Student
                </Button>
              </Link>
              <Link href="/signup?role=organizer" aria-label="Sign up as an organizer to manage campus events">
                <Button variant="secondary" className="w-full px-8 py-3 text-base sm:w-auto">
                  Register as Organizer
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <AudienceCard
                title="For Students"
                description="Clear event discovery, fast registration, ticket access, waitlist tracking, and certificates in one place."
                items={studentBenefits}
              />
              <AudienceCard
                title="For Organizers"
                description="Create, publish, scan, monitor, and evaluate campus events without fragmented manual work."
                items={organizerBenefits}
              />
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-500">Why this project matters</p>
                  <h2 className="mt-2 text-2xl font-semibold text-neutral-950">Operational clarity for campus events</h2>
                </div>
                <div className="rounded-2xl bg-neutral-900 p-3 text-white">
                  <Users className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-neutral-600">
                Many university events rely on separate forms, manual attendance lists, and scattered follow-up.
                UniEvent connects discovery, registration, verification, and reporting into one product flow.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {projectStats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                    <p className="text-2xl font-semibold text-neutral-950">{item.value}</p>
                    <p className="mt-1 text-sm font-medium text-neutral-800">{item.label}</p>
                    <p className="mt-2 text-sm text-neutral-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-neutral-200 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
              <p className="text-sm font-medium text-slate-300">Sample workflow</p>
              <div className="mt-4 space-y-4">
                {workflowSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-200">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sky-200">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Built around the real journey from event announcement to certificate delivery
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-neutral-200 bg-white/90 p-6 shadow-sm sm:p-8">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">Core capabilities</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                Designed for the full event lifecycle, not just registration.
              </h2>
              <p className="mt-4 text-base leading-7 text-neutral-650">
                The platform supports the practical work around university events: publishing, seat management, waitlists,
                scanning, attendance, certificates, and role-specific visibility.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">Get started</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                Create an account and start with the role that matches your campus work.
              </h2>
              <p className="mt-4 text-base leading-7 text-neutral-700">
                Students can register and track outcomes. Organizers can manage event operations end to end.
              </p>
            </div>
            <Link href="/signup" aria-label="Open signup and create a UniEvent account">
              <Button className="px-7 py-3 text-base">
                Start With UniEvent
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="mt-12 border-t border-neutral-200 bg-neutral-950 py-10 text-neutral-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
          <p>© 2026 UniEvent. University Event Management System.</p>
          <p className="text-neutral-400">Built for event discovery, registration, verification, and certificate-ready reporting.</p>
        </div>
      </footer>
    </div>
  );
}

function AudienceCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-650">{description}</p>
      <ul className="mt-4 space-y-2" aria-label={`${title} benefits`}>
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-6 text-neutral-700">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-neutral-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-neutral-650">{description}</p>
    </article>
  );
}
