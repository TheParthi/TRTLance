"use client";

import Link from "next/link";
import Logo from "@/components/logo";
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";

const footerLinks = {
  Categories: [
    "Websites, IT & Software",
    "Writing & Content",
    "Design, Media & Architecture",
    "Data Entry & Admin",
    "Engineering & Science",
    "Sales & Marketing"
  ],
  Projects: [
    "Browse Projects",
    "Featured Projects",
    "Project Catalog",
    "Local Projects",
    "Contests"
  ],
  Freelancers: [
    "Browse Freelancers",
    "Top Freelancers",
    "Local Freelancers",
    "Freelancer Directory",
    "Skill Tests"
  ],
  "Enterprise & Help": [
    "Enterprise Solutions",
    "API for Developers",
    "AI Development",
    "Help Center",
    "Contact Support"
  ]
};

const socialIcons = [
  { icon: <Facebook className="h-5 w-5" />, href: "#", label: "Facebook" },
  { icon: <Twitter className="h-5 w-5" />, href: "#", label: "Twitter" },
  { icon: <Linkedin className="h-5 w-5" />, href: "#", label: "LinkedIn" },
  { icon: <Instagram className="h-5 w-5" />, href: "#", label: "Instagram" },
];

export default function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("bg-[#F9FAFB] border-t border-gray-200", className)}>
      <div className="mx-auto max-w-[1440px] px-6 lg:px-[100px] py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand & Stats */}
          <div className="space-y-6">
            <Logo />
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Registered Users</p>
                <p className="text-2xl font-bold text-[#4F46E5]">60,000,000+</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Jobs Posted</p>
                <p className="text-2xl font-bold text-[#4F46E5]">22,000,000+</p>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-base text-gray-600 hover:text-[#4F46E5] transition-colors block"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col md:flex-row items-center gap-6 text-sm text-gray-500">
              <p>© {new Date().getFullYear()} TrustLance Technology Pty Ltd</p>
              <div className="flex items-center gap-6">
                <Link href="#" className="hover:text-[#4F46E5]">Terms</Link>
                <Link href="#" className="hover:text-[#4F46E5]">Privacy</Link>
                <Link href="#" className="hover:text-[#4F46E5]">Code of Conduct</Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {socialIcons.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="text-gray-400 hover:text-[#4F46E5] transition-colors p-2 hover:bg-white rounded-full hover:shadow-sm"
                  aria-label={social.label}
                >
                  {social.icon}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}