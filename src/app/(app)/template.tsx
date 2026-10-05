/** Re-mounts on every navigation, so each page rises into place once (skipped with reduced motion). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
