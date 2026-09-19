export default function Loading() {
  return (
    <div className="min-h-[100svh] bg-[#F5F5F7] pb-16 animate-pulse">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-5">
        <div className="w-10 h-10 rounded-full bg-[#E5E5E5] shrink-0" />
        <div className="h-4 w-44 rounded-[14px] bg-[#E5E5E5]" />
      </header>

      {/* Hero */}
      <div className="mx-5 mb-6 rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="h-5 w-40 rounded-[14px] bg-[#E5E5E5] mb-3" />
        <div className="h-6 w-48 rounded-[14px] bg-[#E5E5E5] mb-2" />
        <div className="h-4 w-64 rounded-[14px] bg-[#F0F0F0]" />
      </div>

      {/* Quiz form */}
      <div className="px-5 pb-16 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          >
            <div className="h-5 w-56 rounded-[14px] bg-[#E5E5E5] mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div
                  key={j}
                  className="h-12 rounded-[14px] bg-[#F0F0F0] border border-[#E5E5E5]"
                />
              ))}
            </div>
          </div>
        ))}

        <div className="h-14 rounded-[20px] bg-[#E5E5E5]" />
      </div>
    </div>
  );
}
