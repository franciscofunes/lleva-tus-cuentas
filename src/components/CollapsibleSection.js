import React from "react";
import { CollapsibleChevron, CollapsibleHeading } from "./CollapsibleHeading";

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
}) {
  const contentId = id ? `${id}-content` : undefined;

  return (
    <section
      id={id}
      className={`scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          className="min-w-0 flex flex-1 items-start justify-between gap-3 text-left"
        >
          <CollapsibleHeading eyebrow={eyebrow} title={title} description={description} />
          <CollapsibleChevron expanded={!collapsed} />
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {!collapsed && (
        <div id={contentId} className={`mt-5 ${contentClassName}`}>
          {children}
        </div>
      )}
    </section>
  );
}

export default CollapsibleSection;
