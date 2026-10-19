import { Link } from "react-router";
import { ArrowRight, Heart } from "lucide-react";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

export default function NotFound() {
  return (/*#__PURE__*/
    _jsx("div", { className: "min-h-screen flex items-center justify-center px-6 pt-20", children: /*#__PURE__*/
      _jsxs("div", { className: "text-center max-w-md", children: [/*#__PURE__*/
        _jsx("div", { className: "w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6", children: /*#__PURE__*/
          _jsx(Heart, { className: "w-8 h-8 text-primary" }) }
        ), /*#__PURE__*/
        _jsx("p", { className: "font-display text-7xl font-medium text-primary/30 mb-4", children: "404" }), /*#__PURE__*/
        _jsx("h1", { className: "font-display text-3xl font-medium text-foreground mb-3", children: "This page doesn't exist" }

        ), /*#__PURE__*/
        _jsx("p", { className: "text-muted-foreground leading-relaxed mb-8", children: "The page you're looking for has moved, or perhaps it never was. Let's get you somewhere calm." }

        ), /*#__PURE__*/
        _jsxs("div", { className: "flex gap-3 justify-center", children: [/*#__PURE__*/
          _jsxs(Link, {
            to: "/",
            className: "flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium text-sm hover:bg-primary/90 transition-all", children: [
            "Go home ", /*#__PURE__*/
            _jsx(ArrowRight, { className: "w-4 h-4" })] }
          ), /*#__PURE__*/
          _jsx(Link, {
            to: "/chat",
            className: "border border-border text-foreground px-6 py-3 rounded-full font-medium text-sm hover:bg-secondary/60 transition-all", children:
            "Open chat" }

          )] }
        )] }
      ) }
    ));

}