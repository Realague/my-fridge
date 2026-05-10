import * as React from "react"

import { cn } from "@/lib/utils"

// `variant="elevated"` collapses the 40+ copy-paste sites of
// `bg-card/80 backdrop-blur-sm border-0 shadow-lg` into a primitive that
// also bakes the charter `mf-motion-card` (hover translateY -3px + shadow,
// honors prefers-reduced-motion). Default keeps the shadcn neutral surface.
type CardVariant = "default" | "elevated";
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        variant === "elevated"
          ? "rounded-lg bg-card/80 backdrop-blur-sm border-0 shadow-lg text-card-foreground mf-motion-card hover:shadow-xl"
          : "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

// CardTitle is polymorphic: callers pick the heading level that fits the page
// outline (h1 → h2 → h3 …). Default is h2 because most pages already have a
// page-level h1 in their header — `<CardTitle>` then naturally lands at h2,
// fixing the h1 → h3 jumps the original audit flagged on 22 pages.
//
// Default styling matches charter heading-2 (text-lg font-semibold) instead of
// the previous text-2xl which 90 % of consumers were already overriding.
type CardTitleElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: CardTitleElement;
}
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Comp = "h2", ...props }, ref) => (
    <Comp
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight",
        className
      )}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Card rendered as a native <button>: gets focus, Enter/Space activation
// and screen-reader "button" semantics for free. Use this for cards whose
// entire surface navigates or triggers a single action AND that have NO
// nested interactive descendants. For cards with nested buttons/links,
// use CardLinkOverlay (stretched-link pattern) instead.
//
// `variant="elevated"` applies the charter "soft-glass" surface
// (`bg-card/80 backdrop-blur-sm border-0 shadow-lg`) — same recipe as
// `<Card variant="elevated">` so a CardButton sits flush next to a Card on
// pages like Dashboard quick-actions / storage area cards.
interface CardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CardVariant;
}
const CardButton = React.forwardRef<HTMLButtonElement, CardButtonProps>(
  ({ className, type, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "block w-full text-left rounded-lg text-card-foreground",
        variant === "elevated"
          ? "bg-card/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl"
          : "border bg-card shadow-sm hover:shadow-xl",
        // Charter motion (translateY + shadow), respects prefers-reduced-motion
        "mf-motion-card cursor-pointer",
        // Focus ring (charter-aligned via shadcn ring tokens)
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Reset native <button> defaults that fight the layout
        "appearance-none font-[inherit] disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
)
CardButton.displayName = "CardButton"

// Stretched-link overlay for cards that contain nested interactive elements
// (buttons, links). Renders an absolutely-positioned <button> covering the
// card surface; nested actions stay reachable because they sit on a higher
// stacking context (use `relative z-10` on action wrappers). Avoids the
// nested-interactive WCAG violation that role="button" on the wrapper would
// trigger.
//
// Usage:
//   <div className="relative">
//     <CardLinkOverlay aria-label={...} onClick={...} />
//     <Card>
//       ...content with <button className="relative z-10" />...
//     </Card>
//   </div>
const CardLinkOverlay = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type, ...props }, ref) => (
  <button
    ref={ref}
    type={type ?? "button"}
    className={cn(
      "absolute inset-0 z-0 w-full h-full rounded-lg cursor-pointer",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "appearance-none border-0 bg-transparent p-0",
      className
    )}
    {...props}
  />
))
CardLinkOverlay.displayName = "CardLinkOverlay"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardButton, CardLinkOverlay }
