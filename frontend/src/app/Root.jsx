import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { Heart, Menu, X, Shield, CircleUserRound } from "lucide-react";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

function Nav() {
 const [open,setOpen]=useState(false);
 const location=useLocation();
 const isAuthenticated=Boolean(localStorage.getItem('token'));
 useEffect(()=>setOpen(false),[location.pathname]);
 const links=[['Mood','/mood'],['Journal','/journal'],['Wellness','/wellness'],['Events','/events'],['How it works',location.pathname==='/'?'#how':'/#how']];
 const logout=()=>{localStorage.removeItem('token');localStorage.removeItem('user');window.location.href='/';};
 return <nav className="review-nav" aria-label="Main navigation"><div className="review-container review-nav-inner"><Link to="/" className="review-nav-brand font-display"><span><Heart size={17}/></span>Therapify</Link><div className="review-nav-links">{links.map(([label,to])=><a key={label} href={to} aria-current={location.pathname===to?'page':undefined}>{label}</a>)}</div><div className="review-nav-actions">{isAuthenticated?<button onClick={logout} className="review-button secondary">Log out</button>:<><Link to="/signin">Sign in</Link><Link to="/register" className="review-button primary">Get started <span aria-hidden="true">&#8599;</span></Link></>}</div><button className="review-menu-toggle" aria-expanded={open} aria-controls="review-menu" aria-label={open?'Close navigation':'Open navigation'} onClick={()=>setOpen(!open)}>{open?<X size={21}/>:<Menu size={21}/>}</button></div>{open&&<div id="review-menu" className="review-mobile-menu">{links.map(([label,to])=><a key={label} href={to} onClick={()=>setOpen(false)}>{label}</a>)}{isAuthenticated?<button onClick={logout}>Log out</button>:<><Link to="/signin">Sign in</Link><Link to="/register">Get started</Link></>}</div>}</nav>;
}

function Footer() {
  return (/*#__PURE__*/
    _jsx("footer", { className: "border-t border-border py-14 px-6", children: /*#__PURE__*/
      _jsxs("div", { className: "max-w-6xl mx-auto", children: [/*#__PURE__*/
        _jsxs("div", { className: "grid md:grid-cols-3 gap-10 mb-12", children: [/*#__PURE__*/
          _jsxs("div", { children: [/*#__PURE__*/
            _jsxs(Link, { to: "/", className: "flex items-center gap-2 mb-4", children: [/*#__PURE__*/
              _jsx("div", { className: "w-7 h-7 rounded-full bg-primary flex items-center justify-center", children: /*#__PURE__*/
                _jsx(Heart, { className: "w-3.5 h-3.5 text-primary-foreground" }) }
              ), /*#__PURE__*/
              _jsx("span", { className: "font-display text-lg font-medium text-foreground", children: "Therapify" })] }
            ), /*#__PURE__*/
            _jsx("p", { className: "text-sm text-muted-foreground leading-relaxed max-w-xs", children: "Mental wellness support that feels human. AI-powered, always calm, always private." }

            )] }
          ),
          [
          {
            heading: "Product",
            links: [
            { label: "AI Chat", to: "/chat" },
            { label: "Mood Tracking", to: "/mood" },
            { label: "Journal", to: "/journal" },
            { label: "Wellness", to: "/wellness" }]

          },
          {
            heading: "Legal",
            links: [
            { label: "Privacy", to: "/privacy" },
            { label: "Terms", to: "/terms" },
            { label: "Cookie policy", to: "/cookies" },
            { label: "Crisis resources", to: "/crisis" }]

          }].
          map((col) => /*#__PURE__*/
          _jsxs("div", { children: [/*#__PURE__*/
            _jsx("h5", { className: "text-xs font-semibold text-foreground uppercase tracking-wider mb-4", children:
              col.heading }
            ), /*#__PURE__*/
            _jsx("ul", { className: "flex flex-col gap-2.5", children:
              col.links.map((link) => /*#__PURE__*/
              _jsx("li", { children: /*#__PURE__*/
                _jsx(Link, {
                  to: link.to,
                  className: "text-sm text-muted-foreground hover:text-foreground transition-colors", children:

                  link.label }
                ) }, link.label
              )
              ) }
            )] }, col.heading
          )
          )] }
        ), /*#__PURE__*/
        _jsxs("div", { className: "pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground", children: [/*#__PURE__*/
          _jsx("p", { children: "© 2026 Therapify. Not a substitute for professional medical advice." }), /*#__PURE__*/
          _jsxs("div", { className: "flex items-center gap-1.5", children: [/*#__PURE__*/
            _jsx(Shield, { className: "w-3.5 h-3.5" }), "Chat content encrypted in storage"] }

          )] }
        )] }
      ) }
    ));

}

export default function Root() {
  const { pathname } = useLocation();
  const isChat = pathname.replace(/\/$/, "") === "/chat";
  return (/*#__PURE__*/
    _jsxs("div", {
      className: isChat ? "h-dvh overflow-hidden bg-background" : "min-h-screen bg-background",
      style: {
        fontFamily: "'DM Sans', system-ui, sans-serif",
        ["--font-display"]: "'Playfair Display', Georgia, serif"
      }, children: [/*#__PURE__*/

      _jsx("style", { children: `
        .font-display { font-family: var(--font-display); }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { display: none; }
      ` }), /*#__PURE__*/
      _jsx(Nav, {}), /*#__PURE__*/
      _jsx(Outlet, {}), /*#__PURE__*/
      !isChat && _jsx(Footer, {})] }
    ));

}
