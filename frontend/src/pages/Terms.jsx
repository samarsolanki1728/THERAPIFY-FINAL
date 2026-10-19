import { Link } from "react-router";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const sections = [
{ title: "Acceptance", body: "By creating a Therapify account, you agree to these Terms of Service. If you don't agree, please don't use the service. We may update these terms from time to time and will notify you of material changes." },
{ title: "Not a medical service", body: "Therapify is a self-help wellness tool, not a medical or psychiatric service. The AI is not a licensed therapist, psychologist, or counsellor. Nothing in the app constitutes medical advice, diagnosis, or treatment. If you are in crisis or need clinical care, please contact a qualified professional or emergency services." },
{ title: "Eligibility", body: "You must be 16 years or older to use Therapify. If you are between 16 and 18, you confirm you have parental or guardian consent." },
{ title: "Account responsibility", body: "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately at support@therapify.app if you suspect unauthorised access." },
{ title: "Acceptable use", body: "You agree not to use Therapify to harass, impersonate, or harm others; to reverse-engineer the service; to scrape or extract data; or to use the service for any commercial purpose without our written permission." },
{ title: "Content ownership", body: "You own everything you create in Therapify — journal entries, mood logs, and chat messages. By using the service, you grant us a limited, non-exclusive licence to process and store that content solely to provide the service." },
{ title: "Limitation of liability", body: "To the maximum extent permitted by law, Therapify is provided 'as is'. We are not liable for indirect, incidental, or consequential damages arising from your use of the service." },
{ title: "Termination", body: "Either party may terminate at any time. On termination, your personal data will be deleted within 30 days in accordance with our Privacy Policy." }];


export default function Terms() {
  return (/*#__PURE__*/
    _jsx("div", { className: "min-h-screen pt-24 pb-16 px-6", children: /*#__PURE__*/
      _jsxs("div", { className: "max-w-3xl mx-auto", children: [/*#__PURE__*/
        _jsxs("div", { className: "mb-12", children: [/*#__PURE__*/
          _jsx("span", { className: "text-xs font-medium text-primary uppercase tracking-widest", children: "Legal" }), /*#__PURE__*/
          _jsx("h1", { className: "font-display text-4xl font-medium text-foreground mt-3 mb-3", children: "Terms of Service" }), /*#__PURE__*/
          _jsx("p", { className: "text-muted-foreground text-sm", children: "Last updated: August 1, 2026" }), /*#__PURE__*/
          _jsx("div", { className: "mt-5 p-4 bg-destructive/10 rounded-xl border border-destructive/20", children: /*#__PURE__*/
            _jsxs("p", { className: "text-sm text-foreground leading-relaxed", children: [/*#__PURE__*/
              _jsx("strong", { children: "Important:" }), " Therapify is not a substitute for professional mental health care. If you are in immediate danger or crisis, please contact emergency services or visit our", " ", /*#__PURE__*/
              _jsx(Link, { to: "/crisis", className: "text-primary underline", children: "crisis resources" }), "."] }
            ) }
          )] }
        ), /*#__PURE__*/

        _jsx("div", { className: "flex flex-col gap-8", children:
          sections.map((s, i) => /*#__PURE__*/
          _jsxs("div", { className: "bg-card rounded-2xl p-6 border border-border", children: [/*#__PURE__*/
            _jsx("h2", { className: "font-display text-lg font-medium text-foreground mb-3", children: s.title }), /*#__PURE__*/
            _jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: s.body })] }, i
          )
          ) }
        ), /*#__PURE__*/

        _jsxs("div", { className: "mt-10 p-5 bg-primary/5 rounded-2xl border border-primary/15 text-sm text-muted-foreground", children: ["Questions about these terms? Email ", /*#__PURE__*/
          _jsx("a", { href: "mailto:legal@therapify.app", className: "text-primary hover:underline", children: "legal@therapify.app" }), " or read our", " ", /*#__PURE__*/
          _jsx(Link, { to: "/privacy", className: "text-primary hover:underline", children: "Privacy Policy" }), "."] }
        )] }
      ) }
    ));

}