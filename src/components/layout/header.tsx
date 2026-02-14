"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronDown, Code, Palette, Smartphone, Globe, Briefcase, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/logo";

const skillsData = [
  { name: "Graphic Designers", icon: <Palette className="h-5 w-5" />, href: "#" },
  { name: "Website Designers", icon: <Globe className="h-5 w-5" />, href: "#" },
  { name: "Mobile App Developers", icon: <Smartphone className="h-5 w-5" />, href: "#" },
  { name: "Software Developers", icon: <Code className="h-5 w-5" />, href: "#" },
  { name: "3D Artists", icon: <PenTool className="h-5 w-5" />, href: "#" },
  { name: "Illustration", icon: <Briefcase className="h-5 w-5" />, href: "#" },
];

const locationsData = [
  "United States", "United Kingdom", "Canada", "India", "Australia",
  "Pakistan", "Bangladesh", "Indonesia", "Brazil", "China", "Turkey", "Philippines"
];

const categoriesData = {
  "Websites, IT & Software": [
    "Website Design", "Web Development", "Mobile Apps", "Software Development",
    "Game Development", "Database Administration", "DevOps & Cloud", "Cybersecurity"
  ],
  "Writing & Content": [
    "Content Writing", "Copywriting", "Technical Writing", "Creative Writing",
    "Proofreading", "Translation", "Ghostwriting", "Blog Writing"
  ],
  "Design, Media & Architecture": [
    "Graphic Design", "Logo Design", "UI/UX Design", "Video Editing",
    "Animation", "Architecture", "Interior Design", "3D Modeling"
  ],
  "Data Entry & Admin": [
    "Data Entry", "Virtual Assistant", "Web Research", "Lead Generation",
    "CRM Management", "Email Management", "Document Conversion", "Typing"
  ]
};

const findWorkNavigation = [
  {
    id: 'skill',
    title: 'By skill',
    description: 'Search for work that requires a particular skill.',
    icon: <Code className="h-5 w-5" />
  },
  {
    id: 'language',
    title: 'By language',
    description: 'Find projects that are in your language.',
    icon: <Globe className="h-5 w-5" />
  },
  {
    id: 'featured',
    title: 'Featured jobs',
    description: 'Explore our current list of excited top featured projects.',
    icon: <Briefcase className="h-5 w-5" />
  },
  {
    id: 'contests',
    title: 'Find contests',
    description: 'Unleash your talent and find freelancer contests to enter.',
    icon: <PenTool className="h-5 w-5" />
  }
];

const skillJobsData = [
  { title: 'Website jobs' },
  { title: 'Graphic design jobs' },
  { title: 'Data entry jobs' },
  { title: 'Mobile app development jobs' },
  { title: 'Internet marketing jobs' },
  { title: 'Local jobs' }
];

const languageJobsData = [
  'Jobs in English', 'Jobs in Spanish', 'Jobs in Portuguese',
  'Jobs in French', 'Jobs in German', 'Jobs in Hindi',
  'Jobs in Chinese', 'Jobs in Japanese'
];

const popularJobsData = [
  'Software development jobs', 'Internet marketing jobs', 'Data entry jobs',
  'SEO jobs', 'Writing jobs', 'Legal jobs', 'Finance jobs',
  'Manufacturing jobs', 'Logistics jobs'
];

const solutionsData = [
  { name: "Enterprise", description: "Solutions for large organizations", href: "#" },
  { name: "TrustLance API", description: "Integrate our marketplace", href: "#" },
  { name: "AI Development", description: "AI-powered solutions", href: "#" },
  { name: "Field Services", description: "On-site professional services", href: "#" },
];

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'hire' | 'work' | 'solutions';
}

