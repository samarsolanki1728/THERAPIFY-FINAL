"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "./utils";import { jsx as _jsx } from "react/jsx-runtime";

function Avatar({
  className,
  ...props
}) {
  return (/*#__PURE__*/
    _jsx(AvatarPrimitive.Root, {
      "data-slot": "avatar",
      className: cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full",
        className
      ), ...
      props }
    ));

}

function AvatarImage({
  className,
  ...props
}) {
  return (/*#__PURE__*/
    _jsx(AvatarPrimitive.Image, {
      "data-slot": "avatar-image",
      className: cn("aspect-square size-full", className), ...
      props }
    ));

}

function AvatarFallback({
  className,
  ...props
}) {
  return (/*#__PURE__*/
    _jsx(AvatarPrimitive.Fallback, {
      "data-slot": "avatar-fallback",
      className: cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      ), ...
      props }
    ));

}

export { Avatar, AvatarImage, AvatarFallback };