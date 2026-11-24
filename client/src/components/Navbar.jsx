import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HugeiconsIcon,
  Dumbbell,
  LogIn,
  UserPlus,
  LogOut,
  Utensils,
  TrendingUp,
  LayoutDashboard,
  SettingsIcon,
  HelpCircle,
  Bell,
  Menu,
  X,
  Images,
  MessageSquare,
  ShieldCheck,
  Crown,
  Info,
} from "./ui/icons";
import BrandLogo from "./BrandLogo";
import { hasMinimumPlan } from "../utils/membershipAccess";
import { Button, PrimaryNavigation } from "./ui";
import "./PublicSite.css";
export default function Navbar({ healthStatus, publicMode = false }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const usesCompactPublicHeader =
    publicMode ||
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/memberships" ||
    pathname === "/pricing";
  const canAccessEliteFeatures =
    user?.role !== "user" || hasMinimumPlan(user.membership, "elite");
  const isTrainerSetup =
    user?.role === "trainer" && user.trainerApprovalStatus !== "approved";
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const publicMenuRef = useRef(null);
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previousBodyOverflow = publicMode
      ? document.body.style.overflow
      : undefined;
    if (publicMode) document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (publicMode && event.key === "Tab") {
        const focusable = publicMenuRef.current?.querySelectorAll(
          "a[href], button:not([disabled])",
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const focusIsInMenu = publicMenuRef.current?.contains(
          document.activeElement,
        );
        if (!focusIsInMenu) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    if (publicMode) {
      publicMenuRef.current
        ?.querySelector("a[href], button:not([disabled])")
        ?.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (publicMode) document.body.style.overflow = previousBodyOverflow;
    };
  }, [mobileMenuOpen, publicMode]);
  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate("/login");
  };
  const navLinkClass = ({ isActive }) =>
    `vf-navbar-link flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forma-brand-ember ${isActive ? "bg-forma-brand-ember/20 text-forma-text-primary border border-forma-brand-ember/50 font-bold" : "text-forma-text-secondary hover:text-forma-text-primary hover:bg-forma-brand-ember/10 hover:border-forma-brand-ember/30 border border-transparent"}`;
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  const mobileNavLinkClass = ({ isActive }) =>
    `${navLinkClass({ isActive })} w-full justify-start`;
  if (publicMode) {
    return (
      <header
        className={`forma-site-header forge-public-header${usesCompactPublicHeader ? " forge-public-header--landing" : ""}`}
      >
        <div className="forge-public-header__inner">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="forma-site-header__brand forge-public-header__brand"
            aria-label="FORGE home"
          >
            <BrandLogo size="nav" />
          </Link>
          <div className="forma-site-header__right forge-public-header__right">
            <PrimaryNavigation
              publicMode
              className={usesCompactPublicHeader ? "forge-landing-nav" : ""}
            />
            <div className="forma-site-header__actions forge-public-header__actions">
              {user ? (
                <Button
                  as={Link}
                  to="/dashboard"
                  variant="primary"
                  className="forge-public-header__primary"
                >
                  Open dashboard
                </Button>
              ) : (
                <>
                  <Button
                    as={Link}
                    to="/login"
                    variant="ghost"
                    className="forge-public-header__signin"
                  >
                    Sign in
                  </Button>
                  <Button
                    as={Link}
                    to="/register"
                    variant="primary"
                    className="forge-public-header__primary"
                  >
                    Join Forge
                  </Button>
                </>
              )}
            </div>
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            className="forge-public-header__menu"
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="forge-public-mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <HugeiconsIcon
              aria-hidden="true"
              icon={mobileMenuOpen ? X : Menu}
            />
          </button>
        </div>
        <div
          ref={publicMenuRef}
          id="forge-public-mobile-navigation"
          className="forge-public-header__mobile"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          hidden={!mobileMenuOpen}
        >
          <PrimaryNavigation
            publicMode
            onNavigate={closeMobileMenu}
            className={usesCompactPublicHeader ? "forge-landing-nav" : ""}
          />
          <div className="forge-public-header__mobile-actions">
            {user ? (
              <Button
                as={Link}
                to="/dashboard"
                variant="primary"
                className="forge-public-header__primary"
                onClick={closeMobileMenu}
              >
                Open dashboard
              </Button>
            ) : (
              <>
                <Button
                  as={Link}
                  to="/login"
                  variant="ghost"
                  className="forge-public-header__signin"
                  onClick={closeMobileMenu}
                >
                  Sign in
                </Button>
                <Button
                  as={Link}
                  to="/register"
                  variant="primary"
                  className="forge-public-header__primary"
                  onClick={closeMobileMenu}
                >
                  Join Forge
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className="vf-site-navbar sticky top-0 z-50 bg-forma-bg-surface/95 border-b border-forma-brand-ember/25 font-sans">
      <div className="relative max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] sm:h-[84px] xl:h-[88px] flex items-center justify-between gap-3">
        {/* Logo */}
        <Link
          to="/"
          onClick={closeMobileMenu}
          className="group min-w-0 shrink-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-forma-brand-ember"
        >
          <BrandLogo size="nav" className="group-hover:opacity-90" />
        </Link>
        {/* Navigation Links */}
        <nav
          aria-label="Main navigation"
          className={`${isTrainerSetup ? "hidden lg:flex" : user ? "hidden 2xl:flex" : "hidden xl:flex"} ml-auto min-w-0 items-center gap-1 2xl:gap-1.5 py-2`}
        >
          {isTrainerSetup ? (
            <>
              <NavLink to="/memberships" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Crown}
                  className="w-4 h-4 text-forma-brand-ember"
                />{" "}
                <span>Pricing</span>
              </NavLink>
              <NavLink to="/about" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Info}
                  className="w-4 h-4 text-forma-brand-ember"
                />{" "}
                <span>About</span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-forma-status-error hover:text-forma-status-error hover:bg-forma-status-error/10 border border-transparent hover:border-forma-status-error/20 transition-all cursor-pointer shrink-0 ml-1 focus:outline-none focus:ring-2 focus:ring-forma-status-error"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={LogOut}
                  className="w-4 h-4"
                />{" "}
                <span>Logout</span>
              </button>
            </>
          ) : user ? (
            <>
              <NavLink to="/about" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Info}
                  className="w-4 h-4 text-forma-brand-ember"
                />{" "}
                <span>About</span>
              </NavLink>
              {user.role === "admin" && (
                <NavLink to="/admin/trainers" className={navLinkClass}>
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={ShieldCheck}
                    className="w-4 h-4 text-forma-brand-ember"
                  />
                  <span>Trainers</span>
                </NavLink>
              )}
              {user.role === "trainer" && (
                <NavLink to="/trainer/dashboard" className={navLinkClass}>
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={ShieldCheck}
                    className="w-4 h-4 text-forma-brand-ember"
                  />
                  <span>Trainer panel</span>
                </NavLink>
              )}
              <NavLink to="/dashboard" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={LayoutDashboard}
                  className="w-4 h-4 text-forma-brand-ember"
                />
                <span className="hidden md:inline">Dashboard</span>
              </NavLink>
              <NavLink to="/workouts" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Dumbbell}
                  className="w-4 h-4 text-forma-brand-ember"
                />
                <span className="hidden md:inline">Workouts</span>
              </NavLink>
              <NavLink to="/nutrition" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Utensils}
                  className="w-4 h-4 text-forma-brand-ember"
                />
                <span className="hidden md:inline">Nutrition</span>
              </NavLink>
              <NavLink to="/progress" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={TrendingUp}
                  className="w-4 h-4 text-forma-brand-ember"
                />
                <span className="hidden md:inline">Progress</span>
              </NavLink>
              {canAccessEliteFeatures && (
                <NavLink to="/progress-photos" className={navLinkClass}>
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={Images}
                    className="w-4 h-4 text-forma-status-error"
                  />
                  <span className="hidden lg:inline">Journal</span>
                </NavLink>
              )}
              <NavLink to="/settings" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={SettingsIcon}
                  className="w-4 h-4 text-forma-status-error"
                />
                <span className="hidden lg:inline">Profile &amp; settings</span>
              </NavLink>
              {user.role === "user" && (
                <NavLink to="/support" className={navLinkClass}>
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={HelpCircle}
                    className="w-4 h-4 text-forma-status-error"
                  />
                  <span className="hidden lg:inline">Support</span>
                </NavLink>
              )}
              <NavLink to="/contact" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={MessageSquare}
                  className="w-4 h-4 text-forma-status-error"
                />
                <span className="hidden lg:inline">Contact</span>
              </NavLink>
              {canAccessEliteFeatures && (
                <NavLink
                  to="/ai-chat"
                  className={navLinkClass}
                  aria-label="AI fitness chat"
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={MessageSquare}
                    className="w-4 h-4 text-forma-brand-ember"
                  />
                  <span className="hidden xl:inline">AI Chat</span>
                </NavLink>
              )}
              <NavLink to="/memberships" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Crown}
                  className="w-4 h-4 text-forma-brand-ember"
                />
                <span className="hidden 2xl:inline">Plans</span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-forma-status-error hover:text-forma-status-error hover:bg-forma-status-error/10 border border-transparent hover:border-forma-status-error/20 transition-all cursor-pointer shrink-0 ml-1 focus:outline-none focus:ring-2 focus:ring-forma-status-error"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={LogOut}
                  className="w-4 h-4"
                />{" "}
                <span className="hidden xl:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/memberships" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Crown}
                  className="w-4 h-4 text-forma-brand-ember"
                />{" "}
                <span>Plans</span>
              </NavLink>
              <NavLink to="/about" className={navLinkClass}>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Info}
                  className="w-4 h-4 text-forma-brand-ember"
                />{" "}
                <span>About</span>
              </NavLink>
              <NavLink
                to="/login"
                className="vf-navbar-signin flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-forma-text-primary bg-forma-bg-surface hover:bg-forma-bg-surface border border-forma-brand-ember/30 transition-all focus:outline-none focus:ring-2 focus:ring-forma-brand-ember"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={LogIn}
                  className="w-4 h-4 text-forma-brand-ember"
                />{" "}
                <span>Sign In</span>
              </NavLink>
              <NavLink
                to="/register"
                className="vf-navbar-register flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold text-forma-text-primary bg-forma-brand-ember hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-forma-brand-ember"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={UserPlus}
                  className="w-4 h-4"
                />{" "}
                <span>Register</span>
              </NavLink>
            </>
          )}
          {/* Health Status pill */}
          {healthStatus && (
            <div className="flex items-center gap-2 pl-3 ml-2 border-l border-forma-brand-ember/20 text-xs text-forma-text-secondary shrink-0">
              <span
                className={`w-2 h-2 rounded-full ${healthStatus === "online" ? "bg-forma-status-success animate-pulse" : healthStatus === "loading" ? "bg-forma-status-warning" : "bg-forma-brand-ember"}`}
              ></span>
              <span>API:</span>
              <span
                className={
                  healthStatus === "online"
                    ? "text-forma-status-success font-semibold"
                    : "text-forma-text-secondary"
                }
              >
                {healthStatus === "online"
                  ? "Connected"
                  : healthStatus === "loading"
                    ? "Checking"
                    : "Offline"}
              </span>
            </div>
          )}
        </nav>
        <button
          ref={menuButtonRef}
          type="button"
          className={`vf-navbar-menu inline-flex h-11 w-11 items-center justify-center rounded-xl border border-forma-brand-ember/30 bg-forma-bg-surface text-forma-text-primary transition-colors hover:bg-forma-brand-ember/10 focus:outline-none focus:ring-2 focus:ring-forma-brand-ember ${isTrainerSetup ? "lg:hidden" : user ? "2xl:hidden" : "xl:hidden"}`}
          aria-label={
            mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span className="t-icon-swap" data-state={mobileMenuOpen ? "b" : "a"}>
            <span className="t-icon" data-icon="a">
              <HugeiconsIcon
                icon={Menu}
                className="h-5 w-5"
                aria-hidden="true"
              />
            </span>
            <span className="t-icon" data-icon="b">
              <HugeiconsIcon icon={X} className="h-5 w-5" aria-hidden="true" />
            </span>
          </span>
        </button>
      </div>
      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className={`vf-mobile-navigation max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-forma-brand-ember/20 border-b border-forma-brand-ember/25 bg-forma-bg-surface ${isTrainerSetup ? "lg:hidden" : user ? "2xl:hidden" : "xl:hidden"}`}
        >
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {isTrainerSetup ? (
                <>
                  <NavLink
                    to="/memberships"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Crown}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    Pricing
                  </NavLink>
                  <NavLink
                    to="/about"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Info}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    About FORGE
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-forma-status-error transition-colors hover:bg-forma-status-error/10 focus:outline-none focus:ring-2 focus:ring-forma-status-error"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={LogOut}
                      className="h-4 w-4"
                    />{" "}
                    Logout
                  </button>
                </>
              ) : user ? (
                <>
                  {user.role === "admin" && (
                    <NavLink
                      to="/admin/trainers"
                      onClick={closeMobileMenu}
                      className={mobileNavLinkClass}
                    >
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={ShieldCheck}
                        className="h-4 w-4 text-forma-brand-ember"
                      />{" "}
                      Trainers
                    </NavLink>
                  )}
                  {user.role === "trainer" && (
                    <NavLink
                      to="/trainer/dashboard"
                      onClick={closeMobileMenu}
                      className={mobileNavLinkClass}
                    >
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={ShieldCheck}
                        className="h-4 w-4 text-forma-brand-ember"
                      />{" "}
                      Trainer panel
                    </NavLink>
                  )}
                  <NavLink
                    to="/dashboard"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={LayoutDashboard}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/workouts"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Dumbbell}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    Workouts
                  </NavLink>
                  <NavLink
                    to="/nutrition"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Utensils}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    Nutrition
                  </NavLink>
                  <NavLink
                    to="/progress"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={TrendingUp}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    Progress
                  </NavLink>
                  {canAccessEliteFeatures && (
                    <NavLink
                      to="/progress-photos"
                      onClick={closeMobileMenu}
                      className={mobileNavLinkClass}
                    >
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={Images}
                        className="h-4 w-4 text-forma-status-error"
                      />{" "}
                      Transformation Journal
                    </NavLink>
                  )}
                  <NavLink
                    to="/settings"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={SettingsIcon}
                      className="h-4 w-4 text-forma-status-error"
                    />{" "}
                    Profile &amp; settings
                  </NavLink>
                  {user.role === "user" && (
                    <NavLink
                      to="/support"
                      onClick={closeMobileMenu}
                      className={mobileNavLinkClass}
                    >
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={HelpCircle}
                        className="h-4 w-4 text-forma-status-error"
                      />{" "}
                      Support
                    </NavLink>
                  )}
                  <NavLink
                    to="/contact"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={MessageSquare}
                      className="h-4 w-4 text-forma-status-error"
                    />{" "}
                    Contact
                  </NavLink>
                  <NavLink
                    to="/notifications"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Bell}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    Notifications
                  </NavLink>
                  {canAccessEliteFeatures && (
                    <NavLink
                      to="/ai-chat"
                      onClick={closeMobileMenu}
                      className={mobileNavLinkClass}
                    >
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={MessageSquare}
                        className="h-4 w-4 text-forma-brand-ember"
                      />{" "}
                      AI Fitness Chat
                    </NavLink>
                  )}
                  <NavLink
                    to="/memberships"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Crown}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    Memberships
                  </NavLink>
                  <NavLink
                    to="/about"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Info}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    About FORGE
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-forma-status-error transition-colors hover:bg-forma-status-error/10 focus:outline-none focus:ring-2 focus:ring-forma-status-error"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={LogOut}
                      className="h-4 w-4"
                    />{" "}
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/memberships"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Crown}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    Memberships
                  </NavLink>
                  <NavLink
                    to="/about"
                    onClick={closeMobileMenu}
                    className={mobileNavLinkClass}
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={Info}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    About Us
                  </NavLink>
                  <NavLink
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl border border-forma-brand-ember/30 px-3.5 py-2.5 text-sm font-semibold text-forma-text-primary transition-colors hover:bg-forma-brand-ember/10 focus:outline-none focus:ring-2 focus:ring-forma-brand-ember"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={LogIn}
                      className="h-4 w-4 text-forma-brand-ember"
                    />{" "}
                    Sign In
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl bg-forma-brand-ember px-3.5 py-2.5 text-sm font-bold text-forma-text-primary focus:outline-none focus:ring-2 focus:ring-forma-brand-ember"
                  >
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={UserPlus}
                      className="h-4 w-4"
                    />{" "}
                    Register
                  </NavLink>
                </>
              )}
              {healthStatus && (
                <div className="flex items-center gap-2 border-t border-forma-brand-ember/15 px-2.5 py-3 text-xs text-forma-text-secondary sm:col-span-2">
                  <span
                    className={`h-2 w-2 rounded-full ${healthStatus === "online" ? "bg-forma-status-success" : healthStatus === "loading" ? "bg-forma-status-warning" : "bg-forma-brand-ember"}`}
                  />
                  API:
                  {healthStatus === "online"
                    ? "Connected"
                    : healthStatus === "loading"
                      ? "Checking"
                      : "Offline"}
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
