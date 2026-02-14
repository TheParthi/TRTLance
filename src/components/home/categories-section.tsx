"use client";

import Link from "next/link";
import { ArrowRight, Code, PenTool, Smartphone, Monitor, Video, Mic, BarChart, Globe } from "lucide-react";

const categories = [
  { name: "Website Design", icon: Monitor, count: "12k+ jobs" },
  { name: "Graphic Design", icon: PenTool, count: "8k+ jobs" },
  { name: "Mobile Apps", icon: Smartphone, count: "5k+ jobs" },
  { name: "Software Dev", icon: Code, count: "15k+ jobs" },
  { name: "3D Artists", icon: Globe, count: "2k+ jobs" },
  { name: "Video Editing", icon: Video, count: "4k+ jobs" },
  { name: "Voice Over", icon: Mic, count: "1.5k+ jobs" },
  { name: "Marketing", icon: BarChart, count: "9k+ jobs" }
];

export default function CategoriesSection() {
  return (
    <section className="py-24 bg-white relative">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-[100px]">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Browse talent by category
            </h2>
            <p className="text-lg text-gray-600 max-w-xl">
              Get it done faster. Find the right talent for your project from our most popular categories.
            </p>
          </div>
          <Link href="/categories" className="px-6 py-3 rounded-full border border-gray-200 text-gray-700 font-medium hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors flex items-center gap-2 group">
            See all categories
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link
                key={index}
                href={`/categories/${category.name.toLowerCase().replace(/ /g, '-')}`}
                className="group relative bg-[#F8FAFC] rounded-2xl p-8 transition-all duration-300 hover:bg-[#4F46E5] hover:shadow-xl hover:-translate-y-1 overflow-hidden"
              >
                <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                  <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-gray-900 shadow-sm group-hover:bg-white/10 group-hover:text-white transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-white mb-2 transition-colors">
                      {category.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 group-hover:text-blue-100 transition-colors">
                        {category.count}
                      </span>
                      <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-white transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                    </div>
                  </div>
                </div>

                {/* Decorative circle */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-gray-100 rounded-full opacity-0 group-hover:opacity-10 transition-all duration-500 group-hover:scale-150" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
