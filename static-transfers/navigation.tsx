import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";

// This entry is a browser application, outside the Next router. Its shared UI
// links use document navigation and refresh only refetches the protected DTO.
export function useRouter() {
  return {
    refresh() {
      window.dispatchEvent(new Event("transfers:refresh"));
    },
  };
}
export function usePathname() {
  return window.location.pathname;
}
export function Link({
  prefetch: _prefetch,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) {
  return <a {...props} />;
}
export function Image({
  fill,
  alt = "",
  priority: _priority,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
}) {
  return (
    // A native image avoids running the Next image optimizer on the Worker.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      {...props}
      style={{
        ...props.style,
        ...(fill
          ? { position: "absolute", height: "100%", width: "100%", inset: 0 }
          : {}),
      }}
    />
  );
}
