'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/** Money state of one arc, mirroring the escrow rail. */
export type RingState = 'unfunded' | 'secured' | 'review' | 'changes' | 'approved' | 'released' | 'disputed' | 'refunded';
export type RingMilestone = { amount: number; state: RingState };
export type RingMoment = { milestone: number; state: string; amount: number };

const DEMO_AMOUNTS = [120, 180, 300];
/** The example contract the landing ring plays on a loop: fund everything, then review and release each milestone. */
const SCRIPT: { at: number; states: RingState[]; moment: RingMoment }[] = [
  { at: 0, states: ['unfunded', 'unfunded', 'unfunded'], moment: { milestone: 0, state: 'Signed by both sides', amount: 600 } },
  { at: 1.8, states: ['secured', 'secured', 'secured'], moment: { milestone: 0, state: 'Secured in escrow', amount: 600 } },
  { at: 3.8, states: ['review', 'secured', 'secured'], moment: { milestone: 1, state: 'Under review', amount: 120 } },
  { at: 5.6, states: ['released', 'secured', 'secured'], moment: { milestone: 1, state: 'Released', amount: 120 } },
  { at: 7.4, states: ['released', 'review', 'secured'], moment: { milestone: 2, state: 'Under review', amount: 180 } },
  { at: 9.2, states: ['released', 'released', 'secured'], moment: { milestone: 2, state: 'Released', amount: 180 } },
  { at: 11.0, states: ['released', 'released', 'review'], moment: { milestone: 3, state: 'Under review', amount: 300 } },
  { at: 12.8, states: ['released', 'released', 'released'], moment: { milestone: 3, state: 'Released', amount: 300 } },
];
const LOOP = 16;
const GAP = 0.075;

const STRIPED: RingState[] = ['review', 'changes', 'disputed'];

/**
 * The escrow ring — TrustLance's signature object. The escrow rail bent into a lit, ceramic seal:
 * one arc per milestone sized by its amount and coloured by its money state, with a bead of money
 * running round once funded. Pass real `milestones`, or `demo` to play the example contract.
 * Decorative: the same facts are always written next to it.
 */