const FindWorkMegaMenu: React.FC<{ activeSection: string; setActiveSection: (section: string) => void }> = ({ activeSection, setActiveSection }) => {
  const renderRightPanel = () => {
    switch (activeSection) {
      case 'skill':
        return (
          <div>
            <div className="grid grid-cols-2 gap-4">
              {skillJobsData.map((job, index) => (
                <Link key={index} href="#" className="flex items-center gap-3 p-3 rounded hover:bg-gray-50">
                  <div className="w-12 h-9 bg-gray-200 rounded flex-shrink-0"></div>
                  <span className="text-sm font-medium">{job.title}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      case 'language':
        return (
          <div>
            <h4 className="font-semibold mb-4">Find work in different languages</h4>
            <div className="space-y-2">
              {languageJobsData.map((lang, index) => (
                <Link key={index} href="#" className="block text-sm text-gray-600 hover:text-blue-600 py-1">
                  {lang}
                </Link>
              ))}
              <Link href="#" className="text-sm text-blue-600 hover:underline mt-2 block">
                View more →
              </Link>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>Select a category to view options</p>
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-4 gap-8 h-80">
      <div className="col-span-1 bg-gray-800 text-white p-6 rounded-l">
        <div className="space-y-1">
          {findWorkNavigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full text-left p-3 rounded transition-colors ${activeSection === item.id ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.title}</span>
                </div>
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
              </div>
              <p className="text-xs text-gray-300 mt-1 ml-8">{item.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-2 p-6">
        {renderRightPanel()}
      </div>

      <div className="col-span-1 p-6 border-l">
        <h4 className="font-semibold mb-4">Other popular jobs</h4>
        <div className="space-y-2">
          {popularJobsData.map((job, index) => (
            <Link key={index} href="#" className="block text-sm text-gray-600 hover:text-blue-600 py-1">
              {job}
            </Link>
          ))}
          <Link href="#" className="text-sm text-blue-600 hover:underline mt-2 block">
            View more →
          </Link>
        </div>
      </div>
    </div>
  );
};

const MegaMenu: React.FC<MegaMenuProps> = ({ isOpen, onClose, type }) => {
  const [activeWorkSection, setActiveWorkSection] = useState('skill');

  if (!isOpen) return null;

  // Common wrapper for all mega menus to ensure full width and centered content
  const MenuWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="fixed top-[70px] left-0 w-full bg-white/95 backdrop-blur-md border-b shadow-lg z-40 animate-in fade-in slide-in-from-top-2 duration-200"
      onMouseLeave={onClose}
    >
      <div className="mx-auto max-w-[1440px] px-10 py-8">
        {children}
      </div>
    </div>
  );

  if (type === 'hire') {
    return (
      <MenuWrapper>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
              By Skill
            </h3>
            <div className="space-y-3">
              {skillsData.map((skill) => (
                <Link key={skill.name} href={skill.href} className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="text-gray-500 group-hover:text-blue-600 transition-colors bg-gray-100 group-hover:bg-blue-50 p-2 rounded-md">
                    {skill.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{skill.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-green-500 rounded-full"></span>
              By Location
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {locationsData.map((location) => (
                <Link key={location} href="#" className="text-sm text-gray-600 hover:text-blue-600 py-1.5 transition-colors">
                  {location}
                </Link>
              ))}
            </div>
            <Link href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-4 inline-flex items-center gap-1">
              View all locations <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            </Link>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
              By Category
            </h3>
            <div className="max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
              <div className="space-y-6">
                {Object.entries(categoriesData).map(([category, skills]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-sm text-gray-900 mb-3 uppercase tracking-wider">{category}</h4>
                    <div className="space-y-2 border-l-2 border-gray-100 pl-4">
                      {skills.slice(0, 4).map((skill) => (
                        <Link key={skill} href="#" className="block text-sm text-gray-600 hover:text-blue-600 transition-colors">
                          {skill}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MenuWrapper>
    );
  }

  if (type === 'work') {
    return (
      <MenuWrapper>
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-3 bg-gray-50 p-6 rounded-xl">
            <div className="space-y-1">
              {findWorkNavigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveWorkSection(item.id)}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${activeWorkSection === item.id
                      ? 'bg-white shadow-md text-blue-600 ring-1 ring-black/5'
                      : 'text-gray-600 hover:bg-gray-200/50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{item.title}</span>
                    {activeWorkSection === item.id && <ChevronDown className="h-4 w-4 rotate-[-90deg]" />}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-6 p-2">
            {activeWorkSection === 'skill' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="font-bold text-gray-900 text-lg mb-6">Popular Skills</h3>
                <div className="grid grid-cols-2 gap-4">
                  {skillJobsData.map((job, index) => (
                    <Link key={index} href="#" className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Code className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{job.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {activeWorkSection === 'language' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="font-bold text-gray-900 text-lg mb-6">By Language</h3>
                <div className="grid grid-cols-2 gap-3">
                  {languageJobsData.map((lang, index) => (
                    <Link key={index} href="#" className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-sm text-gray-700 hover:text-blue-600 transition-colors">
                      <Globe className="h-4 w-4 text-gray-400" />
                      {lang}
                    </Link>
                  ))}
                </div>
                <Link href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-6 inline-flex items-center gap-1">
                  View all languages <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                </Link>
              </div>
            )}
            {/* Add other sections as needed */}
          </div>

          <div className="col-span-3 border-l border-gray-100 pl-8">
            <h4 className="font-bold text-gray-900 text-lg mb-6">Trending Now</h4>
            <div className="space-y-3">
              {popularJobsData.slice(0, 5).map((job, index) => (
                <Link key={index} href="#" className="block text-sm text-gray-600 hover:text-blue-600 hover:translate-x-1 transition-all py-1">
                  {job}
                </Link>
              ))}
            </div>
            <div className="mt-8 p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
              <p className="font-bold text-lg mb-1">New here?</p>
              <p className="text-blue-100 text-sm mb-3">Create a profile and start earning today.</p>
              <Button size="sm" variant="secondary" className="w-full text-blue-700 bg-white hover:bg-gray-100 border-0">
                Create Profile
              </Button>
            </div>
          </div>
        </div>
      </MenuWrapper>
    );
  }

  if (type === 'solutions') {
    return (
      <div
        className="fixed top-[70px] left-0 w-full bg-[#0F172A] text-white shadow-xl z-40 animate-in fade-in slide-in-from-top-2 duration-200 border-b border-gray-800"
        onMouseLeave={onClose}
      >
        <div className="mx-auto max-w-[1440px] px-10 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-2">Enterprise Solutions</h3>
                <p className="text-gray-400 mb-6 max-w-md">Scale your workforce with our enterprise-grade platform. Dedicated support, compliance, and security.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {solutionsData.map((solution) => (
                    <Link key={solution.name} href={solution.href} className="group block p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all">
                      <h4 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">{solution.name}</h4>
                      <p className="text-xs text-gray-400">{solution.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="font-bold text-gray-200 mb-4 uppercase tracking-wider text-sm">For Clients</h3>
                <ul className="space-y-3">
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">How to hire</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Project Management</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Talent Scout</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Payroll Services</Link></li>
                </ul>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="font-bold text-gray-200 mb-4 uppercase tracking-wider text-sm">Resources</h3>
                <ul className="space-y-3">
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Blog & News</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Success Stories</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Community</Link></li>
                  <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default function Header({ className }: { className?: string }) {
  const router = useRouter();
  const [activeMegaMenu, setActiveMegaMenu] = useState<'hire' | 'work' | 'solutions' | null>(null);

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur shadow-sm", className)}>
      <div className="flex h-[70px] items-center px-10 max-w-[1440px] mx-auto w-full">
        <div className="mr-8">
          <Link href="/">
            <Logo asLink={false} />
          </Link>
        </div>

        <nav className="flex items-center h-full space-x-1">
          <div
            className="relative h-full flex items-center"
            onMouseEnter={() => setActiveMegaMenu('hire')}
            onMouseLeave={() => setActiveMegaMenu(null)}
          >
            <Button variant="ghost" className="h-[70px] rounded-none px-4 text-gray-700 hover:text-blue-600 hover:bg-transparent font-medium">
              Hire Freelancers
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {activeMegaMenu === 'hire' && (
              <MegaMenu
                isOpen={true}
                onClose={() => setActiveMegaMenu(null)}
                type="hire"
              />
            )}
          </div>

          <div
            className="relative h-full flex items-center"
            onMouseEnter={() => setActiveMegaMenu('work')}
            onMouseLeave={() => setActiveMegaMenu(null)}
          >
            <Button
              variant="ghost"
              className="h-[70px] rounded-none px-4 text-gray-700 hover:text-blue-600 hover:bg-transparent font-medium"
              onClick={() => window.location.href = '/find-jobs'}
            >
              Find Work
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {activeMegaMenu === 'work' && (
              <MegaMenu
                isOpen={true}
                onClose={() => setActiveMegaMenu(null)}
                type="work"
              />
            )}
          </div>

          <div
            className="relative h-full flex items-center"
            onMouseEnter={() => setActiveMegaMenu('solutions')}
            onMouseLeave={() => setActiveMegaMenu(null)}
          >
            <Button variant="ghost" className="h-[70px] rounded-none px-4 text-gray-700 hover:text-blue-600 hover:bg-transparent font-medium">
              Solutions
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {activeMegaMenu === 'solutions' && (
              <MegaMenu
                isOpen={true}
                onClose={() => setActiveMegaMenu(null)}
                type="solutions"
              />
            )}
          </div>
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <Button asChild variant="ghost" className="text-gray-700 font-medium hover:text-blue-600 hover:bg-transparent hidden md:inline-flex">
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild variant="ghost" className="text-gray-700 font-medium hover:text-blue-600 hover:bg-transparent hidden md:inline-flex">
            <Link href="/signup">Sign Up</Link>
          </Button>
          <Button asChild className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold rounded-lg px-6 h-10 shadow-sm transition-all hover:translate-y-[-1px] hover:shadow-md">
            <Link href="/post-project">Post a Project</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}