"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  History,
  User,
  Menu,
  X,
  Shield,
  ShieldCheck,
  FileText,
  LogIn,
  UserPlus,
  Settings,
  LogOut,
  WifiOff,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Do not render public homepage navbar inside admin portal
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const [activeSection, setActiveSection] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  useEffect(() => {
    // Offline detection
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Fetch user profile
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});

    // Scroll spy
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      if (pathname === "/") {
        const sections = ["about", "features"];
        let current = "home";

        for (const section of sections) {
          const el = document.getElementById(section);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 200 && rect.bottom >= 200) {
              current = section;
              break;
            }
          }
        }
        if (window.scrollY < 200) {
          current = "home";
        }
        setActiveSection(current);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const isHomeActive = pathname === "/" && activeSection === "home";
  const isAboutActive = pathname === "/" && activeSection === "about";
  const isFeaturesActive = pathname === "/" && activeSection === "features";
  const isConversionsActive = pathname.startsWith("/conversions");

  return (
    <>
      {isOffline && (
        <div className="bg-amber-500/90 text-black text-xs font-semibold py-1 px-4 text-center flex items-center justify-center gap-2">
          <WifiOff className="h-3.5 w-3.5" />
          <span>You are currently offline. Conversions will resume once connection is restored.</span>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-200 border-b",
          scrolled
            ? "bg-black/90 backdrop-blur-md border-neutral-800/80 shadow-lg shadow-black/40"
            : "bg-black/60 backdrop-blur-sm border-blue-950/40"
        )}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Center Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <Link
              href="/"
              onClick={() => setActiveSection("home")}
              className={cn(
                "relative py-1 transition-colors hover:text-white",
                isHomeActive ? "text-white font-semibold" : "text-slate-400"
              )}
            >
              Home
              {isHomeActive && (
                <span className="absolute bottom-[-1.25rem] left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              )}
            </Link>

            <Link
              href="/#about"
              onClick={() => setActiveSection("about")}
              className={cn(
                "relative py-1 transition-colors hover:text-white",
                isAboutActive ? "text-white font-semibold" : "text-slate-400"
              )}
            >
              About
              {isAboutActive && (
                <span className="absolute bottom-[-1.25rem] left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              )}
            </Link>

            <Link
              href="/#features"
              onClick={() => setActiveSection("features")}
              className={cn(
                "relative py-1 transition-colors hover:text-white",
                isFeaturesActive ? "text-white font-semibold" : "text-slate-400"
              )}
            >
              Features
              {isFeaturesActive && (
                <span className="absolute bottom-[-1.25rem] left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              )}
            </Link>
          </nav>

          {/* Right Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/conversions"
              className={cn(
                "flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                isConversionsActive
                  ? "text-white bg-blue-950/60 border border-blue-800/40"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-900/60"
              )}
            >
              <History className="h-4 w-4 text-blue-400" />
              <span>My Conversions</span>
            </Link>

            {/* Profile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all font-semibold text-xs"
                  aria-label="User account menu"
                >
                  {user ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuLabel className="flex flex-col space-y-0.5">
                      <span className="text-white font-medium text-xs truncate">{user.name}</span>
                      <span className="text-[11px] text-slate-400 truncate">{user.email}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/conversions" className="flex items-center gap-2">
                        <History className="h-4 w-4 text-purple-400" />
                        <span>My Conversions</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
                          <ShieldCheck className="h-4 w-4 text-indigo-400" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel className="flex flex-col space-y-0.5">
                      <span className="text-white font-medium text-xs">Guest Session</span>
                      <span className="text-[11px] text-slate-400">Non-persistent mode</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/conversions" className="flex items-center gap-2">
                        <History className="h-4 w-4 text-purple-400" />
                        <span>Recent Conversions</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/login" className="flex items-center gap-2">
                        <LogIn className="h-4 w-4 text-blue-400" />
                        <span>Sign In</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/register" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-indigo-400" />
                        <span>Create Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/privacy" className="flex items-center gap-2 text-xs text-slate-400 hover:text-white">
                        <Shield className="h-3.5 w-3.5" />
                        <span>Privacy Policy</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/terms" className="flex items-center gap-2 text-xs text-slate-400 hover:text-white">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Terms of Service</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/conversions"
              className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
              aria-label="My Conversions"
            >
              <History className="h-5 w-5 text-purple-400" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-neutral-800 bg-[#030712]/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-3">
            {user && (
              <div className="px-3 py-2 mb-2 rounded-lg bg-black/80 border border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">{user.name}</p>
                  <p className="text-[11px] text-neutral-400">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            <Link
              href="/"
              onClick={() => {
                setActiveSection("home");
                setMobileMenuOpen(false);
              }}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isHomeActive
                  ? "bg-blue-600/15 text-blue-300 border border-blue-500/30"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-900/60"
              )}
            >
              Home
            </Link>
            <Link
              href="/#about"
              onClick={() => {
                setActiveSection("about");
                setMobileMenuOpen(false);
              }}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isAboutActive
                  ? "bg-blue-600/15 text-blue-300 border border-blue-500/30"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-900/60"
              )}
            >
              About
            </Link>
            <Link
              href="/#features"
              onClick={() => {
                setActiveSection("features");
                setMobileMenuOpen(false);
              }}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isFeaturesActive
                  ? "bg-blue-600/15 text-blue-300 border border-blue-500/30"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-900/60"
              )}
            >
              Features
            </Link>
            <Link
              href="/conversions"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isConversionsActive
                  ? "bg-blue-600/15 text-blue-300 border border-blue-500/30"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-900/60"
              )}
            >
              <History className="h-4 w-4 text-blue-400" />
              <span>My Conversions</span>
            </Link>

            {!user ? (
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="w-1/2 text-xs">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="gradient" size="sm" className="w-1/2 text-xs">
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    Register
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-2"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                >
                  Account Settings
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}
