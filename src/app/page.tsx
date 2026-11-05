"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  Inbox,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Category = "Personal" | "Work" | "Wellness" | "Learning";
type Filter = "Today" | "Upcoming" | "All tasks" | "Completed";

type Task = {
  id: string;
  title: string;
  description: string;
  category: Category;
  due_at: string | null;
  completed: boolean;
  created_at: string;
};

const categories: Category[] = ["Personal", "Work", "Wellness", "Learning"];
const categoryColors: Record<Category, string> = {
  Personal: "violet",
  Work: "blue",
  Wellness: "green",
  Learning: "amber",
};
const filters: { name: Filter; icon: typeof Sun }[] = [
  { name: "Today", icon: Sun },
  { name: "Upcoming", icon: CalendarDays },
  { name: "All tasks", icon: Inbox },
  { name: "Completed", icon: CheckCheck },
];
const demoStorageKey = "daymark-demo-tasks";
const reminderStorageKey = "daymark-notified-reminders";

function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function seedTasks(): Task[] {
  const now = new Date();
  const at = (hours: number, minutes = 0, days = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  };
  const created = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  return [
    { id: "demo-1", title: "Plan the week ahead", description: "Pick the three things that matter most.", category: "Personal", due_at: at(9, 0), completed: true, created_at: created },
    { id: "demo-2", title: "Review project proposal", description: "Add final notes before the team sync.", category: "Work", due_at: at(11, 30), completed: false, created_at: created },
    { id: "demo-3", title: "Take a proper lunch break", description: "", category: "Wellness", due_at: at(13, 0), completed: false, created_at: created },
    { id: "demo-4", title: "Read 20 pages", description: "A little progress adds up.", category: "Learning", due_at: at(18, 0), completed: false, created_at: created },
    { id: "demo-5", title: "Send the project update", description: "", category: "Work", due_at: at(10, 0, 1), completed: false, created_at: created },
    { id: "demo-6", title: "Book a dentist appointment", description: "", category: "Personal", due_at: at(15, 0, 1), completed: false, created_at: created },
  ];
}

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isToday(value: string | null) {
  return value ? dateKey(value) === dateKey(new Date()) : false;
}

