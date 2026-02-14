"use client";

import Image from "next/image";
import { Star } from "lucide-react";

interface ProfileCardProps {
  name: string;
  profession: string;
  rating: number;
  image: string;
  position: string;
  delay: string;
}

const ProfileCard = ({ name, profession, rating, image, position, delay }: ProfileCardProps) => (
  <div
    className={`absolute ${position} ${delay} bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/50 flex items-center gap-4 transition-transform hover:scale-105 hover:z-10`}
  >
    <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
      <Image
        src={image}
        alt={name}
        fill
        className="object-cover"
        sizes="48px"
      />
    </div>
    <div>
      <h4 className="font-semibold text-gray-900 text-sm">{name}</h4>
      <p className="text-xs text-gray-600 mb-1">{profession}</p>
      <div className="flex items-center gap-1">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
      </div>
    </div>
  </div>
);

export default function TalentNetworkSection() {
  const talents = [
    {
      name: "Sarah Jenkins",
      profession: "UX/UI Designer",
      rating: 5.0,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
      position: "top-[10%] left-[10%] hidden lg:flex",
      delay: "animate-float"
    },
    {
      name: "Michael Chen",
      profession: "Full Stack Dev",
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
      position: "top-[20%] right-[15%] hidden lg:flex",
      delay: "animate-float-delayed"
    },
    {
      name: "Elena Rodriguez",
      profession: "Content Writer",
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80",
      position: "bottom-[20%] left-[15%] hidden lg:flex",
      delay: "animate-float"
    },
    {
      name: "David Kim",
      profession: "Mobile Developer",
      rating: 5.0,
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
      position: "bottom-[15%] right-[10%] hidden lg:flex",
      delay: "animate-float-delayed"
    }
  ];

  return (
    <section className="relative py-24 bg-[#F0F5FF] overflow-hidden">
      {/* Background Map/Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/World_map_blank_without_borders.svg/2000px-World_map_blank_without_borders.svg.png')", backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundSize: "contain" }}></div>

      <div className="relative mx-auto max-w-[1440px] px-6 lg:px-[100px] text-center z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Tap into a global talent network
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
          Our platform connects you with skilled professionals from over 247 countries, ready to bring your ideas to life.
        </p>

        {/* This div acts as the visual container for the floating cards regarding height */}
        <div className="h-[400px] w-full relative max-w-4xl mx-auto border border-dashed border-blue-200 rounded-3xl bg-white/30 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center p-8">
            <span className="text-6xl font-black text-blue-100 block mb-2">60M+</span>
            <span className="text-xl text-blue-900 font-medium">Professionals Worldwide</span>
          </div>

          {talents.map((talent, index) => (
            <ProfileCard key={index} {...talent} />
          ))}
        </div>
      </div>
    </section>
  );
}
