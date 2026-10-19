import { cn } from "./utils";import { jsx as _jsx } from "react/jsx-runtime";

function Skeleton({ className, ...props }) {
  return (/*#__PURE__*/
    _jsx("div", {
      "data-slot": "skeleton",
      className: cn("bg-accent animate-pulse rounded-md", className), ...
      props }
    ));

}

export { Skeleton };