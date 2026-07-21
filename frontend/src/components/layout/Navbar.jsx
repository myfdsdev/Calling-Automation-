import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Search,
  Users,
  PhoneCall,
  Bell,
  Menu,
  X,
  Coins,
  Timer,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn, initials } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/lead-finder', label: 'Lead Finder', icon: Search },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/calls', label: 'Calls', icon: PhoneCall },
];

function CreditPills({ user }) {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-graphite-700 bg-graphite-800 px-3 py-1.5 text-xs font-medium text-graphite-300"
        title="Remaining lead credits"
      >
        <Coins className="h-3.5 w-3.5 text-brand-400" />
        {user?.leadCredits ?? 0} credits
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-graphite-700 bg-graphite-800 px-3 py-1.5 text-xs font-medium text-graphite-300"
        title="Remaining calling minutes"
      >
        <Timer className="h-3.5 w-3.5 text-brand-400" />
        {user?.callingMinutes ?? 0} min
      </span>
    </div>
  );
}

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

  return (
    <header className="sticky top-0 z-40 border-b border-graphite-700 bg-graphite-900">
      <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-graphite-950">
            <PhoneCall className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight text-white">
            LeadCall<span className="text-brand-500"> AI</span>
          </span>
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
          <CreditPills user={user} />

          <Button
            variant="ghost"
            size="icon"
            className="relative text-graphite-300 hover:bg-graphite-800 hover:text-white"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-graphite-800">
                <Avatar>
                  <AvatarFallback className="bg-brand-500 text-graphite-950">
                    {initials(user?.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="hidden h-4 w-4 text-graphite-400 sm:block" />
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

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-graphite-300 hover:bg-graphite-800 hover:text-white md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen ? (
        <div className="border-t border-graphite-700 bg-graphite-900 md:hidden">
          <nav className="space-y-1 px-4 py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={linkClass}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={iconClass(isActive)} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
            <div className="flex items-center gap-2 px-3 pt-2 lg:hidden">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-graphite-700 bg-graphite-800 px-3 py-1.5 text-xs font-medium text-graphite-300">
                <Coins className="h-3.5 w-3.5 text-brand-400" /> {user?.leadCredits ?? 0} credits
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-graphite-700 bg-graphite-800 px-3 py-1.5 text-xs font-medium text-graphite-300">
                <Timer className="h-3.5 w-3.5 text-brand-400" /> {user?.callingMinutes ?? 0} min
              </span>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
