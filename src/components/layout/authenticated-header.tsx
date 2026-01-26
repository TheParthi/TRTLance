import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  MessageCircle,
  ChevronDown,
  Search,
  Wallet,
  FileText,
  Briefcase,
  Users,
  BarChart3,
  List,
  CheckSquare,
  Inbox,
  Star,
  CreditCard,
  Activity,
  Bookmark,
  Zap,
  LogOut,
  User,
  Crown,
  TrendingUp,
  Target,
  Settings,
  Moon,
  Sun,
  DollarSign,
  Plus,
  Minus,
  History,
  PieChart,
  Share,
  HelpCircle,
  Trophy,
  Shield,
  Award,
  GraduationCap,
  UserCheck,
  Wrench,
  Building,
  MapPin,
  Eye,
  MessageSquare,
  Compass,
  LifeBuoy,
  Heart,
  Folder,
  Quote,
  Clock,
  CheckCircle,
  AlertCircle,
  Gift,
  Circle,
  Scale,
  FolderKanban
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/logo";
import { useAuth } from "@/contexts/auth-context";
import { useWallet } from "@/contexts/wallet-context";
import { createClient } from "@/lib/supabase/client";
import { MembershipModal } from "@/components/dashboard/membership-modal";
import { FundManagementModal } from "@/components/dashboard/fund-management-modal";
import { AnalyticsModal } from "@/components/dashboard/analytics-modal";
import { BidInsightsModal } from "@/components/dashboard/bid-insights-modal";
import { FinancialDashboardModal } from "@/components/dashboard/financial-dashboard-modal";
import { TransactionHistoryModal } from "@/components/dashboard/transaction-history-modal";
import { SupportModal } from "@/components/dashboard/support-modal";
import { PastFreelancersModal } from "@/components/dashboard/past-freelancers-modal";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string;
  created_at: string;
}

const primaryNavItems = [
  { name: "Browse", href: "/browse", hasDropdown: true },
  { name: "Manage", href: "/manage", hasDropdown: true }
];

const secondaryNavItems = [
  { name: "Lists", href: "/lists", icon: <List className="h-4 w-4" /> },
  { name: "Tasklists", href: "/tasklists", icon: <CheckSquare className="h-4 w-4" /> },
  { name: "My Projects", href: "/my-projects", icon: <Briefcase className="h-4 w-4" /> },
  { name: "Services", href: "/services", icon: <FileText className="h-4 w-4" /> },
  { name: "Inbox", href: "/inbox", icon: <Inbox className="h-4 w-4" /> },
  { name: "Feedback", href: "/feedback", icon: <Star className="h-4 w-4" /> },
  { name: "Project Updates", href: "/project-updates", icon: <Activity className="h-4 w-4" /> },
  { name: "Bookmarks", href: "/bookmarks", icon: <Bookmark className="h-4 w-4" /> },
  { name: "Prototyper", href: "/prototyper", icon: <Zap className="h-4 w-4" />, isNew: true },
  { name: "Disputes & Resolutions", href: "/disputes", icon: <Scale className="h-4 w-4" /> }
];

