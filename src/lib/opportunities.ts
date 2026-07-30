export type Opportunity = {
  id: string;
  title: string;
  organisation: string;
  logo_text: string | null;
  category: string;
  industry: string | null;
  summary: string;
  location: string;
  state: string | null;
  work_mode: string;
  is_paid: boolean;
  compensation: string | null;
  experience_levels: string[];
  skills: string[];
  deadline: string | null;
  apply_url: string | null;
  featured: boolean;
  created_at: string;
};

export type CareerProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  state: string | null;
  education_level: string | null;
  field_of_study: string | null;
  current_status: string | null;
  skills: string[];
  preferred_industries: string[];
  opportunity_interests: string[];
  career_goal: string | null;
  work_preference: string | null;
  onboarding_completed: boolean;
};

export const CATEGORIES = [
  "Job",
  "Internship",
  "SIWES / IT Placement",
  "Graduate Trainee",
  "NYSC Opportunity",
  "Scholarship",
  "Grant",
  "Tech Bootcamp",
  "Government Programme",
  "Innovation Competition",
] as const;

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara", "Nationwide",
];

export const STATUSES = [
  { value: "student", label: "Student" },
  { value: "graduate", label: "Fresh graduate" },
  { value: "nysc", label: "NYSC member" },
  { value: "professional", label: "Early-career professional" },
];

export const EDUCATION_LEVELS = [
  "Secondary school",
  "OND / NCE",
  "HND",
  "Undergraduate",
  "Bachelor's degree",
  "Master's degree",
  "PhD",
];

export const INDUSTRIES = [
  "Technology", "Fintech", "Banking", "Education", "Health", "Agriculture",
  "Energy", "Manufacturing", "Telecommunications", "Public Sector",
  "Professional Services", "Entrepreneurship",
];

export const SKILL_LIBRARY = [
  "HTML", "CSS", "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java",
  "SQL", "Git", "API Integration", "Excel", "Data Visualisation", "Figma",
  "UI Design", "User Research", "Prototyping", "Accounting", "IFRS", "Research",
  "Academic Writing", "Communication", "Teamwork", "Leadership", "Teaching",
  "Customer Service", "Sales", "Writing", "Networking", "Linux",
  "Security Fundamentals", "Product Thinking", "Analytics", "Business Planning",
  "Pitching", "Digital Literacy", "Problem Solving", "Attention to Detail",
];

export const LEARNING_LINKS: Record<string, string> = {
  HTML: "https://developer.mozilla.org/en-US/docs/Learn/HTML",
  CSS: "https://web.dev/learn/css",
  JavaScript: "https://javascript.info",
  TypeScript: "https://www.typescriptlang.org/docs/handbook/intro.html",
  React: "https://react.dev/learn",
  "Node.js": "https://nodejs.org/en/learn",
  Python: "https://www.freecodecamp.org/learn/scientific-computing-with-python/",
  SQL: "https://sqlbolt.com",
  Git: "https://learngitbranching.js.org",
  "API Integration": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs",
  Figma: "https://help.figma.com/hc/en-us/categories/360002051613",
  Excel: "https://support.microsoft.com/en-us/excel",
  Analytics: "https://skillshop.withgoogle.com",
  "Digital Literacy": "https://3mtt.nitda.gov.ng",
};

export type MatchReason = { label: string; kind: "skill" | "location" | "status" | "deadline" | "industry" | "interest" | "mode" };

export type MatchResult = {
  score: number;
  reasons: MatchReason[];
  matchedSkills: string[];
  missingSkills: string[];
};

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function deadlineLabel(date: string | null): string {
  const days = daysUntil(date);
  if (days === null) return "Rolling deadline";
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 7) return `Closes in ${days} days`;
  return `Closes ${new Date(date as string).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`;
}

export function isClosingSoon(date: string | null): boolean {
  const days = daysUntil(date);
  return days !== null && days >= 0 && days <= 14;
}

/**
 * Deterministic, explainable match score. Every point added also produces a
 * human-readable reason shown on the card as "Why we recommended this".
 */
