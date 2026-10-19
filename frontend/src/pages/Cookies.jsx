import { useState } from "react";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";



const cookieTypes = [
{ name: "Essential cookies", purpose: "Required for the service to function — authentication, session management, security. Cannot be disabled.", required: true },
{ name: "Preference cookies", purpose: "Remember your settings such as theme, language, and notification preferences.", required: false },
{ name: "Analytics cookies", purpose: "Help us understand how the app is used (anonymised). We use privacy-respecting, cookieless analytics wherever possible.", required: false }];


export default function Cookies() {
  const [prefs, setPrefs] = useState({ preference: true, analytics: false });

  return (/*#__PURE__*/
    _jsx("div", { className: "min-h-screen pt-24 pb-16 px-6", children: /*#__PURE__*/
      _jsxs("div", { className: "max-w-3xl mx-auto", children: [/*#__PURE__*/
        _jsxs("div", { className: "mb-12", children: [/*#__PURE__*/
          _jsx("span", { className: "text-xs font-medium text-primary uppercase tracking-widest", children: "Legal" }), /*#__PURE__*/
          _jsx("h1", { className: "font-display text-4xl font-medium text-foreground mt-3 mb-3", children: "Cookie Policy" }), /*#__PURE__*/
          _jsx("p", { className: "text-muted-foreground text-sm", children: "Last updated: August 1, 2026" }), /*#__PURE__*/
          _jsx("p", { className: "text-muted-foreground mt-4 leading-relaxed", children: "We use cookies and similar technologies to keep the app working and to improve your experience. Here's exactly what we use and why — and where you can opt out." }


          )] }
        ), /*#__PURE__*/

        _jsx("div", { className: "flex flex-col gap-5 mb-12", children:
          cookieTypes.map((c) => {
            const key = c.name.split(" ")[0].toLowerCase();
            return (/*#__PURE__*/
              _jsx("div", { className: "bg-card rounded-2xl p-6 border border-border", children: /*#__PURE__*/
                _jsxs("div", { className: "flex items-start justify-between gap-4", children: [/*#__PURE__*/
                  _jsxs("div", { className: "flex-1", children: [/*#__PURE__*/
                    _jsx("h3", { className: "font-medium text-foreground mb-1.5", children: c.name }), /*#__PURE__*/
                    _jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: c.purpose })] }
                  ),
                  c.required ? /*#__PURE__*/
                  _jsx("span", { className: "text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0", children: "Always on" }) : /*#__PURE__*/

                  _jsx("button", {
                    onClick: () => setPrefs((p) => ({ ...p, [key]: !p[key] })),
                    className: `relative w-11 h-6 rounded-full transition-colors shrink-0 ${prefs[key] ? "bg-primary" : "bg-muted"}`, children: /*#__PURE__*/

                    _jsx("span", { className: `absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${prefs[key] ? "translate-x-5" : ""}` }) }
                  )] }

                ) }, c.name
              ));

          }) }
        ), /*#__PURE__*/

        _jsxs("div", { className: "bg-card rounded-2xl p-6 border border-border mb-8", children: [/*#__PURE__*/
          _jsx("h2", { className: "font-display text-lg font-medium text-foreground mb-3", children: "Managing cookies in your browser" }), /*#__PURE__*/
          _jsxs("p", { className: "text-sm text-muted-foreground leading-relaxed", children: ["You can also manage cookies directly in your browser settings. Note that disabling essential cookies will prevent you from using Therapify. Browser instructions: ", /*#__PURE__*/

            _jsx("a", { href: "#", className: "text-primary hover:underline", children: "Chrome" }), ",", " ", /*#__PURE__*/
            _jsx("a", { href: "#", className: "text-primary hover:underline", children: "Firefox" }), ",", " ", /*#__PURE__*/
            _jsx("a", { href: "#", className: "text-primary hover:underline", children: "Safari" }), "."] }
          )] }
        ), /*#__PURE__*/

        _jsx("button", { className: "bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition-all", children: "Save preferences" }

        )] }
      ) }
    ));

}