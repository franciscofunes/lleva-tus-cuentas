import React from "react";
import { COLLAPSIBLE_SURFACE_STYLES, CollapsibleChevron, CollapsibleHeading } from "./CollapsibleHeading";

function CollapsibleSection({
  id,
  eyebrow,
  title,
  description,
  collapsed,
  onToggle,
  action,
  children,
  className = "",
  contentClassName = "",
  variant = "default",
}) {
  const contentId = id ? `${id}-content` : undefined;

  return (
    <section
      id={id}
      className={`${variant === "nested" ? COLLAPSIBLE_SURFACE_STYLES.nested : COLLAPSIBLE_SURFACE_STYLES.root} ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          className={`${COLLAPSIBLE_SURFACE_STYLES.header} flex-1`}
        >
          <CollapsibleHeading eyebrow={eyebrow} title={title} description={description} level={variant === "nested" ? 3 : 2} />
          <CollapsibleChevron expanded={!collapsed} />
        </button>
        {action && <div className="shrink-0 self-center pr-4 sm:pr-5">{action}</div>}
      </div>

      {!collapsed && (
        <div id={contentId} className={`${COLLAPSIBLE_SURFACE_STYLES.content} ${contentClassName}`}>
          {children}
        </div>
      )}
    </section>
  );
}

export default CollapsibleSection;
