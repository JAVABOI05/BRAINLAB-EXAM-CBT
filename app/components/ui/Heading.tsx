import React from "react";
import { DESIGN_TOKENS } from "@/app/lib/tokens";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: `h${HeadingLevel}`;
  visualLevel?: HeadingLevel;
  className?: string;
}

export function Heading({
  level = 2,
  as,
  visualLevel,
  className = "",
  children,
  ...props
}: HeadingProps) {
  const Component = as || (`h${level}` as const);
  const targetLevel = visualLevel || level;

  const levelStyles: Record<HeadingLevel, string> = {
    1: DESIGN_TOKENS.typography.scale.h1,
    2: DESIGN_TOKENS.typography.scale.h2,
    3: DESIGN_TOKENS.typography.scale.h3,
    4: DESIGN_TOKENS.typography.scale.h4,
    5: DESIGN_TOKENS.typography.scale.h5,
    6: DESIGN_TOKENS.typography.scale.h6,
  };

  return (
    <Component
      className={`text-[var(--bl-color-text-primary)] ${levelStyles[targetLevel]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
