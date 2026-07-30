import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact CommunityConnect AI" },
      {
        name: "description",
        content:
          "Reach the CommunityConnect AI team with partnership requests, opportunity submissions, feedback or support questions.",
      },
      { property: "og:title", content: "Contact CommunityConnect AI" },
      {
        property: "og:description",
        content: "Partnerships, opportunity submissions, feedback and support.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
    toast.success("Message noted — we'll get back to you by email.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:px-6">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">Talk to the team</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Submitting an opportunity, partnering with us, or stuck somewhere in the product? Send a
          note.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <form onSubmit={onSubmit} className="surface grid gap-4 rounded-3xl p-6">
            <Field label="Your name" name="name" />
            <Field label="Email address" name="email" type="email" />
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-foreground">Message</span>
              <textarea
                required
                rows={6}
                name="message"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-green"
                placeholder="Tell us what you need"
              />
            </label>
            <button
              type="submit"
              className="justify-self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              {sent ? "Message sent" : "Send message"}
            </button>
          </form>

          <aside className="grid content-start gap-4">
            {[
              { icon: Mail, title: "Email", body: "hello@communityconnect.ai" },
              { icon: MessageSquare, title: "Support", body: "Ask the AI assistant first — it answers most product questions instantly." },
              { icon: MapPin, title: "Based in", body: "Lagos, Nigeria — serving all 36 states and the FCT." },
            ].map((item) => (
              <div key={item.title} className="surface rounded-2xl p-5">
                <item.icon className="h-5 w-5 text-green" aria-hidden />
                <h2 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        required
        name={name}
        type={type}
        className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-green"
      />
    </label>
  );
}
