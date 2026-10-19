import { Shield } from "lucide-react";
import { Link } from "react-router";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const sections = [
{ title: "What we collect", body: "We collect your email address, display name, and the content you create (journal entries, mood logs, chat messages). We do not collect biometric data, precise location, or any data you haven't directly provided. We never sell your data." },
{ title: "How we use it", body: "Your data is used solely to provide the Therapify service — generating AI responses, storing your logs, and personalising your experience. We use anonymised, aggregated data to improve the product, but never in a way that could identify you." },
{ title: "Chat storage encryption", body: "Chat message text and conversation titles are encrypted by our server before being stored in the database. The encryption key is kept outside the database. Our server decrypts chats to show your history and provide AI responses. This is not end-to-end encryption, and this chat-specific protection does not encrypt journal entries or mood logs." },
{ title: "Third parties", body: "We use a small number of sub-processors (cloud infrastructure, email delivery) subject to strict data processing agreements. We do not share personal data with advertisers or data brokers — ever." },
{ title: "Your rights", body: "You have the right to access, export, correct, or delete your data at any time. You can do this from your account settings or by emailing privacy@therapify.app. We'll respond within 30 days." },
{ title: "Data retention", body: "Active account data is retained until you delete your account. After deletion, all personal data is purged within 30 days. Anonymised aggregate data may be retained for research purposes." },
{ title: "Changes to this policy", body: "If we make material changes, we'll notify you by email and in-app at least 30 days before they take effect. Continued use after that date constitutes acceptance." }];


export default function Privacy() {
  return (/*#__PURE__*/
    _jsx("div", { className: "min-h-screen pt-24 pb-16 px-6", children: /*#__PURE__*/
      _jsxs("div", { className: "max-w-3xl mx-auto", children: [/*#__PURE__*/
        _jsxs("div", { className: "mb-12", children: [/*#__PURE__*/
          _jsxs("div", { className: "flex items-center gap-2 mb-4", children: [/*#__PURE__*/
            _jsx(Shield, { className: "w-5 h-5 text-primary" }), /*#__PURE__*/
            _jsx("span", { className: "text-xs font-medium text-primary uppercase tracking-widest", children: "Legal" })] }
          ), /*#__PURE__*/
          _jsx("h1", { className: "font-display text-4xl font-medium text-foreground mb-3", children: "Privacy Policy" }), /*#__PURE__*/
          _jsx("p", { className: "text-muted-foreground text-sm", children: "Last updated: August 1, 2026" }), /*#__PURE__*/
          _jsx("p", { className: "text-muted-foreground mt-4 leading-relaxed", children: "Your privacy is foundational to Therapify, not a footnote. This policy explains exactly what we collect, why, and how you stay in control." }

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

        _jsxs("div", { className: "mt-10 p-5 bg-primary/5 rounded-2xl border border-primary/15 text-sm text-muted-foreground", children: ["Questions? Email ", /*#__PURE__*/
          _jsx("a", { href: "mailto:privacy@therapify.app", className: "text-primary hover:underline", children: "privacy@therapify.app" }), " or read our", " ", /*#__PURE__*/
          _jsx(Link, { to: "/terms", className: "text-primary hover:underline", children: "Terms of Service" }), "."] }
        )] }
      ) }
    ));

}
