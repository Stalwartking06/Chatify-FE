import React from 'react';

export const ContactsSkeleton = () => {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className="flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 bg-slate-800 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-800 rounded w-1/3"></div>
            <div className="h-3 bg-slate-800 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MessagesSkeleton = () => {
  return (
    <div className="space-y-4 p-4 flex-1 overflow-y-auto">
      {[1, 2, 3, 4, 5].map((n, i) => (
        <div
          key={n}
          className={`flex items-end gap-2.5 max-w-[75%] ${
            i % 2 === 0 ? 'mr-auto' : 'ml-auto flex-row-reverse'
          } animate-pulse`}
        >
          <div className="w-8 h-8 bg-slate-800 rounded-full"></div>
          <div className="space-y-1">
            <div
              className={`h-12 bg-slate-800 rounded-2xl w-48 ${
                i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'
              }`}
            ></div>
            <div className="h-2 bg-slate-850 rounded w-10"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 animate-pulse">
      <div className="w-24 h-24 bg-slate-800 rounded-full"></div>
      <div className="h-6 bg-slate-800 rounded w-1/3"></div>
      <div className="h-4 bg-slate-800 rounded w-1/2"></div>
      <div className="w-full space-y-3 pt-6 border-t border-slate-800">
        <div className="h-10 bg-slate-800 rounded"></div>
        <div className="h-16 bg-slate-800 rounded"></div>
      </div>
    </div>
  );
};
