"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckInIntervalSettings } from "./check-in-interval-settings";

const navItems = [
    { href: "/check-in", label: "Check-in", icon: Home },
    { href: "/circle", label: "My Circle", icon: Users },
];

const BottomNav = () => {
    const pathname = usePathname();

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
                                pathname === "/settings" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Settings className="h-6 w-6" />
                            <span>Settings</span>
                        </button>
                    </CheckInIntervalSettings>
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
