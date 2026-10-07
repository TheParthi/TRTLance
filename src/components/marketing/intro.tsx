/**
 * First-visit intro: the paper lifts away after a counter fills the escrow (about a second). It is
 * pure CSS, ignores the pointer, and is skipped on repeat visits in the same session and for
 * reduced-motion visitors (the inline script marks the visit before the first paint).
 */
export function Intro() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: "try{var d=document.documentElement;if(sessionStorage.getItem('tl-intro')||matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.intro='seen'}else{sessionStorage.setItem('tl-intro','1')}}catch(e){}",
        }}
      />
      <div aria-hidden className="intro pointer-events-none fixed inset-0 z-[90] flex flex-col justify-end bg-canvas">
        <div className="container pb-10 md:pb-14">
          <div className="flex items-end justify-between gap-6">
            <p className="font-display text-[clamp(2.5rem,7vw,6rem)] font-medium leading-none tracking-[-0.04em]">TrustLance</p>
            <p className="intro-count t-mono pb-2 text-sm text-ink-secondary">
              <span className="intro-count-value" /> coins secured
            </p>
          </div>
          <div className="mt-6 h-1 overflow-hidden rounded-full bg-ink/10">
            <div className="intro-bar h-full origin-left rounded-full bg-signal" />
          </div>
        </div>
      </div>
    </>
  );
}
