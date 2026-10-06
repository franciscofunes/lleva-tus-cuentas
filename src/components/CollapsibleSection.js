import React from "react";
import { FaChevronDown } from "react-icons/fa";

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
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-bold uppercase tracking-wider text-purple-500">
                {eyebrow}
              </p>
            )}
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          <FaChevronDown
            aria-hidden="true"
            className={`mt-1 shrink-0 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
          />
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
