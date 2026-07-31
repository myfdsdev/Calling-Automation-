import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Search,
  Users,
  PhoneCall,
  Menu,
  User,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';
import { cn, initials } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/lead-finder', label: 'Lead Finder', icon: Search },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/calls', label: 'Calls', icon: PhoneCall },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    cn(
      'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-graphite-800 text-white'
        : 'text-graphite-300 hover:bg-graphite-800 hover:text-white',
    );
  const iconClass = (isActive) =>
    cn('h-[18px] w-[18px]', isActive ? 'text-brand-500' : 'text-graphite-400');

  // 44px touch targets for the mobile drawer.
  const drawerLinkClass = ({ isActive }) =>
    cn(
      'inline-flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
      isActive
        ? 'bg-graphite-800 text-white'
        : 'text-graphite-300 hover:bg-graphite-800 hover:text-white',
    );

  return (
    <header className="sticky top-0 z-40 border-b border-graphite-700 bg-graphite-900">
      <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <Logo light className="h-8" />
        </Link>

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {({ isActive }) => (
                <>
                  <item.icon className={iconClass(isActive)} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-graphite-800 md:flex">
                <Avatar>
                  <AvatarFallback className="bg-brand-500 text-graphite-950">
                    {initials(user?.name || 'U')}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="normal-case">
                <div className="text-sm font-semibold text-foreground">{user?.name}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/account">
                  <User className="h-4 w-4" /> Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/workspace">
                  <Users className="h-4 w-4" /> Workspace
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/plans">
                  <Sparkles className="h-4 w-4" /> Plans &amp; Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/api-settings">
                  <Settings className="h-4 w-4" /> API Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:bg-danger-50 focus:text-destructive [&_svg]:text-destructive"
              >
                <LogOut className="h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu — opens a slide-in drawer */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-graphite-300 hover:bg-graphite-800 hover:text-white md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex w-[288px] flex-col gap-0 border-graphite-700 bg-graphite-900 p-0 text-graphite-100 [&>button]:top-[22px] [&>button]:text-graphite-300 [&>button:hover]:text-white"
            >
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <SheetDescription className="sr-only">
                Main navigation and account links
              </SheetDescription>

              {/* Drawer header */}
              <div className="flex h-16 flex-shrink-0 items-center border-b border-graphite-700 px-4">
                <Link
                  to="/"
                  className="flex items-center"
                  onClick={() => setMobileOpen(false)}
                >
                  <Logo light className="h-8" />
                </Link>
              </div>

              {/* Drawer nav */}
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={drawerLinkClass}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn('flex-shrink-0', iconClass(isActive))} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Account links */}
              <div className="flex-shrink-0 space-y-3 border-t border-graphite-700 px-3 py-4">
                <div className="flex flex-col gap-1">
                  <Link
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className={drawerLinkClass({ isActive: false })}
                  >
                    <User className="h-[18px] w-[18px] flex-shrink-0 text-graphite-400" /> Account
                  </Link>
                  <Link
                    to="/workspace"
                    onClick={() => setMobileOpen(false)}
                    className={drawerLinkClass({ isActive: false })}
                  >
                    <Users className="h-[18px] w-[18px] flex-shrink-0 text-graphite-400" /> Workspace
                  </Link>
                  <Link
                    to="/plans"
                    onClick={() => setMobileOpen(false)}
                    className={drawerLinkClass({ isActive: false })}
                  >
                    <Sparkles className="h-[18px] w-[18px] flex-shrink-0 text-graphite-400" /> Plans &amp; Billing
                  </Link>
                  <Link
                    to="/api-settings"
                    onClick={() => setMobileOpen(false)}
                    className={drawerLinkClass({ isActive: false })}
                  >
                    <Settings className="h-[18px] w-[18px] flex-shrink-0 text-graphite-400" /> API Settings
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="inline-flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-danger-500 transition-colors hover:bg-graphite-800"
                  >
                    <LogOut className="h-[18px] w-[18px] flex-shrink-0" /> Logout
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
