import { Link } from "react-router";
import { ArrowRight, MapPin, Clock } from "lucide-react";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const roles = [
{ title: "Senior Full-Stack Engineer", team: "Engineering", location: "Remote", type: "Full-time", description: "Help build the core product: chat, mood tracking, journaling. Strong React + Node preferred." },
{ title: "Clinical Safety Researcher", team: "Clinical", location: "Remote / London", type: "Full-time", description: "Evaluate AI responses for clinical accuracy and safety. Psychology or psychiatry background required." },
{ title: "Product Designer", team: "Design", location: "Remote", type: "Full-time", description: "Own end-to-end design for new features. Deep empathy for anxious users is more important than a portfolio of flashy animations." },
{ title: "AI/ML Engineer", team: "Engineering", location: "Remote", type: "Full-time", description: "Fine-tune and evaluate language models for therapeutic conversation. Safety-first mindset essential." }];


const perks = [
"Fully remote, async-first culture",
"Unlimited mental health days",
"Free Therapify Premium for you and your family",
"Annual retreat (somewhere calm)",
"Learning stipend — books, courses, conferences",
"4-day work week pilot underway"];


export default function Careers() {
  return (/*#__PURE__*/
    _jsx("div", { className: "min-h-screen pt-24 pb-16 px-6", children: /*#__PURE__*/
      _jsxs("div", { className: "max-w-4xl mx-auto", children: [/*#__PURE__*/
        _jsxs("div", { className: "mb-16 max-w-2xl", children: [/*#__PURE__*/
          _jsx("span", { className: "text-xs font-medium text-primary uppercase tracking-widest", children: "Careers" }), /*#__PURE__*/
          _jsxs("h1", { className: "font-display text-5xl font-medium text-foreground mt-3 mb-4", children: ["Build something that", /*#__PURE__*/
            _jsx("br", {}), /*#__PURE__*/_jsx("em", { className: "font-normal text-primary", children: "genuinely helps." })] }
          ), /*#__PURE__*/
          _jsx("p", { className: "text-lg text-muted-foreground leading-relaxed", children: "We're a small, focused team working on one of the most meaningful problems there is. If that sounds like the right place to apply your skills, we'd love to hear from you." }


          )] }
        ), /*#__PURE__*/


        _jsxs("div", { className: "bg-card rounded-2xl p-7 border border-border mb-12", children: [/*#__PURE__*/
          _jsx("h2", { className: "font-display text-xl font-medium text-foreground mb-5", children: "What we offer" }), /*#__PURE__*/
          _jsx("div", { className: "grid sm:grid-cols-2 gap-3", children:
            perks.map((perk) => /*#__PURE__*/
            _jsxs("div", { className: "flex items-start gap-2.5 text-sm text-foreground", children: [/*#__PURE__*/
              _jsx("span", { className: "w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs", children: "✓" }),
              perk] }, perk
            )
            ) }
          )] }
        ), /*#__PURE__*/


        _jsx("h2", { className: "font-display text-2xl font-medium text-foreground mb-6", children: "Open roles" }), /*#__PURE__*/
        _jsx("div", { className: "flex flex-col gap-4", children:
          roles.map((role) => /*#__PURE__*/
          _jsx("div", { className: "bg-card rounded-2xl p-6 border border-border hover:shadow-sm transition-all group", children: /*#__PURE__*/
            _jsxs("div", { className: "flex items-start justify-between gap-4", children: [/*#__PURE__*/
              _jsxs("div", { className: "flex-1", children: [/*#__PURE__*/
                _jsxs("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap", children: [/*#__PURE__*/
                  _jsx("span", { className: "text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full", children: role.team }), /*#__PURE__*/
                  _jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [/*#__PURE__*/_jsx(MapPin, { className: "w-3 h-3" }), role.location] }), /*#__PURE__*/
                  _jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [/*#__PURE__*/_jsx(Clock, { className: "w-3 h-3" }), role.type] })] }
                ), /*#__PURE__*/
                _jsx("h3", { className: "font-medium text-foreground mb-1.5", children: role.title }), /*#__PURE__*/
                _jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: role.description })] }
              ), /*#__PURE__*/
              _jsxs("button", { className: "flex items-center gap-1.5 text-sm font-medium text-primary shrink-0 hover:text-primary/70 transition-colors group-hover:translate-x-0.5 transition-transform", children: ["Apply ", /*#__PURE__*/
                _jsx(ArrowRight, { className: "w-4 h-4" })] }
              )] }
            ) }, role.title
          )
          ) }
        ), /*#__PURE__*/

        _jsxs("p", { className: "text-sm text-muted-foreground mt-8 text-center", children: ["Don't see your role? Email us at",
          " ", /*#__PURE__*/
          _jsx("a", { href: "mailto:team@therapify.app", className: "text-primary hover:underline", children: "team@therapify.app" })] }
        )] }
      ) }
    ));

}