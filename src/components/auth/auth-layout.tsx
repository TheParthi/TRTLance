import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8 relative bg-white">
        <Button asChild variant="ghost" size="sm" className="absolute top-4 left-4 text-gray-600 hover:text-blue-600">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
        <div className="w-full max-w-md space-y-6">
          {children}
        </div>
      </div>
      <div className="hidden lg:block relative bg-black overflow-hidden">
        <Image
          src="/auth-tiger.png"
          alt="TrustLance Tiger"
          fill
          className="object-cover object-center"
          priority
          sizes="(max-width: 1024px) 0vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
