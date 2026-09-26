export default function Loading() {
  return (
    <div className="min-h-[100svh] bg-[#F5F5F7] pb-16 animate-pulse">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-5">
        <div className="h-7 w-28 rounded-[14px] bg-[#E5E5E5]" />
        <div className="w-10 h-10 rounded-full bg-[#E5E5E5]" />
      </header>

      <div className="px-5 flex flex-col gap-4 pb-16">
        {/* Avatar card */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#E5E5E5] shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="h-5 w-40 rounded-[14px] bg-[#E5E5E5] mb-2" />
            <div className="h-3 w-32 rounded-[14px] bg-[#F0F0F0] mb-2" />
            <div className="h-3 w-44 rounded-[14px] bg-[#F0F0F0]" />
          </div>
        </div>

        {/* Subscription card */}
        <div className="bg-white rounded-[20px] p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="w-10 h-10 rounded-full bg-[#E5E5E5] shrink-0" />
          <div>
            <div className="h-4 w-32 rounded-[14px] bg-[#E5E5E5] mb-2" />
            <div className="h-3 w-52 rounded-[14px] bg-[#F0F0F0]" />
          </div>
        </div>

        {/* Level progress */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="h-4 w-28 rounded-[14px] bg-[#E5E5E5] mb-3" />
          <div className="flex gap-2 flex-wrap mb-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-[14px] bg-[#F0F0F0]" />
            ))}
          </div>
          <div className="h-4 w-44 rounded-[14px] bg-[#F0F0F0]" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] bg-white"
            >
              <div className="h-6 w-10 rounded-[14px] bg-[#E5E5E5] mb-2" />
              <div className="h-3 w-16 rounded-[14px] bg-[#F0F0F0]" />
            </div>
          ))}
        </div>

        {/* Account details */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-3 border-b border-[#E5E5E5]">
            <div className="h-4 w-28 rounded-[14px] bg-[#E5E5E5]" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5E5] last:border-0"
            >
              <div className="h-3 w-20 rounded-[14px] bg-[#F0F0F0]" />
              <div className="h-3 w-28 rounded-[14px] bg-[#E5E5E5]" />
            </div>
          ))}
        </div>

        {/* Edit trigger */}
        <div className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="h-4 w-24 rounded-[14px] bg-[#E5E5E5]" />
          <div className="w-4 h-4 rounded-full bg-[#F0F0F0]" />
        </div>
      </div>
    </div>
  );
}
