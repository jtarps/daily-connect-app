"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Settings, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckInIntervalSettings } from "./check-in-interval-settings";
import { Button } from "../ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

const navItems = [
    { href: "/check-in", label: "Check-in", icon: Home },
    { href: "/circle", label: "My Circle", icon: Users },
];

const BottomNav = () => {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <nav className="sticky bottom-0 left-0 right-0 border-t bg-card/80 backdrop-blur-sm z-10 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-around h-16">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full gap-1 text-sm font-medium transition-colors",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-6 w-6" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                    <CheckInIntervalSettings>
                        <button
                            className={cn(
                                "flex flex-col items-center justify-center w-full gap-1 text-sm font-medium transition-colors",
                                "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Settings className="h-6 w-6" />
                            <span>Settings</span>
                        </button>
                    </CheckInIntervalSettings>
                    {mounted && (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className={cn(
                                "flex flex-col items-center justify-center w-full gap-1 text-sm font-medium transition-colors",
                                "text-muted-foreground hover:text-foreground"
                            )}
                            aria-label="Toggle theme"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-6 w-6" />
                            ) : (
                                <Moon className="h-6 w-6" />
                            )}
                            <span>Theme</span>
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
