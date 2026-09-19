export default function Loading() {
  return (
    <div className="min-h-[100svh] bg-[#F5F5F7] pb-16 animate-pulse">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-full bg-[#E5E5E5]" />
          <div className="space-y-2">
            <div className="h-4 w-36 rounded-[14px] bg-[#E5E5E5]" />
            <div className="h-3 w-28 rounded-[14px] bg-[#F0F0F0]" />
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#E5E5E5]" />
      </header>

      {/* Hero */}
      <div className="mx-5 mb-6 rounded-[24px] bg-white p-5 min-h-[160px] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="h-6 w-24 rounded-[14px] bg-[#E5E5E5] mb-4" />
        <div className="h-7 w-48 rounded-[14px] bg-[#E5E5E5] mb-2" />
        <div className="h-7 w-36 rounded-[14px] bg-[#E5E5E5] mb-3" />
        <div className="h-4 w-52 rounded-[14px] bg-[#F0F0F0]" />
      </div>

      {/* Week strip */}
      <div className="flex justify-between gap-1.5 px-5 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-16 rounded-[14px] bg-white border border-[#E5E5E5] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-2"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-[#E5E5E5] mx-auto mb-1" />
            <div className="h-2.5 w-7 rounded-[14px] bg-[#F0F0F0] mx-auto mb-1" />
            <div className="h-3 w-5 rounded-[14px] bg-[#E5E5E5] mx-auto" />
          </div>
        ))}
      </div>

      {/* Courses section */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-36 rounded-[14px] bg-[#E5E5E5]" />
          <div className="h-5 w-20 rounded-[14px] bg-[#F0F0F0]" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-[280px] min-h-[180px] rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
            >
              <div className="h-5 w-16 rounded-[14px] bg-[#E5E5E5] mb-6" />
              <div className="h-6 w-40 rounded-[14px] bg-[#E5E5E5] mb-2" />
              <div className="h-4 w-48 rounded-[14px] bg-[#F0F0F0] mb-5" />
              <div className="h-4 w-24 rounded-[14px] bg-[#E5E5E5]" />
            </div>
          ))}
        </div>
      </section>

      {/* Quizzes section */}
      <section className="px-5 pb-16">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-40 rounded-[14px] bg-[#E5E5E5]" />
          <div className="h-5 w-20 rounded-[14px] bg-[#F0F0F0]" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-[280px] min-h-[180px] rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
            >
              <div className="h-5 w-16 rounded-[14px] bg-[#E5E5E5] mb-6" />
              <div className="h-6 w-40 rounded-[14px] bg-[#E5E5E5] mb-2" />
              <div className="h-4 w-48 rounded-[14px] bg-[#F0F0F0] mb-5" />
              <div className="h-4 w-24 rounded-[14px] bg-[#E5E5E5]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
