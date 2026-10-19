"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";import { jsx as _jsx } from "react/jsx-runtime";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (/*#__PURE__*/
    _jsx(Sonner, {
      theme: theme,
      className: "toaster group",
      style:
      {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)"
      }, ...

      props }
    ));

};

export { Toaster };