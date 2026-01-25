import Link from 'next/link';
import { Calendar, Ticket, Users, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Ticket className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">UniEvent</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="btn-primary"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            University Event Management
            <span className="text-primary-600"> Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover events, get digital tickets, and earn certificates.
            UniEvent streamlines event management for students and organizers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup?role=student" className="btn-primary text-lg px-8 py-3">
              Join as Student
            </Link>
            <Link href="/signup?role=organizer" className="btn-secondary text-lg px-8 py-3">
              Register as Organizer
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Calendar className="h-8 w-8" />}
            title="Event Management"
            description="Create and manage events with seat limits, schedules, and venue details."
          />
          <FeatureCard
            icon={<Ticket className="h-8 w-8" />}
            title="Digital Tickets"
            description="Generate QR-coded tickets instantly. Download as PDF for offline use."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="Secure Entry"
            description="Scan QR codes for instant verification. Prevent duplicate entries."
          />
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="Certificates"
            description="Generate professional certificates for workshop attendees automatically."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>© 2024 UniEvent. University Event Management System.</p>
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
    <div className="card text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-100 text-primary-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
