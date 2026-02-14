"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, PlayCircle } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function HeroSection() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-mockup') || {
    id: 'hero-mockup',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    description: 'Team working together',
    imageHint: 'A group of diverse professionals working together on laptops in a modern office, representing collaboration and freelance talent.'
  };

  const benefits = [
    "World's largest freelance marketplace",
    "Any job you can possibly think of",
    "Save up to 90% & get quotes for free",
    "Pay only when you're 100% happy"
  ];

  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#4F46E5]/5 rounded-full blur-3xl" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] bg-[#9333ea]/5 rounded-full blur-3xl rotate-12" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[40%] bg-blue-100/30 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-[1440px] px-6 lg:px-[100px] py-16 lg:py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column: Content */}
          <div className="flex flex-col space-y-8 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 w-fit border border-blue-100">
              <span className="flex h-2 w-2 rounded-full bg-[#4F46E5]"></span>
              <span className="text-xs font-medium text-[#4F46E5] tracking-wide uppercase">Trusted by 60M+ Users</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#0F172A] leading-[1.1]">
              Hire the best <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] to-[#9333ea]">freelancers</span> <br />
              for any job.
            </h1>

            <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
              Millions of people use TrustLance to turn their ideas into reality. Find professionals you can trust.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-[#4F46E5] hover:bg-[#4338ca] text-white text-lg font-semibold px-8 py-7 h-auto rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-1"
              >
                <Link href="/post-project" className="flex items-center gap-2">
                  Hire a Freelancer
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-gray-200 text-gray-700 hover:border-[#4F46E5] hover:text-[#4F46E5] hover:bg-blue-50 text-lg font-semibold px-8 py-7 h-auto rounded-xl transition-all"
              >
                <Link href="/find-jobs" className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Earn Money
                </Link>
              </Button>
            </div>

            <div className="pt-8 border-t border-gray-100 grid grid-cols-2 gap-6">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-gray-900">4.9/5</span>
                <span className="text-sm text-gray-500">Clients rate professionals</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-gray-900">Award</span>
                <span className="text-sm text-gray-500">Winner of G2 2024</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual */}
          <div className="relative hidden lg:block">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-[#4F46E5]/10 to-[#9333ea]/10 rounded-full blur-3xl -z-10" />

            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white transform hover:scale-[1.01] transition-transform duration-700">
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

              {/* Floating Badge 1 (New Design) */}
              <div className="absolute top-10 -left-6 bg-white p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-1000">
                <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 border border-green-100">
                  <Check className="h-6 w-6 stroke-[3px]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Success</p>
                  <p className="text-base font-bold text-gray-900">Project Completed</p>
                </div>
              </div>

              {/* Floating Badge 2 (New Design) */}
              <div className="absolute bottom-10 -right-6 bg-white p-5 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 max-w-xs animate-in fade-in slide-in-from-right-4 duration-1000 delay-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-900">Talent Quality</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-9 w-9 rounded-full border-2 border-white bg-gray-200" />
                    ))}
                    <div className="h-9 w-9 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">+2k</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
