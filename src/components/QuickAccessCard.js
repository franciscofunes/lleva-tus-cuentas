import React from "react";

function QuickAccessCard({ eyebrow, title, description, children }) {
  return (
    <section className="mb-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wider text-purple-500">
        {eyebrow}
      </p>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">{children}</div>
      </div>
    </section>
  );
}

export default QuickAccessCard;
