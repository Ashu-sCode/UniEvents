'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { DashboardNavbar } from '@/components/DashboardNavbar';
import { PageLoader } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { useRequireAuthRole } from '@/hooks/useRequireAuthRole';
import { attendanceAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { OrganizerAnalyticsSummary, OrganizerEventSummary } from '@/types';

type DepartmentSummary = {
  department: string;
  events: number;
  registrations: number;
  attendance: number;
  certificates: number;
  attendanceRate: number;
};

type AccentTheme = {
  bar: string;
  solid: string;
  surface: string;
  border: string;
};

function percentToNumber(value: string): number {
  const parsed = Number.parseFloat(value.replace('%', ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 100)) : 0;
}

function clampWidth(value: number): string {
  return `${Math.max(value, 4)}%`;
}

function getAccentTheme(index: number): AccentTheme {
  const themes: AccentTheme[] = [
    {
      bar: 'from-sky-500 via-cyan-500 to-teal-500',
      solid: 'bg-sky-500',
      surface: 'from-sky-50 to-cyan-50',
      border: 'border-sky-200',
    },
    {
      bar: 'from-emerald-500 via-teal-500 to-cyan-500',
      solid: 'bg-emerald-500',
      surface: 'from-emerald-50 to-teal-50',
      border: 'border-emerald-200',
    },
    {
      bar: 'from-violet-500 via-fuchsia-500 to-pink-500',
      solid: 'bg-violet-500',
      surface: 'from-violet-50 to-fuchsia-50',
      border: 'border-violet-200',
    },
    {
      bar: 'from-amber-400 via-orange-400 to-rose-400',
      solid: 'bg-amber-500',
      surface: 'from-amber-50 to-orange-50',
      border: 'border-amber-200',
    },
  ];

  return themes[index % themes.length];
}

export default function OrganizerAnalyticsPage() {
  const { isReady } = useRequireAuthRole('organizer');
  const toast = useToast();
  const [summary, setSummary] = useState<OrganizerAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await attendanceAPI.getOrganizerSummary();
        setSummary(response.data.data.summary);
      } catch (error: unknown) {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [toast]);

  const rankedEvents = useMemo(() => {
    if (!summary) return [];
    return [...summary.eventSummaries]
      .sort((a, b) => percentToNumber(b.attendanceRate) - percentToNumber(a.attendanceRate))
      .slice(0, 6);
  }, [summary]);

  const volumeEvents = useMemo(() => {
    if (!summary) return [];
    return [...summary.eventSummaries]
      .sort((a, b) => b.registeredCount - a.registeredCount)
      .slice(0, 5);
  }, [summary]);

  const departmentSummaries = useMemo<DepartmentSummary[]>(() => {
    if (!summary) return [];

    const grouped = new Map<string, DepartmentSummary>();

    summary.eventSummaries.forEach((event) => {
      const existing = grouped.get(event.department) ?? {
        department: event.department,
        events: 0,
        registrations: 0,
        attendance: 0,
        certificates: 0,
        attendanceRate: 0,
      };

      existing.events += 1;
      existing.registrations += event.registeredCount;
      existing.attendance += event.attendedCount;
      existing.certificates += event.certificateIssuedCount;
      grouped.set(event.department, existing);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        attendanceRate: item.registrations > 0 ? (item.attendance / item.registrations) * 100 : 0,
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate);
  }, [summary]);

  const attendanceRate = percentToNumber(summary?.overallAttendanceRate ?? '0%');
  const certificateCoverage = percentToNumber(summary?.certificateCoverageRate ?? '0%');

  if (!isReady) {
    return <PageLoader title="Preparing analytics" />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,transparent_28%),radial-gradient(circle_at_top_right,#ede9fe_0%,transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <DashboardNavbar role="organizer" title="Analytics Workspace" subtitle="Cross-event performance and attendance insights" />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-slate-200 bg-slate-900 px-6 py-7 text-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-300">Overview</p>
                <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight">
                  {summary?.performanceSummary ?? 'Loading cross-event performance insights'}
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-300">
                  Use this page to compare event quality, attendance momentum, and certificate coverage without crowding the event management dashboard.
                </p>
              </div>
              <div className="grid min-w-[220px] grid-cols-2 gap-3">
                <SnapshotCard label="Events" value={summary?.totalEvents ?? 0} icon={<Calendar className="h-4 w-4" />} />
                <SnapshotCard label="Registrations" value={summary?.totalRegistrations ?? 0} icon={<Users className="h-4 w-4" />} />
                <SnapshotCard label="Attendance" value={summary?.totalAttendance ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} />
                <SnapshotCard label="No-Shows" value={summary?.totalNoShows ?? 0} icon={<XCircle className="h-4 w-4" />} />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Performance spotlight</p>
            <div className="mt-5 space-y-4">
              <SpotlightCard
                title="Top Performer"
                event={summary?.topPerformer ?? null}
                accent="bg-emerald-500"
                fallback="No standout event yet."
              />
              <SpotlightCard
                title="Needs Attention"
                event={summary?.needsAttention ?? null}
                accent="bg-amber-500"
                fallback="No low-performing event detected."
              />
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Coverage rings</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Attendance and certificates</h2>
              </div>
              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <RingStat
                label="Attendance Rate"
                value={summary?.overallAttendanceRate ?? '0%'}
                numericValue={attendanceRate}
                color="conic-gradient(#0f766e 0deg, #14b8a6 calc(var(--pct) * 1%), #ccfbf1 calc(var(--pct) * 1%), #e2e8f0 100%)"
                detail={`${summary?.totalAttendance ?? 0} attendees reached the venue`}
              />
              <RingStat
                label="Certificate Coverage"
                value={summary?.certificateCoverageRate ?? '0%'}
                numericValue={certificateCoverage}
                color="conic-gradient(#7c3aed 0deg, #8b5cf6 calc(var(--pct) * 1%), #ede9fe calc(var(--pct) * 1%), #e2e8f0 100%)"
                detail={`${summary?.certificatesIssued ?? 0} certificates already issued`}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Attendance leaderboard</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Best-performing events</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-6 space-y-4">
              {isLoading && <ChartSkeleton rows={4} />}
              {!isLoading && rankedEvents.length === 0 && (
                <EmptyPanel message="Analytics will appear here once attendance data is recorded." />
              )}
              {!isLoading &&
                rankedEvents.map((event, index) => (
                  <RateBarRow key={event.eventId} event={event} accent={getAccentTheme(index)} />
                ))}
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Volume chart</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Registration vs attendance</h2>
              </div>
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-6 space-y-5">
              {isLoading && <ChartSkeleton rows={3} />}
              {!isLoading && volumeEvents.length === 0 && (
                <EmptyPanel message="Create and run events to compare turnout volume here." />
              )}
              {!isLoading &&
                volumeEvents.map((event, index) => (
                  <VolumeRow
                    key={event.eventId}
                    event={event}
                    maxRegistrations={volumeEvents[0]?.registeredCount ?? 0}
                    accent={getAccentTheme(index + 1)}
                  />
                ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Quick breakdown</p>
            <div className="mt-4 grid gap-3">
              <QuickMetric
                title="Attendance gap"
                value={`${summary?.totalNoShows ?? 0}`}
                subtitle="Students registered but absent"
                tone="bg-amber-50 text-amber-700"
              />
              <QuickMetric
                title="Certificate output"
                value={`${summary?.certificatesIssued ?? 0}`}
                subtitle="Issued across certificate-enabled events"
                tone="bg-violet-50 text-violet-700"
              />
              <QuickMetric
                title="Average turnout"
                value={summary?.overallAttendanceRate ?? '0%'}
                subtitle="Cross-event attendance conversion"
                tone="bg-emerald-50 text-emerald-700"
              />
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Department lens</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Attendance by department</h2>
              </div>
              <Award className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-6 space-y-4">
              {isLoading && <ChartSkeleton rows={4} />}
              {!isLoading && departmentSummaries.length === 0 && (
                <EmptyPanel message="Department breakdown will appear after events start collecting attendance." />
              )}
              {!isLoading &&
                departmentSummaries.map((department, index) => (
                  <DepartmentRow
                    key={department.department}
                    summary={department}
                    accent={getAccentTheme(index)}
                    maxRegistrations={departmentSummaries[0]?.registrations ?? 0}
                  />
                ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Reading guide</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">What to watch next</h2>
              </div>
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InsightCard
                title="High turnout signal"
                value={rankedEvents[0]?.attendanceRate ?? '0%'}
                description="Use your strongest attendance rate as a benchmark for timing, event format, and promotion quality."
                tone="from-emerald-50 to-teal-50 border-emerald-200"
              />
              <InsightCard
                title="Biggest volume"
                value={volumeEvents[0] ? `${volumeEvents[0].registeredCount}` : '0'}
                description="The largest registration count shows your broadest reach. Compare it with turnout to judge conversion quality."
                tone="from-sky-50 to-cyan-50 border-sky-200"
              />
              <InsightCard
                title="Certificate leverage"
                value={summary?.certificateCoverageRate ?? '0%'}
                description="This reflects how consistently eligible attendees receive post-event certificates."
                tone="from-violet-50 to-fuchsia-50 border-violet-200"
              />
              <InsightCard
                title="No-show pressure"
                value={`${summary?.totalNoShows ?? 0}`}
                description="High no-shows may point to reminder gaps, scheduling conflicts, or weak seat commitment."
                tone="from-amber-50 to-orange-50 border-amber-200"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Event comparison board</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Every tracked event at a glance</h2>
            </div>
            {summary && <p className="text-sm text-slate-500">{summary.eventSummaries.length} events analyzed</p>}
          </div>

          <div className="mt-6 space-y-4">
            {isLoading && <ChartSkeleton rows={5} />}
            {!isLoading && (!summary || summary.eventSummaries.length === 0) && (
              <EmptyPanel message="No completed attendance records are available yet." />
            )}
            {!isLoading &&
              summary?.eventSummaries.map((event, index) => (
                <ComparisonCard key={event.eventId} event={event} accent={getAccentTheme(index)} />
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function SnapshotCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between text-slate-300">
        <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SpotlightCard({
  title,
  event,
  accent,
  fallback,
}: {
  title: string;
  event: OrganizerEventSummary | null;
  accent: string;
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${accent}`} />
        <p className="text-sm font-medium text-slate-600">{title}</p>
      </div>
      {event ? (
        <>
          <p className="mt-3 text-lg font-semibold text-slate-900">{event.title}</p>
          <p className="mt-1 text-sm text-slate-500">
            {event.department} â€¢ {event.eventType} â€¢ {formatDate(event.date)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{event.attendanceRate} attendance</Badge>
            <Badge>{event.attendedCount} attended</Badge>
            <Badge>{event.noShowCount} no-shows</Badge>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{fallback}</p>
      )}
    </div>
  );
}

function RingStat({
  label,
  value,
  numericValue,
  color,
  detail,
}: {
  label: string;
  value: string;
  numericValue: number;
  color: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-5 flex items-center gap-5">
        <div
          className="grid h-28 w-28 place-items-center rounded-full"
          style={
            {
              background: color,
              '--pct': numericValue,
            } as CSSProperties
          }
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center">
            <span className="text-lg font-semibold text-slate-900">{value}</span>
          </div>
        </div>
        <p className="max-w-[180px] text-sm text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function RateBarRow({ event, accent }: { event: OrganizerEventSummary; accent: AccentTheme }) {
  const rate = percentToNumber(event.attendanceRate);

  return (
    <div className={`rounded-2xl border p-4 transition hover:shadow-sm ${accent.border} bg-gradient-to-r ${accent.surface}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">{event.title}</p>
          <p className="text-sm text-slate-500">
            {event.department} â€¢ {event.registeredCount} registered â€¢ {event.attendedCount} attended
          </p>
        </div>
        <MetricTooltip
          label={event.attendanceRate}
          hint={`${event.attendedCount} of ${event.registeredCount} registered students attended this event.`}
        />
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80">
        <div className={`h-full rounded-full bg-gradient-to-r ${accent.bar}`} style={{ width: clampWidth(rate) }} />
      </div>
    </div>
  );
}

function VolumeRow({
  event,
  maxRegistrations,
  accent,
}: {
  event: OrganizerEventSummary;
  maxRegistrations: number;
  accent: AccentTheme;
}) {
  const registrationWidth = maxRegistrations > 0 ? (event.registeredCount / maxRegistrations) * 100 : 0;
  const attendanceWidth = maxRegistrations > 0 ? (event.attendedCount / maxRegistrations) * 100 : 0;

  return (
    <div className={`rounded-2xl border bg-gradient-to-r p-4 ${accent.border} ${accent.surface}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{event.title}</p>
          <p className="text-sm text-slate-500">{formatDate(event.date)}</p>
        </div>
        <Badge>{event.noShowCount} no-shows</Badge>
      </div>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Registrations</span>
            <MetricTooltip label={`${event.registeredCount}`} hint="Total students who reserved a seat for this event." />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/80">
            <div className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-900" style={{ width: clampWidth(registrationWidth) }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Attendance</span>
            <MetricTooltip label={`${event.attendedCount}`} hint="Students who were actually scanned in at the venue." />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/80">
            <div className={`h-full rounded-full bg-gradient-to-r ${accent.bar}`} style={{ width: clampWidth(attendanceWidth) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickMetric({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{value}</span>
      </div>
    </div>
  );
}

function DepartmentRow({
  summary,
  accent,
  maxRegistrations,
}: {
  summary: DepartmentSummary;
  accent: AccentTheme;
  maxRegistrations: number;
}) {
  const volumeWidth = maxRegistrations > 0 ? (summary.registrations / maxRegistrations) * 100 : 0;

  return (
    <div className={`rounded-2xl border bg-gradient-to-r p-4 ${accent.border} ${accent.surface}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">{summary.department}</p>
          <p className="text-sm text-slate-600">
            {summary.events} events â€¢ {summary.attendance} attendees â€¢ {summary.certificates} certificates
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{summary.attendanceRate.toFixed(1)}% turnout</Badge>
          <Badge>{summary.registrations} registrations</Badge>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
          <span>Department volume</span>
          <MetricTooltip
            label={`${summary.attendance}/${summary.registrations}`}
            hint="Attendance shown against total registrations for this department."
          />
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/80">
          <div className={`h-full rounded-full bg-gradient-to-r ${accent.bar}`} style={{ width: clampWidth(volumeWidth) }} />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${tone}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function ComparisonCard({ event, accent }: { event: OrganizerEventSummary; accent: AccentTheme }) {
  const rate = percentToNumber(event.attendanceRate);
  const noShowRate = event.registeredCount > 0 ? (event.noShowCount / event.registeredCount) * 100 : 0;

  return (
    <div className={`rounded-[24px] border bg-gradient-to-br p-5 ${accent.border} ${accent.surface}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-slate-900">{event.title}</p>
            <Badge>{event.status}</Badge>
            {event.enableCertificates && <Badge>Certificates</Badge>}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {event.department} â€¢ {event.eventType} â€¢ {formatDate(event.date)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatChip label="Registered" value={event.registeredCount} />
          <StatChip label="Attended" value={event.attendedCount} />
          <StatChip label="No-Shows" value={event.noShowCount} />
          <StatChip label="Certificates" value={event.certificateIssuedCount} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
            <span>Attendance efficiency</span>
            <MetricTooltip label={event.attendanceRate} hint="Attendance efficiency compares actual attendance with total registrations." />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/80">
            <div className={`h-full rounded-full bg-gradient-to-r ${accent.bar}`} style={{ width: clampWidth(rate) }} />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
            <span>No-show pressure</span>
            <MetricTooltip label={`${noShowRate.toFixed(1)}%`} hint="No-show pressure shows how much booked interest failed to convert into attendance." />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/80">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: clampWidth(noShowRate) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

function MetricTooltip({ label, hint }: { label: string; hint: string }) {
  return (
    <span
      className="inline-flex cursor-help items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-900"
      title={hint}
      aria-label={hint}
    >
      {label}
    </span>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function ChartSkeleton({ rows }: { rows: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 p-4">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-full rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