export function EscrowRing({ milestones, demo, className, onMoment, focus, onDark = false }: {
  milestones?: RingMilestone[];
  demo?: boolean;
  className?: string;
  onMoment?: (m: RingMoment) => void;
  /** Index of the milestone to lift towards the viewer (the one that needs attention). */
  focus?: number | null;
  /** Drawn on an ink ground: linework turns light. */
  onDark?: boolean;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const momentRef = React.useRef(onMoment);
  momentRef.current = onMoment;
  const dataRef = React.useRef({ milestones, focus });
  dataRef.current = { milestones, focus };
  const shape = (demo ? DEMO_AMOUNTS : (milestones ?? []).map((m) => m.amount)).join(',');

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      if (disposed) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const small = window.matchMedia('(max-width: 767px)').matches;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      } catch {
        return; // No WebGL: the written facts beside the ring carry the story.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.92;
      const canvas = renderer.domElement;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 900ms cubic-bezier(.2,0,0,1)';
      host.appendChild(canvas);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      scene.environmentIntensity = 0.75;
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0, 11);

      const hsl = (name: string) => {
        const [h, s, l] = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(/\s+/);
        return new THREE.Color().setHSL(parseFloat(h) / 360, parseFloat(s) / 100, parseFloat(l) / 100, THREE.SRGBColorSpace);
      };
      const palette: Record<RingState | 'ink', import('three').Color> = {
        unfunded: hsl('line-strong'),
        secured: hsl('brand'),
        review: hsl('info'),
        changes: hsl('warning'),
        approved: hsl('success').lerp(new THREE.Color(1, 1, 1), 0.35),
        released: hsl('signal'),
        disputed: hsl('danger'),
        refunded: hsl('refund'),
        ink: hsl(onDark ? 'ink-inverse' : 'ink'),
      };

      // Diagonal stripes for "in progress" states, so colour is never the only signal.
      const stripeCanvas = document.createElement('canvas');
      stripeCanvas.width = 64;
      stripeCanvas.height = 64;
      const sc = stripeCanvas.getContext('2d')!;
      sc.fillStyle = '#fff';
      sc.fillRect(0, 0, 64, 64);
      sc.strokeStyle = 'rgba(0,0,0,0.28)';
      sc.lineWidth = 10;
      for (let i = -64; i < 128; i += 22) {
        sc.beginPath();
        sc.moveTo(i, 0);
        sc.lineTo(i + 64, 64);
        sc.stroke();
      }
      const stripes = new THREE.CanvasTexture(stripeCanvas);
      stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
      stripes.repeat.set(18, 1);
      stripes.colorSpace = THREE.SRGBColorSpace;

      const disposables: { dispose: () => void }[] = [envTex, pmrem, stripes];
      const track = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);

      const root = new THREE.Group();
      scene.add(root);
      const tilt = new THREE.Group();
      tilt.rotation.x = -0.5;
      root.add(tilt);
      const ring = new THREE.Group();
      tilt.add(ring);

      const amounts = demo ? DEMO_AMOUNTS : (dataRef.current.milestones ?? []).map((m) => Math.max(0.0001, m.amount));
      const total = amounts.reduce((a, b) => a + b, 0) || 1;
      const R = 2.3;
      const gap = amounts.length > 1 ? GAP : 0.0001;

      type Arc = { holder: import('three').Group; solid: import('three').MeshPhysicalMaterial; wire: import('three').MeshBasicMaterial; color: import('three').Color; opacity: number; glow: number; lift: number; mid: number };
      let angle = Math.PI / 2;
      const arcs: Arc[] = amounts.map((amount) => {
        const span = Math.max(0.05, (amount / total) * Math.PI * 2 - gap);
        const geo = track(new THREE.TorusGeometry(R, 0.24, 40, Math.max(32, Math.round(span * 48)), span));
        const solid = track(new THREE.MeshPhysicalMaterial({
          color: palette.unfunded.clone(), roughness: 0.3, metalness: 0.18, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.4, sheenRoughness: 0.5,
          transparent: true, opacity: 0.3, emissive: new THREE.Color(0), map: null,
        }));
        const wireMat = track(new THREE.MeshBasicMaterial({ color: palette.ink, wireframe: true, transparent: true, opacity: 0.14 }));
        const wire = new THREE.Mesh(geo, wireMat);
        const holder = new THREE.Group();
        const start = angle - span - gap / 2;
        holder.rotation.z = start;
        holder.add(new THREE.Mesh(geo, solid), wire);
        ring.add(holder);
        angle -= span + gap;
        return { holder, solid, wire: wireMat, color: palette.unfunded.clone(), opacity: 0.3, glow: 0, lift: 0, mid: start + span / 2 };
      });

      // Vault core and a measuring dial: quiet linework that makes the object read as an instrument.
      const core = new THREE.LineSegments(
        track(new THREE.WireframeGeometry(track(new THREE.IcosahedronGeometry(1.2, 2)))),
        track(new THREE.LineBasicMaterial({ color: palette.ink, transparent: true, opacity: 0.075 })),
      );
      tilt.add(core);
      const ticks: number[] = [];
      for (let i = 0; i < 144; i++) {
        const a = (i / 144) * Math.PI * 2;
        const r2 = i % 12 === 0 ? 3.2 : 3.02;
        ticks.push(Math.cos(a) * 2.9, Math.sin(a) * 2.9, 0, Math.cos(a) * r2, Math.sin(a) * r2, 0);
      }
      const tickGeo = track(new THREE.BufferGeometry());
      tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
      const dial = new THREE.LineSegments(tickGeo, track(new THREE.LineBasicMaterial({ color: palette.ink, transparent: true, opacity: 0.2 })));
      tilt.add(dial);

      // Soft contact shadow under the ring.
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = shadowCanvas.height = 128;
      const sh = shadowCanvas.getContext('2d')!;
      const grad = sh.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(10,20,25,0.22)');
      grad.addColorStop(1, 'rgba(10,20,25,0)');
      sh.fillStyle = grad;
      sh.fillRect(0, 0, 128, 128);
      const shadowTex = track(new THREE.CanvasTexture(shadowCanvas));
      const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(7.5, 2.2)), track(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
      shadow.position.set(0, -3.35, -0.5);
      root.add(shadow);

      // Money: a bead with a fading tail that runs round the funded ring.
      const beads = Array.from({ length: 7 }, (_, i) => {
        const m = new THREE.Mesh(
          track(new THREE.SphereGeometry(0.085 - i * 0.009, 20, 20)),
          track(new THREE.MeshBasicMaterial({ color: palette.released, transparent: true, opacity: 1 - i * 0.13 })),
        );
        ring.add(m);
        return m;
      });

      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(-5, 6, 8);
      scene.add(key);
      const glowLight = new THREE.PointLight(palette.released, 0, 9);
      glowLight.position.set(0, 0, 2.2);
      scene.add(glowLight);

      const resize = () => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        // Keep the whole ring in frame on tall, narrow hosts.
        camera.position.z = camera.aspect < 1 ? 11 / Math.max(0.62, camera.aspect) : 11;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      const onMove = (e: PointerEvent) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      let lastScript = -1;
      let visible = true;
      let raf = 0;
      const start = performance.now();

      const statesNow = (t: number): RingState[] => {
        if (!demo) return (dataRef.current.milestones ?? []).map((m) => m.state);
        const loopT = reduced ? 6 : ((t - start) / 1000) % LOOP;
        let idx = 0;
        for (let i = 0; i < SCRIPT.length; i++) if (loopT >= SCRIPT[i].at) idx = i;
        if (idx !== lastScript) {
          lastScript = idx;
          momentRef.current?.(SCRIPT[idx].moment);
        }
        return SCRIPT[idx].states;
      };

      const apply = (t: number, dt: number) => {
        const states = statesNow(t);
        const k = reduced ? 1 : Math.min(1, dt * 5);
        const focus = demo ? states.findIndex((s) => s === 'review') : dataRef.current.focus ?? -1;
        let glowTarget = 0;
        arcs.forEach((arc, i) => {
          const s = states[i] ?? 'unfunded';
          arc.color.lerp(palette[s], k);
          arc.opacity += ((s === 'unfunded' ? 0.28 : 1) - arc.opacity) * k;
          arc.glow += ((s === 'released' ? 0.45 : 0) - arc.glow) * k;
          arc.lift += ((i === focus ? 1 : 0) - arc.lift) * k;
          arc.solid.color.copy(arc.color);
          arc.solid.opacity = arc.opacity;
          // The wire cage reads as "drafted, not funded"; it fades once money is in.
          arc.wire.opacity += ((s === 'unfunded' ? 0.14 : 0) - arc.wire.opacity) * k;
          arc.wire.visible = arc.wire.opacity > 0.01;
          arc.solid.emissive.copy(arc.color).multiplyScalar(arc.glow);
          const wantStripes = STRIPED.includes(s);
          if ((arc.solid.map === stripes) !== wantStripes) {
            arc.solid.map = wantStripes ? stripes : null;
            arc.solid.needsUpdate = true;
          }
          // The milestone that needs attention steps towards the viewer.
          arc.holder.position.set(Math.cos(arc.mid) * arc.lift * 0.22, Math.sin(arc.mid) * arc.lift * 0.22, arc.lift * 0.35);
          if (s === 'released') glowTarget += 1;
        });
        glowLight.intensity += ((glowTarget ? 6 : 0) - glowLight.intensity) * k;
        const funded = states.some((s) => s !== 'unfunded');
        const speed = 1.05;
        beads.forEach((b, i) => {
          const a = Math.PI / 2 - ((t - start) / 1000) * speed - i * 0.065;
          b.position.set(Math.cos(a) * R, Math.sin(a) * R, 0.28);
          b.visible = funded && !reduced;
        });
      };

      let last = performance.now();
      const frame = (t: number) => {
        raf = 0;
        if (!visible || disposed) return;
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        root.rotation.y = pointer.x * 0.38;
        root.rotation.x = pointer.y * 0.22;
        root.position.y = Math.sin(t * 0.0008) * 0.06;
        ring.rotation.z += dt * 0.045;
        core.rotation.y += dt * 0.1;
        core.rotation.x += dt * 0.04;
        dial.rotation.z -= dt * 0.025;
        apply(t, dt);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };

      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !reduced && !raf) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      });
      io.observe(host);
      const onVisibility = () => {
        if (document.hidden) visible = false;
        else if (host.getBoundingClientRect().bottom > 0) {
          visible = true;
          if (!reduced && !raf) {
            last = performance.now();
            raf = requestAnimationFrame(frame);
          }
        }
      };
      document.addEventListener('visibilitychange', onVisibility);

      apply(performance.now(), 1);
      renderer.render(scene, camera);
      requestAnimationFrame(() => (canvas.style.opacity = '1'));
      if (!reduced) raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('visibilitychange', onVisibility);
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        canvas.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [demo, shape, onDark]);

  return <div ref={hostRef} aria-hidden className={cn('relative', className)} />;
}
