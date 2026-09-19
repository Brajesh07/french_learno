export default function Loading() {
  return (
    <div className="min-h-[100svh] bg-[#F5F5F7] pb-16 animate-pulse">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-5 sticky top-0 bg-[#F5F5F7] z-10">
        <div className="h-7 w-32 rounded-[14px] bg-[#E5E5E5]" />
        <div className="ml-auto h-5 w-20 rounded-[14px] bg-[#F0F0F0]" />
      </header>

      <div className="px-5 flex flex-col gap-3">
        {/* Top banner */}
        <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="h-5 w-40 rounded-[14px] bg-[#E5E5E5] mb-2" />
          <div className="h-4 w-64 rounded-[14px] bg-[#F0F0F0]" />
        </div>

        {/* List */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          >
            <div className="w-12 h-12 rounded-[14px] bg-[#E5E5E5] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 rounded-[14px] bg-[#E5E5E5] mb-2" />
              <div className="h-3 w-56 rounded-[14px] bg-[#F0F0F0]" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#E5E5E5] shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
