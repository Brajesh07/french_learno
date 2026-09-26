export default function Loading() {
  return (
    <div className="min-h-[100svh] bg-[#F5F5F7] pb-16 animate-pulse">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-5 sticky top-0 bg-[#F5F5F7] z-50">
        <div className="w-10 h-10 rounded-full bg-[#E5E5E5] shrink-0" />
        <div className="h-4 w-44 rounded-[14px] bg-[#E5E5E5]" />
      </header>

      <div className="px-5 flex flex-col gap-4 pb-16">
        {/* Hero */}
        <div className="rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] min-h-[160px]">
          <div className="h-5 w-16 rounded-[14px] bg-[#E5E5E5] mb-4" />
          <div className="h-6 w-56 rounded-[14px] bg-[#E5E5E5] mb-2" />
          <div className="h-6 w-44 rounded-[14px] bg-[#E5E5E5] mb-3" />
          <div className="h-4 w-64 rounded-[14px] bg-[#F0F0F0]" />
        </div>

        {/* Media block */}
        <div className="aspect-video w-full rounded-[20px] bg-[#E5E5E5]" />

        {/* Lesson content card */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="h-4 w-28 rounded-[14px] bg-[#E5E5E5] mb-4" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded-[14px] bg-[#F0F0F0]" />
            <div className="h-4 w-[92%] rounded-[14px] bg-[#F0F0F0]" />
            <div className="h-4 w-[88%] rounded-[14px] bg-[#F0F0F0]" />
            <div className="h-4 w-[95%] rounded-[14px] bg-[#F0F0F0]" />
            <div className="h-4 w-[80%] rounded-[14px] bg-[#F0F0F0]" />
          </div>
        </div>

        {/* Secondary content/media card */}
        <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="h-4 w-32 rounded-[14px] bg-[#E5E5E5] mb-4" />
          <div className="h-44 rounded-[14px] bg-[#F0F0F0]" />
        </div>

        {/* Completion panel */}
        <div className="rounded-[24px] p-5 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E5E5E5]" />
            <div>
              <div className="h-4 w-40 rounded-[14px] bg-[#E5E5E5] mb-2" />
              <div className="h-3 w-52 rounded-[14px] bg-[#F0F0F0]" />
            </div>
          </div>
          <div className="h-10 w-32 rounded-[20px] bg-[#E5E5E5]" />
        </div>

        {/* Quizzes list */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-4 border-b border-[#E5E5E5]">
            <div className="h-4 w-16 rounded-[14px] bg-[#E5E5E5]" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#E5E5E5] last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="h-4 w-40 rounded-[14px] bg-[#E5E5E5] mb-2" />
                <div className="h-3 w-52 rounded-[14px] bg-[#F0F0F0]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#E5E5E5]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
