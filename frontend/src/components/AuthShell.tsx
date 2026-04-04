'use client';

import Link from 'next/link';
import { Ticket } from 'lucide-react';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  sideTitle: string;
  sideDescription: string;
  highlights: string[];
  footer?: React.ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  sideTitle,
  sideDescription,
  highlights,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_40%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.92fr,1.08fr]">
          <section className="rounded-[2rem] border border-neutral-200 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] p-8 text-white shadow-[0_20px_70px_rgba(15,23,42,0.18)] sm:p-10">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-xl text-white transition hover:text-slate-200">
              <Ticket className="h-8 w-8" aria-hidden="true" />
              <span className="text-2xl font-semibold tracking-tight">UniEvent</span>
            </Link>

            <div className="mt-10">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-200">{eyebrow}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{sideTitle}</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">{sideDescription}</p>
            </div>

            <div className="mt-10 space-y-3">
              {highlights.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-neutral-200 bg-white/95 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8 lg:p-10">
            <div className="max-w-lg">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">{eyebrow}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">{title}</h2>
              <p className="mt-4 text-base leading-7 text-neutral-700">{description}</p>
            </div>

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-6 text-sm text-neutral-600">{footer}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
