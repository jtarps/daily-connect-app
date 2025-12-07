"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/check-in", label: "Check-in", icon: Home },
    { href: "/circle", label: "Circle", icon: Users },
];

const BottomNav = () => {
    const pathname = usePathname();

    return (
        <nav className="sticky bottom-0 left-0 right-0 border-t bg-card/80 backdrop-blur-sm z-10 md:hidden">
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
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
