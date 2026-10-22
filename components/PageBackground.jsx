import background from "@/components/Img/brand-background.webp";

/* The brand photograph behind every screen, fixed so the knight stays put
   while the cards scroll over it.

   The knight stands about halfway down the photograph. Covering the viewport
   from its top edge would put it level with the hero headline on a laptop, so
   the photograph starts a little way down and is sized to the viewport's
   width (never shorter than the viewport): the knight then lands below the
   headline from 1280×800 up to 1920×1080. The strip above it is the page
   colour, and the photograph's own pale sky fades into it, so there is no
   seam.

   The overlays are theme tokens: a cream wash by day, a navy one at night,
   and a near-solid wash on phones so no text ever sits directly on the
   photograph. */
export default function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: "var(--page-bg)" }}>
      <div className="absolute inset-x-0 bg-cover bg-left-top bg-no-repeat"
        style={{
          top: "8vh",
          height: "max(100vh, 66.67vw)",
          backgroundImage: `url(${background.src})`,
          opacity: "var(--page-image-opacity)",
        }} />
      <div className="absolute inset-x-0 top-0 h-[28vh]"
        style={{ background: "linear-gradient(180deg, var(--page-bg) 30%, transparent)" }} />
      <div className="absolute inset-0 hidden lg:block" style={{ background: "var(--page-overlay)" }} />
      <div className="absolute inset-0 lg:hidden" style={{ background: "var(--page-overlay-mobile)" }} />
    </div>
  );
}
