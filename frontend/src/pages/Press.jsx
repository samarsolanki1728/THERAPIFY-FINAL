import { ArrowRight, Download } from "lucide-react";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const coverage = [
{ outlet: "TechCrunch", date: "Aug 2026", headline: "Therapify raises $12M to make AI mental health support more human", logo: "TC" },
{ outlet: "The Guardian", date: "Jul 2026", headline: "Can an AI really help with anxiety? We spent a month finding out", logo: "TG" },
{ outlet: "Wired", date: "Jun 2026", headline: "The mental health app that refuses to be addictive", logo: "WR" },
{ outlet: "Fast Company", date: "May 2026", headline: "Therapify was named one of the most innovative companies in health tech", logo: "FC" }];


const assets = [
{ name: "Logo pack (SVG, PNG)", size: "2.4 MB" },
{ name: "Product screenshots", size: "8.1 MB" },
{ name: "Founder headshots", size: "4.6 MB" },
{ name: "Brand guidelines PDF", size: "1.2 MB" }];


export default function Press() {
  return (/*#__PURE__*/
    _jsx("div", { className: "min-h-screen pt-24 pb-16 px-6", children: /*#__PURE__*/
      _jsxs("div", { className: "max-w-4xl mx-auto", children: [/*#__PURE__*/
        _jsxs("div", { className: "mb-14", children: [/*#__PURE__*/
          _jsx("span", { className: "text-xs font-medium text-primary uppercase tracking-widest", children: "Press" }), /*#__PURE__*/
          _jsxs("h1", { className: "font-display text-5xl font-medium text-foreground mt-3 mb-4", children: ["In the", /*#__PURE__*/
            _jsx("em", { className: "font-normal", children: " press." })] }
          ), /*#__PURE__*/
          _jsxs("p", { className: "text-muted-foreground max-w-md", children: ["For press enquiries, interviews, or speaking requests, contact",
            " ", /*#__PURE__*/
            _jsx("a", { href: "mailto:press@therapify.app", className: "text-primary hover:underline", children: "press@therapify.app" })] }
          )] }
        ), /*#__PURE__*/


        _jsx("div", { className: "flex flex-col gap-4 mb-14", children:
          coverage.map((item) => /*#__PURE__*/
          _jsxs("div", { className: "flex items-center gap-5 bg-card rounded-2xl p-6 border border-border hover:shadow-sm transition-all group cursor-pointer", children: [/*#__PURE__*/
            _jsx("div", { className: "w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground", children:
              item.logo }
            ), /*#__PURE__*/
            _jsxs("div", { className: "flex-1", children: [/*#__PURE__*/
              _jsxs("div", { className: "flex items-center gap-2 mb-1", children: [/*#__PURE__*/
                _jsx("span", { className: "text-xs font-medium text-foreground", children: item.outlet }), /*#__PURE__*/
                _jsxs("span", { className: "text-xs text-muted-foreground", children: ["· ", item.date] })] }
              ), /*#__PURE__*/
              _jsx("p", { className: "text-sm text-foreground leading-snug group-hover:text-primary transition-colors", children: item.headline })] }
            ), /*#__PURE__*/
            _jsx(ArrowRight, { className: "w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" })] }, item.headline
          )
          ) }
        ), /*#__PURE__*/


        _jsxs("div", { className: "bg-card rounded-2xl p-7 border border-border", children: [/*#__PURE__*/
          _jsx("h2", { className: "font-display text-xl font-medium text-foreground mb-5", children: "Press assets" }), /*#__PURE__*/
          _jsx("div", { className: "flex flex-col gap-3", children:
            assets.map((asset) => /*#__PURE__*/
            _jsxs("div", { className: "flex items-center justify-between py-3 border-b border-border last:border-0", children: [/*#__PURE__*/
              _jsxs("div", { children: [/*#__PURE__*/
                _jsx("p", { className: "text-sm font-medium text-foreground", children: asset.name }), /*#__PURE__*/
                _jsx("p", { className: "text-xs text-muted-foreground", children: asset.size })] }
              ), /*#__PURE__*/
              _jsxs("button", { className: "flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/70 transition-colors", children: [/*#__PURE__*/
                _jsx(Download, { className: "w-3.5 h-3.5" }), " Download"] }
              )] }, asset.name
            )
            ) }
          )] }
        )] }
      ) }
    ));

}