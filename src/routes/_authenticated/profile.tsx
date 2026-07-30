import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOCATIONS = [
  "Lagos",
  "Abuja",
  "Rivers",
  "Kano",
  "Oyo",
  "Kaduna",
  "Enugu",
  "Other",
];

const EDUCATION_LEVELS = [
  "Secondary school",
  "University/College",
  "Postgraduate",
  "Vocational training",
  "Professional certification",
  "Other",
];

const SECTORS = [
  "Education",
  "Health",
  "Agriculture",
  "Jobs",
  "Grants",
  "Loans",
  "Technology",
];

export const Route = createFileRoute("/_authenticated/profile")({
  ssr: false,
  component: ProfilePage,
});

type ProfileData = {
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  education_level: string | null;
  sector_interests: string[] | null;
};

function ProfilePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [location, setLocation] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [sectorInterests, setSectorInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completedFields = useMemo(() => {
    return [
      displayName.trim(),
      avatarUrl.trim(),
      location.trim(),
      educationLevel.trim(),
      sectorInterests.length ? "ok" : "",
    ].filter(Boolean).length;
  }, [displayName, avatarUrl, location, educationLevel, sectorInterests]);

  const completion = Math.round((completedFields / 5) * 100);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name,avatar_url,location,education_level,sector_interests")
        .eq("id", user.id)
        .maybeSingle<ProfileData>();

      if (profileError) {
        setError(profileError.message);
      } else {
        setDisplayName(data?.display_name ?? (user.user_metadata as any)?.full_name ?? "");
        setAvatarUrl(data?.avatar_url ?? "");
        setLocation(data?.location ?? "");
        setEducationLevel(data?.education_level ?? "");
        setSectorInterests(data?.sector_interests ?? []);
      }
      setLoading(false);
    };

    load();
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setError("You must be signed in to save your profile.");
      setSaving(false);
      return;
    }

    const { error: saveError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: displayName || null,
          avatar_url: avatarUrl || null,
          location: location || null,
          education_level: educationLevel || null,
          sector_interests: sectorInterests.length ? sectorInterests : null,
          updated_at: new Date().toISOString(),
        });

    if (saveError) {
      setError(saveError.message);
    } else {
      setMessage("Profile saved.");
    }
    setSaving(false);
  }

  function toggleSector(value: string) {
    setSectorInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wider text-green">Profile</p>
            <h1 className="mt-2 text-3xl font-semibold">Edit your profile</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Save your preferences to make CommunityConnect AI recommendations more relevant.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-accent/10"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-8 rounded-3xl border border-border/80 bg-surface p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Profile completion</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Complete these details to unlock better recommendations.
                  </p>
                </div>
                <div className="text-right text-sm font-semibold text-foreground">{completion}%</div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-green" style={{ width: `${completion}%` }} />
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Display name</label>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.currentTarget.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-green"
                  type="text"
                  placeholder="Chidi Okafor"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Avatar URL</label>
                <input
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.currentTarget.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-green"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Optional. Use an image URL if you want a custom avatar.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Location</label>
                  <select
                    value={location}
                    onChange={(event) => setLocation(event.currentTarget.value)}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-green"
                  >
                    <option value="">Choose your location</option>
                    {LOCATIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Education level</label>
                  <select
                    value={educationLevel}
                    onChange={(event) => setEducationLevel(event.currentTarget.value)}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-green"
                  >
                    <option value="">Choose your education level</option>
                    {EDUCATION_LEVELS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">Sector interests</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SECTORS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleSector(item)}
                      className={`rounded-2xl border px-4 py-3 text-sm text-left transition ${
                        sectorInterests.includes(item)
                          ? "border-green bg-green/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-green/80"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-muted-foreground">Loading profile…</div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-2xl border border-green/20 bg-green/5 px-4 py-3 text-sm text-green-foreground">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 text-sm font-semibold text-foreground">Profile tips</div>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Completing your profile helps the AI choose better opportunities that fit your location, education, and interests.
              </p>
              <p>
                Add at least one sector interest and your education level to see recommended opportunities on the dashboard.
              </p>
              <p>
                Your avatar is optional, but it makes the experience feel more personal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
