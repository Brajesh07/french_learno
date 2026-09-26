/** Safe, read-only media presentation shared by student and admin pages. */
function mediaUrl(value: string | null) {
  try {
    const url = new URL(value ?? "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function videoEmbed(value: string) {
  const url = new URL(value);
  const id = ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
    url.hostname,
  )
    ? (url.searchParams.get("v") ??
      url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1])
    : url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : null;
  return id && /^[\w-]{11}$/.test(id)
    ? `https://www.youtube-nocookie.com/embed/${id}`
    : null;
}
export function CourseMedia({
  title,
  imageUrl,
  audioUrl,
  videoUrl,
}: {
  title: string;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
}) {
  const image = mediaUrl(imageUrl),
    audio = mediaUrl(audioUrl),
    video = mediaUrl(videoUrl);
  const embed = video ? videoEmbed(video) : null;
  return (
    <>
      {image && (
        <figure className="min-w-0">
          {/* Teacher media hosts vary; plain img avoids a broad Next image allowlist. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={`Course illustration for ${title}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="mx-auto max-h-[420px] max-w-full rounded-2xl object-contain"
          />
        </figure>
      )}
      {audio && (
        <section className="grid min-w-0 gap-3">
          <h2 className="font-semibold">Listen along</h2>
          <audio
            aria-label="Course audio"
            controls
            preload="none"
            src={audio}
            className="w-full"
          />
          <a
            href={audio}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-violet-700 underline"
          >
            Open audio separately
          </a>
        </section>
      )}
      {video && (
        <section className="grid min-w-0 gap-3">
          <h2 className="font-semibold">Watch and learn</h2>
          {embed ? (
            <iframe
              src={embed}
              title="Course video"
              loading="lazy"
              referrerPolicy="no-referrer"
              allow="fullscreen"
              allowFullScreen
              className="aspect-video w-full rounded-2xl border-0"
            />
          ) : (
            <video
              controls
              preload="none"
              src={video}
              aria-label="Course video"
              className="max-h-[420px] w-full rounded-2xl"
            />
          )}
          <a
            href={video}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-violet-700 underline"
          >
            Open video separately
          </a>
        </section>
      )}
    </>
  );
}
