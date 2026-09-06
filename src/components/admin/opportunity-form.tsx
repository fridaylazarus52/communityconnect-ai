import { useState, type KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import {
  CATEGORIES,
  INDUSTRIES,
  NIGERIAN_STATES,
  SKILL_LIBRARY,
  STATUSES,
  type Opportunity,
} from "@/lib/opportunities";

export type OpportunityFormData = {
  title: string;
  organisation: string;
  logo_text: string;
  category: string;
  industry: string;
  summary: string;
  location: string;
  state: string;
  work_mode: string;
  is_paid: boolean;
  compensation: string;
  experience_levels: string[];
  skills: string[];
  deadline: string;
  apply_url: string;
  source_url: string;
  eligibility: string;
  featured: boolean;
  is_verified: boolean;
  is_active: boolean;
};

const EMPTY_FORM: OpportunityFormData = {
  title: "",
  organisation: "",
  logo_text: "",
  category: "Job",
  industry: "",
  summary: "",
  location: "Nationwide",
  state: "Nationwide",
  work_mode: "onsite",
  is_paid: true,
  compensation: "",
  experience_levels: [],
  skills: [],
  deadline: "",
  apply_url: "",
  source_url: "",
  eligibility: "",
  featured: false,
  is_verified: false,
  is_active: true,
};

export function opportunityToForm(o: Opportunity): OpportunityFormData {
  return {
    title: o.title,
    organisation: o.organisation,
    logo_text: o.logo_text ?? "",
    category: o.category,
    industry: o.industry ?? "",
    summary: o.summary,
    location: o.location,
    state: o.state ?? "",
    work_mode: o.work_mode,
    is_paid: o.is_paid,
    compensation: o.compensation ?? "",
    experience_levels: o.experience_levels,
    skills: o.skills,
    deadline: o.deadline ?? "",
    apply_url: o.apply_url ?? "",
    source_url: o.source_url ?? "",
    eligibility: o.eligibility ?? "",
    featured: o.featured,
    is_verified: o.is_verified,
    is_active: o.is_active,
  };
}

const WORK_MODES = ["onsite", "remote", "hybrid"] as const;

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-green";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function OpportunityForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  mode,
}: {
  initial?: OpportunityFormData;
  onSubmit: (data: OpportunityFormData) => void;
  onCancel: () => void;
  submitting: boolean;
  mode: "create" | "edit";
}) {
  const [form, setForm] = useState<OpportunityFormData>(initial ?? EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");

  function set<K extends keyof OpportunityFormData>(
    key: K,
    value: OpportunityFormData[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleExperienceLevel(value: string) {
    setForm((f) => ({
      ...f,
      experience_levels: f.experience_levels.includes(value)
        ? f.experience_levels.filter((v) => v !== value)
        : [...f.experience_levels, value],
    }));
  }

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (!trimmed) return;
    setForm((f) =>
      f.skills.includes(trimmed)
        ? f
        : { ...f, skills: [...f.skills, trimmed] },
    );
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  }

  function onSkillKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    }
    if (e.key === "Backspace" && !skillInput && form.skills.length > 0) {
      removeSkill(form.skills[form.skills.length - 1]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const skillSuggestions = SKILL_LIBRARY.filter(
    (s) => !form.skills.includes(s),
  ).slice(0, 12);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Graduate Trainee Programme"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Organisation</label>
          <input
            className={inputClass}
            value={form.organisation}
            onChange={(e) => set("organisation", e.target.value)}
            placeholder="e.g. Dangote Group"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Category</label>
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Industry</label>
          <select
            className={inputClass}
            value={form.industry}
            onChange={(e) => set("industry", e.target.value)}
          >
            <option value="">—</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Logo text (2 chars)</label>
          <input
            className={inputClass}
            value={form.logo_text}
            onChange={(e) => set("logo_text", e.target.value.slice(0, 3))}
            placeholder="e.g. DG"
            maxLength={3}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Summary</label>
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={form.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="Short description of the opportunity"
          required
        />
      </div>

      <div>
        <label className={labelClass}>Eligibility</label>
        <textarea
          className={`${inputClass} min-h-[60px] resize-y`}
          value={form.eligibility}
          onChange={(e) => set("eligibility", e.target.value)}
          placeholder="Who qualifies? e.g. 300-level students in accredited universities"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Location</label>
          <input
            className={inputClass}
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Lagos"
            required
          />
        </div>
        <div>
          <label className={labelClass}>State</label>
          <select
            className={inputClass}
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
          >
            <option value="">—</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Work mode</label>
          <select
            className={inputClass}
            value={form.work_mode}
            onChange={(e) => set("work_mode", e.target.value)}
          >
            {WORK_MODES.map((w) => (
              <option key={w} value={w}>
                {w.charAt(0).toUpperCase() + w.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Deadline</label>
          <input
            type="date"
            className={inputClass}
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Compensation</label>
          <input
            className={inputClass}
            value={form.compensation}
            onChange={(e) => set("compensation", e.target.value)}
            placeholder="e.g. ₦350,000 monthly"
          />
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2.5 pb-2.5">
            <input
              type="checkbox"
              checked={form.is_paid}
              onChange={(e) => set("is_paid", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-green"
            />
            <span className="text-sm text-foreground">Paid opportunity</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Apply URL</label>
          <input
            className={inputClass}
            value={form.apply_url}
            onChange={(e) => set("apply_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className={labelClass}>Source URL</label>
          <input
            className={inputClass}
            value={form.source_url}
            onChange={(e) => set("source_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Experience levels</label>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleExperienceLevel(s.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                form.experience_levels.includes(s.value)
                  ? "border-green bg-green/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-green/60"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Skills</label>
        <div className="rounded-xl border border-border bg-background p-2">
          {form.skills.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {form.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2.5 py-1 text-xs font-medium text-green"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="text-green/60 hover:text-green"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            className="w-full bg-transparent px-1 py-1 text-sm outline-none"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={onSkillKeyDown}
            placeholder="Type a skill and press Enter"
          />
        </div>
        {skillSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skillSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addSkill(s)}
                className="inline-flex items-center gap-0.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-green hover:text-green"
              >
                <Plus className="h-2.5 w-2.5" aria-hidden />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-5 rounded-xl border border-border bg-card p-4">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-green"
          />
          <span className="text-sm text-foreground">Featured</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.is_verified}
            onChange={(e) => set("is_verified", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-green"
          />
          <span className="text-sm text-foreground">Verified</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-green"
          />
          <span className="text-sm text-foreground">Active (visible publicly)</span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/10"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create opportunity"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