function formatDue(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return isToday(value)
    ? `Today, ${time}`
    : `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

function initials(email: string | null) {
  if (!email) return "J";
  return email.slice(0, 1).toUpperCase();
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("Today");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const backendConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [authReady, setAuthReady] = useState(!backendConfigured);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3800);
  }, []);

  const loadTasks = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, category, due_at, completed, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      showToast(`Could not load tasks: ${error.message}`);
      return;
    }
    setTasks((data ?? []) as Task[]);
  }, [showToast, supabase]);

  useEffect(() => {
    const clockTimeout = window.setTimeout(() => setNow(new Date()), 0);
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    const authError = new URLSearchParams(window.location.search).get("authError");
    const authErrorTimeout = authError ? window.setTimeout(() => {
      showToast(authError === "configuration"
        ? "Supabase is not configured for this deployment."
        : "Email confirmation could not be completed. Please try signing in again.");
    }, 0) : null;

    if (!supabase) {
      const demoTimeout = window.setTimeout(() => {
        try {
          const saved = window.localStorage.getItem(demoStorageKey);
          setTasks(saved ? (JSON.parse(saved) as Task[]) : seedTasks());
        } catch {
          setTasks(seedTasks());
        }
        setDemoLoaded(true);
      }, 0);
      return () => {
        window.clearTimeout(clockTimeout);
        window.clearTimeout(demoTimeout);
        if (authErrorTimeout) window.clearTimeout(authErrorTimeout);
        window.clearInterval(interval);
      };
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) showToast(`Could not check your session: ${error.message}`);
      const user = data.session?.user;
      setUserEmail(user?.email ?? null);
      if (!user) setAuthOpen(true);
      if (user) void loadTasks(user.id);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setUserEmail(user?.email ?? null);
      if (user) void loadTasks(user.id);
      else {
        setTasks([]);
        if (backendConfigured) setAuthOpen(true);
      }
    });

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(clockTimeout);
      if (authErrorTimeout) window.clearTimeout(authErrorTimeout);
      listener.subscription.unsubscribe();
    };
  }, [backendConfigured, loadTasks, showToast, supabase]);

  useEffect(() => {
    if (supabase || !demoLoaded) return;
    window.localStorage.setItem(demoStorageKey, JSON.stringify(tasks));
  }, [demoLoaded, supabase, tasks]);

  useEffect(() => {
    if (!now || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notified = new Set<string>(
      JSON.parse(window.localStorage.getItem(reminderStorageKey) ?? "[]") as string[],
    );
    const dueNow = tasks.filter((task) => {
      if (task.completed || !task.due_at || notified.has(task.id)) return false;
      const due = new Date(task.due_at).getTime();
      return due <= now.getTime() && due > now.getTime() - 60_000;
    });
    for (const task of dueNow) {
      new Notification("A little nudge from Daymark", {
        body: task.title,
        icon: "/favicon.ico",
      });
      notified.add(task.id);
    }
    if (dueNow.length) window.localStorage.setItem(reminderStorageKey, JSON.stringify([...notified]));
  }, [now, tasks]);

  const todayTasks = tasks.filter((task) => !task.completed && isToday(task.due_at));
  const completedToday = tasks.filter((task) => task.completed && isToday(task.due_at)).length;
  const dueTodayCount = tasks.filter((task) => isToday(task.due_at)).length;
  const completion = dueTodayCount ? Math.round((completedToday / dueTodayCount) * 100) : 0;

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (filter === "Today" && (!isToday(task.due_at) || task.completed)) return false;
        if (filter === "Upcoming" && (!task.due_at || new Date(task.due_at) <= new Date() || task.completed)) return false;
        if (filter === "Completed" && !task.completed) return false;
        if (categoryFilter !== "All" && task.category !== categoryFilter) return false;
        return !query || task.title.toLowerCase().includes(query) || task.description.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });
  }, [categoryFilter, filter, search, tasks]);

  const upsertTask = async (task: Task, previous?: Task) => {
    if (supabase && userEmail) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        showToast(userError?.message ?? "Your session has expired. Please sign in again.");
        return;
      }
      if (previous) {
        const { error } = await supabase.from("tasks").update({
          completed: task.completed,
          title: task.title,
          description: task.description,
          category: task.category,
          due_at: task.due_at,
        }).eq("id", task.id).eq("user_id", userData.user.id);
        if (error) {
          setTasks((current) => current.map((item) => item.id === task.id ? previous : item));
          showToast(`Could not update task: ${error.message}`);
        }
      } else {
        const { data, error } = await supabase.from("tasks").insert({
          user_id: userData.user.id,
          title: task.title,
          description: task.description,
          category: task.category,
          due_at: task.due_at,
          completed: false,
        }).select("id, title, description, category, due_at, completed, created_at").single();
        if (error) {
          setTasks((current) => current.filter((item) => item.id !== task.id));
          showToast(`Could not create task: ${error.message}`);
        } else if (data) {
          setTasks((current) => current.map((item) => item.id === task.id ? data as Task : item));
        }
      }
    }
  };

  const toggleTask = (task: Task) => {
    const updated = { ...task, completed: !task.completed };
    setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
    if (updated.completed) showToast("Nicely done. One less thing on your mind.");
    void upsertTask(updated, task);
  };

  const deleteTask = async (task: Task) => {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    if (supabase && userEmail) {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        setTasks((current) => [task, ...current]);
        showToast(authError?.message ?? "Your session has expired. Please sign in again.");
        return;
      }
      const { error } = await supabase.from("tasks").delete().eq("id", task.id).eq("user_id", data.user.id);
      if (error) {
        setTasks((current) => [task, ...current]);
        showToast(`Could not delete task: ${error.message}`);
      }
    }
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const dueValue = String(form.get("due_at") ?? "");
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      description: String(form.get("description") ?? "").trim(),
      category: String(form.get("category") ?? "Personal") as Category,
      due_at: dueValue ? new Date(dueValue).toISOString() : null,
      completed: false,
      created_at: new Date().toISOString(),
    };
    setTasks((current) => [task, ...current]);
    setModalOpen(false);
    event.currentTarget.reset();
    showToast("Task added to your day.");
    await upsertTask(task);
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (authMode === "signup" && !result.data.session) {
      setMessage("Check your inbox for a confirmation link. Your account will be ready as soon as you confirm.");
    } else {
      setAuthOpen(false);
      setMessage("");
      showToast(authMode === "signup" ? "Your account is ready." : "Welcome back.");
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(false);
      setMessage(error.message);
    }
  };

  const signOut = async () => {
    if (!supabase) {
      setAuthOpen(true);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) showToast(`Could not sign out: ${error.message}`);
  };

  const enableReminders = async () => {
    if (typeof Notification === "undefined") {
      showToast("Your browser does not support desktop notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    showToast(permission === "granted" ? "Reminders are on for this device." : "Notification permission was not granted.");
  };

  const greeting = now
    ? now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening"
    : "Good morning";
  const dateLabel = now
    ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
    : "Your day, at a glance";

  if (!authReady) {
    return <main className="loading-screen"><div className="brand-mark"><Check size={18} /></div><span>Getting your day ready…</span></main>;
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" aria-label="Daymark home">
          <span className="brand-mark"><Check size={17} strokeWidth={2.8} /></span>
          <span>daymark<span className="brand-period">.</span></span>
        </a>
        <button className="workspace-switch" onClick={() => setMobileMenuOpen(false)}>
          <span className="workspace-avatar"><Sparkles size={16} /></span>
          <span className="workspace-label"><strong>My workspace</strong><small>{backendConfigured ? "Personal space" : "Demo workspace"}</small></span>
          <ChevronDown size={15} className="muted-icon" />
        </button>

        <div className="nav-section-label">MENU</div>
        <nav className="primary-nav" aria-label="Task filters">
          {filters.map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item ${filter === name ? "nav-item-active" : ""}`} onClick={() => { setFilter(name); setMobileMenuOpen(false); }}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{name}</span>
              {name === "Today" && <span className="nav-count">{todayTasks.length}</span>}
            </button>
          ))}
        </nav>

        <div className="nav-section-label categories-heading"><span>YOUR LISTS</span><button aria-label="Add category" onClick={() => showToast("Choose a category when you add a task.")}><Plus size={15} /></button></div>
        <nav className="category-nav" aria-label="Categories">
          {categories.map((category) => (
            <button key={category} className={`nav-item category-item ${categoryFilter === category ? "category-selected" : ""}`} onClick={() => { setCategoryFilter(categoryFilter === category ? "All" : category); setMobileMenuOpen(false); }}>
              <span className={`category-dot dot-${categoryColors[category]}`} />
              <span>{category}</span>
              <span className="category-count">{tasks.filter((task) => task.category === category && !task.completed).length}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="focus-card">
            <span className="focus-icon"><Sparkles size={15} /></span>
            <p>A little progress<br />goes a long way.</p>
            <span className="focus-caption">You&apos;ve got this ✨</span>
          </div>
          <button className="nav-item support-link" onClick={() => showToast("You can manage your account and reminders from your profile.")}><CircleHelp size={17} /><span>Help & support</span></button>
          <div className="profile-area">
            <button className="profile-button" onClick={() => backendConfigured ? (userEmail ? void signOut() : setAuthOpen(true)) : setAuthOpen(true)}>
              <span className="profile-avatar">{initials(userEmail)}</span>
              <span className="profile-copy"><strong>{userEmail ? userEmail.split("@")[0] : "Jamie Parker"}</strong><small>{userEmail ?? (backendConfigured ? "Sign in to sync" : "Personal account")}</small></span>
              {backendConfigured && userEmail ? <LogOut size={15} className="muted-icon" /> : <MoreHorizontal size={17} className="muted-icon" />}
            </button>
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>My workspace</span><ArrowRight size={14} /><strong>{filter}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." />
              <kbd><Command size={11} /> K</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="Enable reminders" onClick={() => void enableReminders()}><Bell size={17} /><span className="notification-dot" /></button>
            <span className="topbar-divider" />
            <button className="top-avatar" aria-label="Account" onClick={() => backendConfigured ? setAuthOpen(true) : showToast("Your tasks are saved on this device.")}>{initials(userEmail)}</button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> {dateLabel}</div>
              <h1>{greeting}, {userEmail ? userEmail.split("@")[0] : "Jamie"}<span className="greeting-wave">✳</span></h1>
              <p className="welcome-subtitle">A clear mind starts with a clear plan. Let&apos;s make today count.</p>
            </div>
            <button className="primary-button add-task-button" onClick={() => setModalOpen(true)}><Plus size={17} strokeWidth={2.5} /> Add a task</button>
          </section>

          {!backendConfigured && (
            <div className="demo-banner">
              <span className="demo-badge"><Sparkles size={13} /> DEMO MODE</span>
              <span>Your tasks are saved on this device. Set up Supabase to sync across devices.</span>
              <button onClick={() => setAuthOpen(true)}>Set up account <ArrowRight size={13} /></button>
            </div>
          )}

          <section className="overview-grid" aria-label="Today's overview">
            <article className="overview-card progress-card">
              <div className="card-heading"><span>Today&apos;s progress</span><button className="subtle-icon-button" aria-label="Progress details" onClick={() => showToast(`${completedToday} of ${dueTodayCount} tasks complete today.`)}><MoreHorizontal size={18} /></button></div>
              <div className="progress-content">
                <div className="progress-ring" style={{ "--progress": `${completion}%` } as React.CSSProperties}><div className="progress-ring-inner"><span>{completion}<small>%</small></span><i>complete</i></div></div>
                <div className="progress-detail"><strong>{completedToday} <span>of {dueTodayCount} tasks</span></strong><p>{dueTodayCount === 0 ? "A fresh start. Add a task to begin." : todayTasks.length ? "You're making steady progress." : "Everything on your list is done!"}</p><div className="mini-avatars"><span>J</span><span className="avatar-sparkle"><Sparkles size={10} /></span><small>One step at a time</small></div></div>
              </div>
              <div className="progress-footer"><span>Keep your momentum going</span><span className="streak-pill"><Sparkles size={12} /> Nice work</span></div>
            </article>

            <article className="overview-card focus-overview">
              <div className="card-heading"><span>Focus for today</span><span className="today-pill"><span /> TODAY</span></div>
              <div className="focus-number">{todayTasks.length.toString().padStart(2, "0")}<span> tasks to go</span></div>
              <p className="focus-description">{todayTasks.length ? "Small steps make big days. Keep your focus on what matters." : "Your day is clear. Enjoy the breathing room."}</p>
              <div className="focus-meter"><span style={{ width: `${completion}%` }} /></div>
              <div className="focus-ends"><span>Just getting started</span><span>Day complete</span></div>
              <div className="focus-illustration" aria-hidden="true"><div className="sun-disc" /><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit-dot" /></div>
            </article>

            <article className="overview-card quote-card">
              <div className="quote-sparkle"><Sparkles size={17} /></div>
              <p className="quote-label">A GENTLE REMINDER</p>
              <blockquote>You don&apos;t have to see the whole staircase, just take the first step.</blockquote>
              <span className="quote-author">— Martin Luther King Jr.</span>
              <div className="quote-decoration">“</div>
            </article>
          </section>

          <section className="tasks-section">
            <div className="section-header">
              <div><h2>{filter === "Today" ? "Today's tasks" : filter}</h2><p>{filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"} {filter === "Today" ? "on your list" : "found"}</p></div>
              <div className="task-controls">
                <button className="filter-control" onClick={() => setCategoryFilter(categoryFilter === "All" ? "Personal" : "All")}><Tag size={14} /> {categoryFilter === "All" ? "Filter" : categoryFilter}<ChevronDown size={14} /></button>
                <button className="sort-control" onClick={() => setFilter(filter === "Today" ? "Upcoming" : "Today")}><ArrowDown size={14} /> Sort by time</button>
                <button className="view-options" aria-label="Task options" onClick={() => showToast("Tasks are sorted by due time.")}><MoreHorizontal size={18} /></button>
              </div>
            </div>

            <div className="task-list">
              {filteredTasks.map((task) => {
                const due = formatDue(task.due_at);
                const isOverdue = task.due_at && new Date(task.due_at) < new Date() && !task.completed;
                return (
                  <article className={`task-row ${task.completed ? "task-completed" : ""}`} key={task.id}>
                    <button className={`task-check ${task.completed ? "task-check-done" : ""}`} aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} onClick={() => toggleTask(task)}>{task.completed && <Check size={13} strokeWidth={3} />}</button>
                    <div className="task-main"><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}</div>
                    {due && <span className={`task-due ${isOverdue ? "task-overdue" : ""}`}><Clock3 size={13} />{due}</span>}
                    <span className={`task-category cat-${categoryColors[task.category]}`}><span />{task.category}</span>
                    <button className="task-more" aria-label={`Delete ${task.title}`} onClick={() => void deleteTask(task)}><Trash2 size={15} /></button>
                  </article>
                );
              })}
              {filteredTasks.length === 0 && (
                <div className="empty-state"><span className="empty-icon"><CheckCheck size={22} /></span><strong>{filter === "Completed" ? "Nothing completed just yet" : "A little room to breathe"}</strong><p>{filter === "Completed" ? "Check off a task and it will show up here." : "No tasks match this view. Add one whenever you're ready."}</p><button className="text-button" onClick={() => setModalOpen(true)}><Plus size={15} /> Add a task</button></div>
              )}
              {filter === "Today" && filteredTasks.length > 0 && <button className="add-inline-task" onClick={() => setModalOpen(true)}><span><Plus size={15} /></span> Add a task <kbd>⌘ + ↵</kbd></button>}
            </div>
            <div className="list-footer"><span><span className="footer-sparkle">✳</span> You&apos;re doing better than you think.</span><button onClick={() => setFilter("All tasks")}>View all tasks <ArrowRight size={14} /></button></div>
          </section>
          <footer className="page-footer"><span>Made for a more mindful day <span>✳</span></span><button onClick={() => void enableReminders()}><Bell size={13} /> Reminders {typeof Notification !== "undefined" && Notification.permission === "granted" ? "on" : "off"}</button></footer>
        </div>
      </section>

      {mobileMenuOpen && <button aria-label="Close navigation" className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      {toast && <div className="toast-message"><span className="toast-check"><Check size={13} /></span>{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={15} /></button></div>}

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
            <div className="modal-header"><div><span className="modal-kicker"><Sparkles size={13} /> MAKE IT HAPPEN</span><h2 id="task-modal-title">Add a task</h2></div><button className="icon-button" aria-label="Close" onClick={() => setModalOpen(false)}><X size={19} /></button></div>
            <form onSubmit={createTask}>
              <label className="form-label" htmlFor="task-title">What needs to get done?</label>
              <input className="form-input task-title-input" id="task-title" name="title" placeholder="e.g. Prep notes for the team meeting" autoFocus required maxLength={120} />
              <label className="form-label" htmlFor="task-description">A few details <span>OPTIONAL</span></label>
              <textarea className="form-input form-textarea" id="task-description" name="description" placeholder="Add a note or a little context…" rows={3} maxLength={500} />
              <div className="form-row">
                <label className="form-field"><span className="form-label">List</span><span className="select-wrap"><Tag size={14} /><select name="category" defaultValue="Personal">{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></span></label>
                <label className="form-field"><span className="form-label">Reminder <span>OPTIONAL</span></span><span className="date-input-wrap"><Clock3 size={14} /><input type="datetime-local" name="due_at" min={localDateTimeValue(new Date())} /></span></label>
              </div>
              <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> Create task</button></div>
            </form>
            <p className="modal-footnote"><Bell size={12} /> Turn on browser notifications to get reminded on time.</p>
          </section>
        </div>
      )}

      {authOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="icon-button auth-close" aria-label="Close" onClick={() => setAuthOpen(false)}><X size={19} /></button>
            <a className="brand auth-brand" href="#"><span className="brand-mark"><Check size={17} strokeWidth={2.8} /></span><span>daymark<span className="brand-period">.</span></span></a>
            <span className="auth-icon"><Sparkles size={20} /></span>
            <h2 id="auth-title">{authMode === "signin" ? "Welcome back" : "Make space for your best days"}</h2>
            <p>{authMode === "signin" ? "Sign in to pick up right where you left off." : "Create your account and keep your day in sync."}</p>
            {!backendConfigured ? (
              <div className="setup-notice"><Settings2 size={17} /><div><strong>Connect your Supabase project</strong><span>Add the Supabase URL and anon key to <code>.env.local</code>, then restart the app. Follow the setup guide to create your task table.</span></div></div>
            ) : (
              <form className="auth-form" onSubmit={(event) => void submitAuth(event)}>
                <label className="form-label" htmlFor="auth-email">Email address</label>
                <input className="form-input" id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
                <label className="form-label" htmlFor="auth-password">Password</label>
                <input className="form-input" id="auth-password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={6} placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} required />
                {message && <div className="auth-message" role="status">{message}</div>}
                <button type="submit" className="primary-button auth-submit" disabled={busy}>{busy ? "One moment…" : authMode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={16} /></button>
                <div className="auth-divider"><span>or continue with</span></div>
                <button type="button" className="google-button" disabled={busy} onClick={() => void signInWithGoogle()}>
                  <svg aria-hidden="true" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.93c-.58 2.96-2.26 5.48-4.75 7.18l7.72 5.99c4.51-4.16 7.08-10.29 7.08-17.64Z" /><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.81l-7.72-5.99c-2.14 1.45-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)" /></svg>
                  Continue with Google
                </button>
              </form>
            )}
            <div className="auth-switch">{backendConfigured ? authMode === "signin" ? <>New to Daymark? <button onClick={() => { setAuthMode("signup"); setMessage(""); }}>Create an account</button></> : <>Already have an account? <button onClick={() => { setAuthMode("signin"); setMessage(""); }}>Sign in</button></> : <button onClick={() => setAuthOpen(false)}><ArrowLeft size={14} /> Back to your demo</button>}</div>
            {backendConfigured && <div className="auth-security"><span><Check size={12} /> Private by design</span><span><Check size={12} /> Secure sign-in</span></div>}
          </section>
        </div>
      )}
    </main>
  );
}