export function scoreOpportunity(
  opportunity: Opportunity,
  profile: CareerProfile | null,
): MatchResult {
  const oppSkills = opportunity.skills ?? [];
  const userSkills = (profile?.skills ?? []).map((s) => s.toLowerCase());
  const matchedSkills = oppSkills.filter((s) => userSkills.includes(s.toLowerCase()));
  const missingSkills = oppSkills.filter((s) => !userSkills.includes(s.toLowerCase()));

  if (!profile) {
    const base = opportunity.featured ? 74 : 68;
    return {
      score: base,
      reasons: [
        { label: "Popular with Nigerian students and graduates", kind: "interest" },
        ...(isClosingSoon(opportunity.deadline)
          ? [{ label: "Deadline approaching", kind: "deadline" as const }]
          : []),
      ],
      matchedSkills,
      missingSkills,
    };
  }

  let score = 46;
  const reasons: MatchReason[] = [];

  if (oppSkills.length && matchedSkills.length) {
    const ratio = matchedSkills.length / oppSkills.length;
    score += Math.round(ratio * 24);
    reasons.push({
      label:
        ratio >= 0.6
          ? `Matches your skills (${matchedSkills.slice(0, 3).join(", ")})`
          : `Uses skills you already have (${matchedSkills.slice(0, 2).join(", ")})`,
      kind: "skill",
    });
  }

  const userState = (profile.state ?? profile.location ?? "").toLowerCase();
  if (userState && opportunity.state) {
    if (opportunity.state.toLowerCase() === userState) {
      score += 12;
      reasons.push({ label: `Located in ${opportunity.state}, your preferred area`, kind: "location" });
    } else if (opportunity.state.toLowerCase() === "nationwide") {
      score += 7;
      reasons.push({ label: "Open to applicants nationwide", kind: "location" });
    }
  }

  if (opportunity.work_mode === "remote" && (profile.work_preference === "remote" || !profile.work_preference)) {
    score += 6;
    reasons.push({ label: "Remote — work from anywhere in Nigeria", kind: "mode" });
  } else if (opportunity.work_mode === profile.work_preference) {
    score += 5;
    reasons.push({ label: `${opportunity.work_mode === "hybrid" ? "Hybrid" : "On-site"} setup you asked for`, kind: "mode" });
  }

  if (profile.current_status && opportunity.experience_levels.includes(profile.current_status)) {
    score += 12;
    const label = STATUSES.find((s) => s.value === profile.current_status)?.label ?? profile.current_status;
    reasons.push({ label: `Suitable for ${label.toLowerCase()}s`, kind: "status" });
  }

  if (opportunity.industry && profile.preferred_industries.includes(opportunity.industry)) {
    score += 8;
    reasons.push({ label: `In ${opportunity.industry}, one of your target industries`, kind: "industry" });
  }

  if (profile.opportunity_interests.includes(opportunity.category)) {
    score += 9;
    reasons.push({ label: `You asked for ${opportunity.category.toLowerCase()} opportunities`, kind: "interest" });
  }

  if (isClosingSoon(opportunity.deadline)) {
    score += 3;
    reasons.push({ label: "Deadline approaching — apply this week", kind: "deadline" });
  }

  if (opportunity.featured) score += 2;
  if (!reasons.length) {
    reasons.push({ label: "Broadens your options beyond your current filters", kind: "interest" });
  }
  if (matchedSkills.length && missingSkills.length === 0) {
    reasons.push({ label: "High success probability — you meet every listed skill", kind: "skill" });
  }

  return { score: Math.max(38, Math.min(99, score)), reasons, matchedSkills, missingSkills };
}

export function profileStrength(profile: CareerProfile | null): { percent: number; missing: string[] } {
  if (!profile) return { percent: 0, missing: ["Create your profile"] };
  const checks: Array<[boolean, string]> = [
    [!!profile.display_name, "Add your name"],
    [!!profile.current_status, "Set your current status"],
    [!!profile.education_level, "Add your education level"],
    [!!profile.field_of_study, "Add your field of study"],
    [!!(profile.state ?? profile.location), "Add your preferred location"],
    [profile.skills.length >= 3, "List at least 3 skills"],
    [profile.preferred_industries.length > 0, "Pick target industries"],
    [profile.opportunity_interests.length > 0, "Pick opportunity types"],
    [!!profile.career_goal, "Describe your career goal"],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(([ok]) => !ok).map(([, label]) => label),
  };
}

export const LOADING_MESSAGES = [
  "Analysing your profile…",
  "Finding matching opportunities…",
  "Checking deadlines…",
  "Comparing required skills…",
  "Preparing personalised recommendations…",
];

export const APPLICATION_STATUSES = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["value"];
