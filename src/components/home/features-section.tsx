"use client";

import { LucideIcon, Gem, Zap, Medal, ShieldCheck } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const FeatureCard = ({ icon: Icon, title, description, color, bgColor }: FeatureCardProps) => (
  <div className="group relative bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
    <div className={`mb-6 p-4 ${bgColor} w-fit rounded-2xl ${color} transition-colors relative z-10`}>
      <Icon className="h-8 w-8" />
    </div>

    <div className="relative z-10">
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed text-sm">{description}</p>
    </div>

    {/* Decorative hover gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${bgColor} rounded-full opacity-0 group-hover:opacity-20 transition-all duration-500 scale-0 group-hover:scale-150 blur-xl`} />
  </div>
);

export default function FeaturesSection() {
  const features = [
    {
      icon: Gem,
      title: "The best talent",
      description: "Discover reliable professionals from around the world, vetted for quality and skill.",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: Zap,
      title: "Fast bids",
      description: "Receive quotes from qualified freelancers within minutes of posting your project.",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      icon: Medal,
      title: "Quality work",
      description: "Get high-quality results with our satisfaction guarantee and escrow protection.",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: ShieldCheck,
      title: "Be in control",
      description: "Manage your project, track progress, and pay only when you are 100% satisfied.",
      color: "text-green-600",
      bgColor: "bg-green-50"
    }
  ];

  return (
    <section className="py-24 bg-[#F8FAFC] relative overflow-hidden">
      {/* Dot Pattern Background */}
      <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="mx-auto max-w-[1440px] px-6 lg:px-[100px] relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
            Make it real with <span className="text-[#4F46E5]">TrustLance</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A suite of tools and services designed to help you succeed, from start to finish.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              color={feature.color}
              bgColor={feature.bgColor}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
