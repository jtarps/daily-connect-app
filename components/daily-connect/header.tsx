
"use client";

import { Users, Bell, Home, LogOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser, useAuth } from '@/firebase/provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from 'firebase/auth';
import { CheckInIntervalSettings } from './check-in-interval-settings';
import { usePWAInstall } from './pwa-install-prompt';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const navItems = [
    { href: "/check-in", label: "Check-in", icon: Home },
    { href: "/circle", label: "My Circles", icon: Users },
];

const Header = () => {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { canInstall, handleInstall } = usePWAInstall();
  const [safeAreaTop, setSafeAreaTop] = useState(0);

  useEffect(() => {
    const updateSafeArea = () => {
      if (typeof window === 'undefined') return;
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isNative = Capacitor.isNativePlatform();
      
      if (isIOS && isNative) {
        // For iOS native apps, detect notch based on screen size
        // iPhone X and later (with notch) have height >= 812
        const screenHeight = Math.max(window.screen.height, window.screen.width);
        const hasNotch = screenHeight >= 812; // iPhone X (812pt) and later
        
        // iPhone 16 Pro has 932pt height, safe area is typically 59px
        // But we'll use a conservative 44px which works for most iPhones with notch
        setSafeAreaTop(hasNotch ? 44 : 20);
      } else {
        // For web or non-iOS, try CSS env() variable, default to 0
        setSafeAreaTop(0);
      }
    };

    updateSafeArea();
    // Listen for orientation changes
    window.addEventListener('orientationchange', updateSafeArea);
    window.addEventListener('resize', updateSafeArea);
    
    return () => {
      window.removeEventListener('orientationchange', updateSafeArea);
      window.removeEventListener('resize', updateSafeArea);
    };
  }, []);

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  }
  
  const getInitials = () => {
    if (user?.isAnonymous) return 'AN';
    if (user?.email) {
        return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  }

  return (
    <header 
      className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10" 
      style={{ 
        // Use calculated safe area, or fall back to CSS env() variable
        paddingTop: safeAreaTop > 0 ? `${safeAreaTop}px` : 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg shadow-md">
            <Users className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground font-headline">
            Daily Connect
          </h1>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-4">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-2 text-sm font-medium transition-colors p-2 rounded-md",
                            isActive ? "bg-accent/20 text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <CheckInIntervalSettings />
          {canInstall && (
            <Button 
              variant="ghost" 
              size="icon" 
              aria-label="Install App"
              onClick={handleInstall}
              title="Install Daily Connect"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer">
                    {/* The AvatarImage is removed as we don't have user images yet */}
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email || 'My Account'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
