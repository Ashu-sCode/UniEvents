import Link from 'next/link';
import { Calendar, Ticket, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2.5">
              <Ticket className="h-7 w-7 text-neutral-700" />
              <span className="text-xl font-semibold text-neutral-900">UniEvent</span>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-neutral-600 hover:text-neutral-900 px-4 py-2 text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link href="/signup">
                <Button>Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-neutral-900 mb-6 tracking-tight">
            University Events,
            <br />
            <span className="text-neutral-600">Simplified</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Discover events, get digital tickets, and earn certificates.
            A clean, simple platform for students and organizers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup?role=student">
              <Button className="text-base px-8 py-3 w-full sm:w-auto">
                Join as Student
              </Button>
            </Link>
            <Link href="/signup?role=organizer">
              <Button variant="secondary" className="text-base px-8 py-3 w-full sm:w-auto">
                Register as Organizer
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-semibold text-center text-neutral-900 mb-16 tracking-tight">
          Everything You Need
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Calendar className="h-7 w-7" />}
            title="Event Management"
            description="Create and manage events with seat limits, schedules, and venue details."
          />
          <FeatureCard
            icon={<Ticket className="h-7 w-7" />}
            title="Digital Tickets"
            description="Generate QR-coded tickets instantly. Download as PDF for offline use."
          />
          <FeatureCard
            icon={<Shield className="h-7 w-7" />}
            title="Secure Entry"
            description="Scan QR codes for instant verification. Prevent duplicate entries."
          />
          <FeatureCard
            icon={<Users className="h-7 w-7" />}
            title="Certificates"
            description="Generate professional certificates for workshop attendees automatically."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 py-10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">© 2026 UniEvent. University Event Management System.</p>
        </div>
      </footer>
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
    <div className="bg-white rounded-2xl border border-neutral-100 p-8 text-center transition-all hover:border-neutral-200">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 text-neutral-700 mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2.5">{title}</h3>
      <p className="text-neutral-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