export default function AuthenticatedHeader() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [browseDropdownOpen, setBrowseDropdownOpen] = useState(false);
  const [manageDropdownOpen, setManageDropdownOpen] = useState(false);
  const [fileDropdownOpen, setFileDropdownOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showWithdrawFundsModal, setShowWithdrawFundsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showBidInsightsModal, setShowBidInsightsModal] = useState(false);
  const [showFinancialDashboardModal, setShowFinancialDashboardModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPastFreelancersModal, setShowPastFreelancersModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout, isAuthenticated } = useAuth();
  const { user: walletUser, isConnected, connectWallet } = useWallet();
  const supabase = createClient();
  const router = useRouter();

  // Defense in depth: Don't render if not authenticated
  if (!isAuthenticated && typeof window !== 'undefined') {
    return null;
  }
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const browseDropdownRef = useRef<HTMLDivElement>(null);
  const manageDropdownRef = useRef<HTMLDivElement>(null);
  const fileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);

  const projectUpdates: any[] = [];
  const recentProjects = [
    { id: 1, title: "E-commerce Website Development", status: "Active", lastUpdated: "2 hours ago" },
    { id: 2, title: "Mobile App UI Design", status: "Completed", lastUpdated: "1 day ago" },
    { id: 3, title: "Logo Design Project", status: "Draft", lastUpdated: "3 days ago" }
  ];

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadNotifications(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotifications(0);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const supabase = createClient();
      const subscription = supabase
        .channel(`user_notifications_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev].slice(0, 10));
            setUnreadNotifications(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (browseDropdownRef.current && !browseDropdownRef.current.contains(event.target as Node)) {
        setBrowseDropdownOpen(false);
      }
      if (manageDropdownRef.current && !manageDropdownRef.current.contains(event.target as Node)) {
        setManageDropdownOpen(false);
      }
      if (fileDropdownRef.current && !fileDropdownRef.current.contains(event.target as Node)) {
        setFileDropdownOpen(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target as Node)) {
        setNotificationsDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
        setBrowseDropdownOpen(false);
        setManageDropdownOpen(false);
        setFileDropdownOpen(false);
        setNotificationsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setBrowseDropdownOpen(false);
    }
  };

  const handleMenuItemClick = (href: string) => {
    setBrowseDropdownOpen(false);
    setManageDropdownOpen(false);
    setFileDropdownOpen(false);
    setNotificationsDropdownOpen(false);
    router.push(href);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'proposal': return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'project': return <Briefcase className="h-4 w-4 text-purple-500" />;
      case 'payment': return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'dispute': return <Scale className="h-4 w-4 text-red-500" />;
      case 'award': return <Trophy className="h-4 w-4 text-yellow-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-800 text-white shadow-lg">
      {/* Main Header */}
      <div className="border-b border-slate-700">
        <div className="w-full px-4">
          <div className="flex items-center h-16 gap-4 relative">
            {/* Left Side - Navigation */}
            <div className="flex-1 flex items-center">
              <nav className="flex items-center space-x-1">
                <Link href="/dashboard" className="hover:bg-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors text-white">
                  Dashboard
                </Link>
                <Link href="/dashboard/jobs" className="hover:bg-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors text-white">
                  Jobs
                </Link>
                <Link href="/find-jobs" className="hover:bg-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors text-white">
                  Browse
                </Link>
                <Link href="/contracts" className="hover:bg-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors text-white">
                  Contracts
                </Link>
                <Link href="/resolution-gigs" className="hover:bg-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors text-white flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Resolution Gigs
                </Link>
                <div className="relative" ref={browseDropdownRef}>
                  <Button
                    variant="ghost"
                    className="text-white hover:text-blue-400 hover:bg-slate-700 flex items-center gap-1.5"
                    onClick={() => setBrowseDropdownOpen(!browseDropdownOpen)}
                  >
                    <Search className="h-4 w-4" />
                    Browse
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>

                  {browseDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 py-4 z-50">
                      {/* Search Bar */}
                      <div className="px-4 mb-4">
                        <form onSubmit={handleSearch}>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search Freelancer.com"
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </form>
                      </div>

                      {/* Search Section */}
                      <div className="px-4 mb-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Search</h3>
                        <div className="space-y-1">
                          <button onClick={() => handleMenuItemClick('/projects')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Briefcase className="h-4 w-4 mr-3" />
                            Projects
                          </button>
                          <button onClick={() => handleMenuItemClick('/contests')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Trophy className="h-4 w-4 mr-3" />
                            Contests
                          </button>
                          <button onClick={() => handleMenuItemClick('/freelancers')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Users className="h-4 w-4 mr-3" />
                            Freelancers
                          </button>
                          <button onClick={() => handleMenuItemClick('/freemarket')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <FileText className="h-4 w-4 mr-3" />
                            Freemarket
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Freelancing Tools */}
                      <div className="px-4 mb-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Freelancing Tools</h3>
                        <div className="space-y-1">
                          <button onClick={() => handleMenuItemClick('/verified')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Shield className="h-4 w-4 mr-3" />
                            Verified by Freelancer
                          </button>
                          <button onClick={() => handleMenuItemClick('/preferred')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Award className="h-4 w-4 mr-3" />
                            Preferred Freelancer
                          </button>
                          <button onClick={() => handleMenuItemClick('/memberships')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Crown className="h-4 w-4 mr-3" />
                            Memberships
                          </button>
                          <button onClick={() => handleMenuItemClick('/exams')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <GraduationCap className="h-4 w-4 mr-3" />
                            Exams
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Client Tools */}
                      <div className="px-4 mb-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Client Tools</h3>
                        <div className="space-y-1">
                          <button onClick={() => handleMenuItemClick('/recruiter')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <UserCheck className="h-4 w-4 mr-3" />
                            Recruiter
                          </button>
                          <button onClick={() => handleMenuItemClick('/technical-copilot')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Wrench className="h-4 w-4 mr-3" />
                            Technical Co-pilot
                          </button>
                          <button onClick={() => handleMenuItemClick('/enterprise')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Building className="h-4 w-4 mr-3" />
                            Enterprise
                          </button>
                          <button onClick={() => handleMenuItemClick('/local-jobs')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <MapPin className="h-4 w-4 mr-3" />
                            Local Jobs
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Explore Freelancer */}
                      <div className="px-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Explore Freelancer</h3>
                        <div className="space-y-1">
                          <button onClick={() => handleMenuItemClick('/showcase')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Eye className="h-4 w-4 mr-3" />
                            Showcase
                          </button>
                          <button onClick={() => handleMenuItemClick('/community')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <MessageSquare className="h-4 w-4 mr-3" />
                            Community
                          </button>
                          <button onClick={() => handleMenuItemClick('/discover')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <Compass className="h-4 w-4 mr-3" />
                            Discover
                          </button>
                          <button onClick={() => handleMenuItemClick('/support')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <LifeBuoy className="h-4 w-4 mr-3" />
                            Customer Support
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manage Dropdown */}
                <div className="relative" ref={manageDropdownRef}>
                  <Button
                    variant="ghost"
                    className="text-white hover:text-blue-400 hover:bg-slate-700 flex items-center gap-1.5"
                    onClick={() => setManageDropdownOpen(!manageDropdownOpen)}
                  >
                    <FolderKanban className="h-4 w-4" />
                    Manage
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>

                  {manageDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-4 z-50">
                      {/* Recent Projects */}
                      <div className="px-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">Recent Projects</h3>
                          <button
                            onClick={() => handleMenuItemClick('/projects')}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View All
                          </button>
                        </div>
                        {recentProjects.length === 0 ? (
                          <div className="text-sm text-gray-600 py-2">
                            <p className="mb-2">You do not have any active projects.</p>
                            <button
                              onClick={() => handleMenuItemClick('/post-project')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Create one
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {recentProjects.slice(0, 3).map((project: any) => (
                              <button
                                key={project.id}
                                onClick={() => handleMenuItemClick(`/projects/${project.id}`)}
                                className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm"
                              >
                                {project.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Lists */}
                      <div className="px-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">Lists</h3>
                          <button
                            onClick={() => handleMenuItemClick('/lists')}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View All
                          </button>
                        </div>
                        <div className="space-y-1">
                          <button onClick={() => handleMenuItemClick('/lists/favorites')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm">
                            <Heart className="h-4 w-4 mr-3" />
                            Favorites
                          </button>
                          <button onClick={() => handleMenuItemClick('/lists/my-hires')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm">
                            <UserCheck className="h-4 w-4 mr-3" />
                            My Hires
                          </button>
                          <button onClick={() => handleMenuItemClick('/lists/recent')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm">
                            <Eye className="h-4 w-4 mr-3" />
                            Recently Viewed
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Tasklists */}
                      <div className="px-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">Tasklists</h3>
                          <button
                            onClick={() => handleMenuItemClick('/tasklists')}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View All
                          </button>
                        </div>
                        <div className="space-y-1">
                          <button onClick={() => handleMenuItemClick('/tasklists/default')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm">
                            <CheckSquare className="h-4 w-4 mr-3" />
                            @{user?.username || 'johndoe'}'s tasklist
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Project Updates */}
                      <div className="px-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">Project Updates</h3>
                          <button
                            onClick={() => handleMenuItemClick('/project-updates')}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View All
                          </button>
                        </div>
                        {projectUpdates.length === 0 ? (
                          <div className="text-sm text-gray-600 py-2">
                            <p className="mb-2">You do not have any active projects.</p>
                            <button
                              onClick={() => handleMenuItemClick('/projects')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Browse projects
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {projectUpdates.slice(0, 3).map((update: any) => (
                              <button
                                key={update.id}
                                onClick={() => handleMenuItemClick(`/project-updates/${update.id}`)}
                                className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm"
                              >
                                {update.summary}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* Center - Search Bar */}
            <div className="flex-1 flex justify-center">
              <div className="hidden lg:flex items-center w-full max-w-md">
                <form onSubmit={handleSearch} className="w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full bg-slate-700 text-white placeholder-slate-400 pl-10 pr-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </form>
              </div>
            </div>

            {/* Right - Actions & Profile */}
            <div className="flex-1 flex items-center justify-end space-x-4">

              {/* File/Manage Dropdown */}
              <div className="relative" ref={fileDropdownRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-blue-400 hover:bg-slate-700"
                  onClick={() => setFileDropdownOpen(!fileDropdownOpen)}
                  title="Manage"
                >
                  <Folder className="h-5 w-5" />
                </Button>

                {fileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-4 z-50">
                    {/* Recent Projects */}
                    <div className="px-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Recent Projects</h3>
                        <button
                          onClick={() => handleMenuItemClick('/my-projects')}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          View All →
                        </button>
                      </div>
                      {recentProjects.length === 0 ? (
                        <div className="text-sm text-gray-600 py-2">
                          <p className="mb-2">You do not have any active projects.</p>
                          <p>Create one to get started!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {recentProjects.slice(0, 5).map((project) => (
                            <button
                              key={project.id}
                              onClick={() => handleMenuItemClick(`/projects/${project.id}`)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
                            >
                              <div className="text-sm font-medium text-gray-900">{project.title}</div>
                              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                <span className={`px-2 py-1 rounded-full ${project.status === 'Active' ? 'bg-green-100 text-green-800' :
                                  project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                  {project.status}
                                </span>
                                <span>{project.lastUpdated}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 my-2"></div>

                    {/* Lists */}
                    <div className="px-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Lists</h3>
                        <button
                          onClick={() => handleMenuItemClick('/lists')}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View All →
                        </button>
                      </div>
                      <div className="space-y-1">
                        <button onClick={() => handleMenuItemClick('/lists/favorites')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm">
                          <Heart className="h-4 w-4 mr-3" />
                          Favorites
                        </button>
                        <button onClick={() => handleMenuItemClick('/lists/my-hires')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm">
                          <UserCheck className="h-4 w-4 mr-3" />
                          My Hires
                        </button>
                        <button onClick={() => handleMenuItemClick('/lists/recent')} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm">
                          <Eye className="h-4 w-4 mr-3" />
                          Recently Viewed
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 my-2"></div>

                    {/* Tasklists */}
                    <div className="px-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Tasklists</h3>
                        <button
                          onClick={() => handleMenuItemClick('/tasklists')}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View All →
                        </button>
                      </div>
                      <div className="space-y-1">
                        <button onClick={() => handleMenuItemClick(`/tasklists/${user?.id || 'default'}`)} className="w-full flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm">
                          <CheckSquare className="h-4 w-4 mr-3" />
                          @{user?.username || 'johndoe'}'s tasklist
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 my-2"></div>

                    {/* Project Updates */}
                    <div className="px-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Project Updates</h3>
                        <button
                          onClick={() => handleMenuItemClick('/project-updates')}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View All →
                        </button>
                      </div>
                      <div className="text-sm text-gray-600 py-2">
                        <p className="mb-2">You do not have any active projects.</p>
                        <button
                          onClick={() => handleMenuItemClick('/browse/projects')}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Browse projects to start work and give updates.
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>


              {/* Notifications */}
              <div className="relative" ref={notificationsDropdownRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-blue-400 hover:bg-slate-700 relative"
                  onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs p-0 flex items-center justify-center">
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>

                {notificationsDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 py-4 z-50 max-h-96 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark all as read
                      </button>
                    </div>

                    {/* Notifications List */}
                    <div className="space-y-1">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => {
                              if (!notification.read) markAsRead(notification.id);
                              handleMenuItemClick(notification.link || '/notifications');
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-l-4 ${!notification.read ? 'border-blue-500 bg-blue-50' : 'border-transparent'
                              }`}
                          >
                            <div className="flex items-start">
                              <div className="mr-3 mt-1">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                                  {notification.title}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(notification.created_at).toLocaleString()}
                                </div>
                              </div>
                              {!notification.read && (
                                <div className="ml-2 mt-2">
                                  <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 mt-3 pt-3 px-4">
                      <button
                        onClick={() => handleMenuItemClick('/notifications')}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View all notifications →
                      </button>
                    </div>
                  </div>
                )}
              </div>



              {/* Post Project */}
              <Link href="/post-project">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Post a Project
                </Button>
              </Link>

              {/* Wallet */}
              <Link href="/wallet" className="flex items-center px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors">
                <div className="flex items-center space-x-2 text-sm cursor-pointer">
                  <Wallet className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium">
                    {walletUser?.tokenBalance ? `${parseFloat(walletUser.tokenBalance).toFixed(2)} TRT` : (walletUser?.balance ? `${walletUser.balance} ETH` : '₹0')}
                  </span>
                </div>
              </Link>

              {/* Profile */}
              <div className="flex items-center">
                <div className="relative" ref={profileDropdownRef}>
                  <div
                    className="flex items-center space-x-2 cursor-pointer hover:bg-slate-700 rounded-md px-2 py-1"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/api/placeholder/32/32" />
                      <AvatarFallback>{user?.name?.split(' ').map(n => n[0]).join('') || 'JD'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{user?.name || 'John Doe'}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", profileDropdownOpen && "rotate-180")} />
                  </div>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 max-w-[95vw] bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden">
                      {/* Account Section */}
                      <div className="px-3 py-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Account</h3>
                        <Link href={`/profile/${user?.username || 'johndoe'}`}>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <User className="h-4 w-4 mr-3" />
                            View Profile
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowMembershipModal(true);
                          }}
                        >
                          <Crown className="h-4 w-4 mr-3" />
                          Membership
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowAnalyticsModal(true);
                          }}
                        >
                          <TrendingUp className="h-4 w-4 mr-3" />
                          Account Analytics
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowBidInsightsModal(true);
                          }}
                        >
                          <Target className="h-4 w-4 mr-3" />
                          Bid Insights
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            router.push('/profile/settings');
                          }}
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Settings
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            router.push('/disputes');
                          }}
                        >
                          <Scale className="h-4 w-4 mr-3" />
                          Disputes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={toggleTheme}
                        >
                          {theme === 'light' ? <Moon className="h-4 w-4 mr-3" /> : <Sun className="h-4 w-4 mr-3" />}
                          Theme ({theme === 'light' ? 'Dark' : 'Light'})
                        </Button>
                      </div>

                      <div className="border-t border-gray-200 my-1"></div>

                      {/* Finances Section */}
                      <div className="px-3 py-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Finances</h3>
                        <Link href="/wallet">
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <Wallet className="h-4 w-4 mr-3" />
                            Wallet
                          </Button>
                        </Link>
                        <Link href="/profile/payments">
                          <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                            <CreditCard className="h-4 w-4 mr-3" />
                            Payments
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowAddFundsModal(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-3" />
                          Add Funds
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowWithdrawFundsModal(true);
                          }}
                        >
                          <Minus className="h-4 w-4 mr-3" />
                          Withdraw Funds
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowTransactionsModal(true);
                          }}
                        >
                          <History className="h-4 w-4 mr-3" />
                          Transaction History
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowFinancialDashboardModal(true);
                          }}
                        >
                          <PieChart className="h-4 w-4 mr-3" />
                          Financial Dashboard
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-gray-700 hover:bg-gray-100">
                          <Share className="h-4 w-4 mr-3" />
                          Payment Sharing
                        </Button>
                      </div>

                      <div className="border-t border-gray-200 my-1"></div>

                      {/* Support Section */}
                      <div className="px-3 py-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Support</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowSupportModal(true);
                          }}
                        >
                          <HelpCircle className="h-4 w-4 mr-3" />
                          Support
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            logout();
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Logout
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modals outside triggers but inside header */}
              <MembershipModal
                isOpen={showMembershipModal}
                onClose={() => setShowMembershipModal(false)}
              />
              <FundManagementModal
                isOpen={showAddFundsModal}
                onClose={() => setShowAddFundsModal(false)}
                type="add"
              />
              <FundManagementModal
                isOpen={showWithdrawFundsModal}
                onClose={() => setShowWithdrawFundsModal(false)}
                type="withdraw"
              />
              <AnalyticsModal
                isOpen={showAnalyticsModal}
                onClose={() => setShowAnalyticsModal(false)}
              />
              <BidInsightsModal
                isOpen={showBidInsightsModal}
                onClose={() => setShowBidInsightsModal(false)}
              />
              <FinancialDashboardModal
                isOpen={showFinancialDashboardModal}
                onClose={() => setShowFinancialDashboardModal(false)}
              />
              <TransactionHistoryModal
                isOpen={showTransactionsModal}
                onClose={() => setShowTransactionsModal(false)}
              />
              <SupportModal
                isOpen={showSupportModal}
                onClose={() => setShowSupportModal(false)}
              />
              <PastFreelancersModal
                isOpen={showPastFreelancersModal}
                onClose={() => setShowPastFreelancersModal(false)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Navigation */}
      <div className="bg-slate-700 border-b border-slate-600">
        <div className="w-full px-4">
          <nav className="flex items-center justify-center space-x-1 overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-600 whitespace-nowrap flex items-center gap-2 py-3"
              onClick={() => setShowPastFreelancersModal(true)}
            >
              <Users className="h-4 w-4" />
              My Network
            </Button>
            {secondaryNavItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white hover:bg-slate-600 whitespace-nowrap flex items-center gap-2 py-3"
                >
                  {item.icon}
                  {item.name}
                  {item.isNew && (
                    <Badge className="bg-orange-500 text-xs px-1 py-0">NEW</Badge>
                  )}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header >
  );
}