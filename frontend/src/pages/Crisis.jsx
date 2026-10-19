
import { Link } from "react-router";
import {
  Phone,
  Globe,
  Heart,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

const resources = [
  {
    name: "Tele-MANAS (India)",
    description:
      "Government of India helpline providing free, confidential mental health support and guidance.",
    contact: "14416 / 1800-891-4416",
    type: "phone",
    availability: "24/7",
    url: "https://dghs.mohfw.gov.in/national-mental-health-programme.php",
  },
  {
    name: "Emergency Services (India)",
    description:
      "Contact emergency services if you or someone else is in immediate danger or needs urgent assistance.",
    contact: "112",
    type: "phone",
    availability: "Emergency assistance",
    url: "https://112.gov.in/",
  },
  {
    name: "Maharashtra Health Helpline",
    description:
      "Maharashtra Public Health Department helpline for health advice and mental health counselling.",
    contact: "104",
    type: "phone",
    availability: "Check official service hours",
    url: "https://phd.maharashtra.gov.in/en/helpline/",
  },
  {
    name: "International Crisis Support Directory",
    description:
      "Find crisis centres and mental health support organisations in different countries.",
    contact: "Find support worldwide",
    type: "web",
    availability: "Online directory",
    url: "https://www.iasp.info/resources/Crisis_Centres/",
  },
];

export default function Crisis() {
  return (
    <main className="min-h-screen bg-background">
      {/* Page heading */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-6 w-6 text-primary" />
          </div>

          <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            You're not alone
          </h1>

          <p className="max-w-2xl text-muted-foreground">
            If you're going through a difficult time, support is available.
            Reach out to someone you trust or contact one of the services below.
          </p>
        </div>
      </section>

      {/* Emergency notice */}
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <Phone className="mt-1 h-5 w-5 shrink-0 text-destructive" />

            <div>
              <h2 className="mb-2 font-semibold">
                Need immediate help?
              </h2>

              <p className="text-sm text-muted-foreground">
                If you or someone else is in immediate danger, call{" "}
                <strong>112 (India)</strong>. For mental health support, call{" "}
                <strong>Tele-MANAS at 14416</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Helpline cards */}
      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className="mb-2 text-2xl font-semibold">
          Mental health resources in India
        </h2>

        <p className="mb-6 text-sm text-muted-foreground">
          Choose a resource below and visit its official website for further
          information.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((resource) => (
            <article
              key={resource.name}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  {resource.type === "web" ? (
                    <Globe className="h-5 w-5 text-primary" />
                  ) : (
                    <Phone className="h-5 w-5 text-primary" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{resource.name}</h3>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {resource.availability}
                  </p>
                </div>
              </div>

              <p className="mb-4 flex-1 text-sm text-muted-foreground">
                {resource.description}
              </p>

              <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm font-medium">
                {resource.contact}
              </div>

              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Visit website
                <ExternalLink className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* Therapify support options */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <Heart className="mb-3 h-6 w-6 text-primary" />

            <h3 className="mb-2 font-semibold">
              Talk to Therapify
            </h3>

            <p className="mb-4 text-sm text-muted-foreground">
              Explore your feelings and general coping strategies with the
              mental wellness assistant.
            </p>

            <Link
              to="/chat"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Open AI assistant
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <Heart className="mb-3 h-6 w-6 text-primary" />

            <h3 className="mb-2 font-semibold">
              Try a grounding exercise
            </h3>

            <p className="mb-4 text-sm text-muted-foreground">
              Pause for a moment, notice your surroundings, and focus on your
              breathing.
            </p>

            <Link
              to="/self-care"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Explore self-care
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        Therapify is not an emergency or crisis service and does not replace
        professional care. In an emergency in India, call 112.
      </footer>
    </main>
  );
}
