import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BadgeCheck,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listAllOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  toggleOpportunityField,
  checkIsAdmin,
} from "@/lib/admin.functions";
import {
  OpportunityForm,
  opportunityToForm,
  type OpportunityFormData,
} from "@/components/admin/opportunity-form";
import {
  CATEGORIES,
  deadlineLabel,
  isClosingSoon,
  type Opportunity,
} from "@/lib/opportunities";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminPage,
});

function AdminPage() {
  const checkAdminFn = useServerFn(checkIsAdmin);
  const listAllFn = useServerFn(listAllOpportunities);
  const createFn = useServerFn(createOpportunity);
  const updateFn = useServerFn(updateOpportunity);
  const deleteFn = useServerFn(deleteOpportunity);
  const toggleFn = useServerFn(toggleOpportunityField);
  const qc = useQueryClient();

  const adminCheckQ = useQuery({
    queryKey: ["isAdmin"],
    queryFn: () => checkAdminFn(),
  });

  const oppsQ = useQuery<Opportunity[]>({
    queryKey: ["admin-opportunities"],
    queryFn: () => listAllFn(),
    enabled: adminCheckQ.data?.is_admin === true,
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const allOpps = oppsQ.data ?? [];

  const stats = useMemo(() => {
    const active = allOpps.filter((o) => o.is_active);
    return {
      total: allOpps.length,
      active: active.length,
      verified: allOpps.filter((o) => o.is_verified).length,
      featured: allOpps.filter((o) => o.featured).length,
      archived: allOpps.filter((o) => !o.is_active).length,
      closingSoon: active.filter((o) => isClosingSoon(o.deadline)).length,
    };
  }, [allOpps]);

  const filtered = useMemo(() => {
    return allOpps
      .filter((o) => (categoryFilter === "All" ? true : o.category === categoryFilter))
      .filter((o) => {
        if (statusFilter === "active") return o.is_active;
        if (statusFilter === "archived") return !o.is_active;
        return true;
      })
      .filter((o) => {
        if (verifiedFilter === "verified") return o.is_verified;
        if (verifiedFilter === "unverified") return !o.is_verified;
        return true;
      })
      .filter((o) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          o.title.toLowerCase().includes(q) ||
          o.organisation.toLowerCase().includes(q)
        );
      });
  }, [allOpps, categoryFilter, statusFilter, verifiedFilter, search]);

  const editingOpp = editingId ? allOpps.find((o) => o.id === editingId) : null;

  function openCreate() {
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(opp: Opportunity) {
    setEditingId(opp.id);
    setDialogOpen(true);
  }

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["admin-opportunities"] });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  }

  async function handleSubmit(data: OpportunityFormData) {
    setFormSubmitting(true);
    try {
      if (editingId) {
        await updateFn({ data: { id: editingId, ...data } });
        toast.success("Opportunity updated");
      } else {
        await createFn({ data });
        toast.success("Opportunity created");
      }
      invalidateAll();
      setDialogOpen(false);
      setEditingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteFn({ data: { id: deleteTarget.id } });
      invalidateAll();
      toast.success("Opportunity deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleToggle(
    opp: Opportunity,
    field: "is_verified" | "is_active" | "featured",
    value: boolean,
  ) {
    try {
      await toggleFn({ data: { id: opp.id, field, value } });
      invalidateAll();
      const labels = {
        is_verified: value ? "verified" : "unverified",
        is_active: value ? "activated" : "archived",
        featured: value ? "featured" : "unfeatured",
      };
      toast.success(`Opportunity ${labels[field]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (adminCheckQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="skeleton-shimmer h-32 w-64 rounded-2xl" />
      </div>
    );
  }

  if (adminCheckQ.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Error checking admin status</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {adminCheckQ.error instanceof Error ? adminCheckQ.error.message : "Unknown error"}
          </p>
          <button
            onClick={() => adminCheckQ.refetch()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!adminCheckQ.data?.is_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need admin access to manage opportunities. Contact the project owner
            if you believe this is an error.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-sidebar-primary">
              Admin
            </p>
            <h1 className="mt-1 font-display text-2xl text-sidebar-foreground">
              Opportunity Management
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground sm:flex"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
            </Link>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-full bg-sidebar-primary px-4 py-2.5 text-sm font-semibold text-sidebar-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" aria-hidden /> New opportunity
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={TrendingUp} label="Total" value={stats.total} tone="default" />
          <StatCard icon={CheckCircle2} label="Active" value={stats.active} tone="green" />
          <StatCard icon={BadgeCheck} label="Verified" value={stats.verified} tone="blue" />
          <StatCard icon={Star} label="Featured" value={stats.featured} tone="gold" />
          <StatCard icon={XCircle} label="Archived" value={stats.archived} tone="muted" />
          <StatCard icon={Clock} label="Closing soon" value={stats.closingSoon} tone="red" />
        </div>

        <div className="mt-6 surface grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <label className="relative min-w-0">
            <span className="sr-only">Search opportunities</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or organisation"
              className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-green"
            />
          </label>
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={["All", ...CATEGORIES]}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as "all" | "active" | "archived")}
            options={["all", "active", "archived"]}
            display={{ all: "All", active: "Active", archived: "Archived" }}
          />
          <FilterSelect
            label="Verified"
            value={verifiedFilter}
            onChange={(v) => setVerifiedFilter(v as "all" | "verified" | "unverified")}
            options={["all", "verified", "unverified"]}
            display={{ all: "All", verified: "Verified", unverified: "Unverified" }}
          />
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {oppsQ.isLoading ? "Loading…" : `${filtered.length} opportunities`}
        </p>

        <div className="mt-4 overflow-x-auto surface rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Category</th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">State</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Deadline</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {oppsQ.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Loading opportunities…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No opportunities match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((opp) => (
                  <tr
                    key={opp.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-green-soft/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-green-soft text-xs font-bold text-green">
                          {opp.logo_text ?? opp.organisation.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {opp.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {opp.organisation}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="rounded-full bg-green-soft px-2.5 py-1 text-[11px] font-semibold text-green">
                        {opp.category}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {opp.state ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span
                        className={
                          isClosingSoon(opp.deadline)
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {deadlineLabel(opp.deadline)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge
                          active={opp.is_active}
                          activeLabel="Active"
                          inactiveLabel="Archived"
                        />
                        {opp.is_verified && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info">
                            <BadgeCheck className="h-3 w-3" aria-hidden /> Verified
                          </span>
                        )}
                        {opp.featured && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                            <Star className="h-3 w-3" aria-hidden /> Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn
                          onClick={() => openEdit(opp)}
                          title="Edit"
                          tone="default"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </IconBtn>
                        <IconBtn
                          onClick={() => handleToggle(opp, "is_verified", !opp.is_verified)}
                          title={opp.is_verified ? "Unverify" : "Verify"}
                          tone={opp.is_verified ? "blue" : "default"}
                        >
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        </IconBtn>
                        <IconBtn
                          onClick={() => handleToggle(opp, "featured", !opp.featured)}
                          title={opp.featured ? "Unfeature" : "Feature"}
                          tone={opp.featured ? "gold" : "default"}
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden />
                        </IconBtn>
                        <IconBtn
                          onClick={() => handleToggle(opp, "is_active", !opp.is_active)}
                          title={opp.is_active ? "Archive" : "Activate"}
                          tone="default"
                        >
                          {opp.is_active ? (
                            <Archive className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </IconBtn>
                        <IconBtn
                          onClick={() => setDeleteTarget(opp)}
                          title="Delete"
                          tone="red"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit opportunity" : "Create new opportunity"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the opportunity details below."
                : "Fill in the details below to add a new opportunity to the catalogue."}
            </DialogDescription>
          </DialogHeader>
          <OpportunityForm
            mode={editingId ? "edit" : "create"}
            initial={editingOpp ? opportunityToForm(editingOpp) : undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditingId(null);
            }}
            submitting={formSubmitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title} — this action cannot be undone. The opportunity
              will be permanently removed from the catalogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  tone: "default" | "green" | "blue" | "gold" | "muted" | "red";
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    green: "text-green",
    blue: "text-info",
    gold: "text-gold",
    muted: "text-muted-foreground",
    red: "text-destructive",
  };
  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tones[tone]}`} aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={`mt-2 text-2xl font-black ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return active ? (
    <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-semibold text-green">
      {activeLabel}
    </span>
  ) : (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      {inactiveLabel}
    </span>
  );
}

function IconBtn({
  onClick,
  title,
  tone,
  children,
}: {
  onClick: () => void;
  title: string;
  tone: "default" | "blue" | "gold" | "red";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    default: "text-muted-foreground hover:text-foreground hover:border-green",
    blue: "text-info border-info/30 hover:border-info",
    gold: "text-gold border-gold/30 hover:border-gold",
    red: "text-destructive hover:border-destructive",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-border bg-background transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  display,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  display?: Record<string, string>;
}) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-green md:w-40"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {display?.[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}
