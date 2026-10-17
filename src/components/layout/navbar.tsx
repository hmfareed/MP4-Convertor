"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, User, Menu, X, Shield, FileText, LogIn, UserPlus } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Section spy for homepage
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
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const isHomeActive = pathname === "/" && activeSection === "home";
  const isAboutActive = pathname === "/" && activeSection === "about";
  const isFeaturesActive = pathname === "/" && activeSection === "features";
  const isConversionsActive = pathname.startsWith("/conversions");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-200 border-b",
        scrolled
          ? "bg-[#080c14]/90 backdrop-blur-md border-slate-800/80 shadow-lg shadow-black/20"
          : "bg-[#080c14]/60 backdrop-blur-sm border-slate-800/40"
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
                ? "text-white bg-slate-800/80"
                : "text-slate-300 hover:text-white hover:bg-slate-800/50"
            )}
          >
            <History className="h-4 w-4 text-purple-400" />
            <span>My Conversions</span>
          </Link>

          {/* Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
                aria-label="User account menu"
              >
                <User className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col space-y-0.5">
                <span className="text-white font-medium text-xs">Guest Session</span>
                <span className="text-[11px] text-slate-400 lowercase">Non-persistent mode</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/conversions" className="flex items-center gap-2">
                  <History className="h-4 w-4 text-purple-400" />
                  <span>Recent Conversions</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => alert("Authentication is planned for Phase 4. Guest conversion is fully supported!")}
              >
                <LogIn className="h-4 w-4 text-blue-400" />
                <span>Sign In</span>
                <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Phase 4</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => alert("User registration is planned for Phase 4. Guest conversion is fully supported!")}
              >
                <UserPlus className="h-4 w-4 text-indigo-400" />
                <span>Create Account</span>
                <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Phase 4</span>
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
        <div className="md:hidden border-b border-slate-800 bg-[#0d1322]/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-3">
          <Link
            href="/"
            onClick={() => {
              setActiveSection("home");
              setMobileMenuOpen(false);
            }}
            className={cn(
              "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isHomeActive
                ? "bg-purple-600/10 text-purple-300 border border-purple-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
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
                ? "bg-purple-600/10 text-purple-300 border border-purple-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
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
                ? "bg-purple-600/10 text-purple-300 border border-purple-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
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
                ? "bg-purple-600/10 text-purple-300 border border-purple-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            )}
          >
            <History className="h-4 w-4 text-purple-400" />
            <span>My Conversions</span>
          </Link>
          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1 text-xs text-slate-400">
            <Link
              href="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-1.5 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-1.5 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
