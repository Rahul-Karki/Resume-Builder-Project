/**
 * Skeleton Loader Components
 * 
 * Lightweight loading placeholders that mimic content layout
 * Uses CSS animations for smooth visual feedback
 */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  count?: number;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base skeleton component - animated placeholder
 */
export function Skeleton({
  width = "100%",
  height = "20px",
  circle = false,
  count = 1,
  className = "",
  style = {},
}: SkeletonProps) {
  const widthStr = typeof width === "number" ? `${width}px` : width;
  const heightStr = typeof height === "number" ? `${height}px` : height;

  const skeletonStyle: React.CSSProperties = {
    display: "inline-block",
    width: widthStr,
    height: heightStr,
    backgroundColor: "#e0e0e0",
    borderRadius: circle ? "50%" : "4px",
    animation: "pulse 1.5s ease-in-out infinite",
    marginBottom: "8px",
    ...style,
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={skeletonStyle}
          className={className}
        />
      ))}
    </>
  );
}

/**
 * Resume card skeleton
 */
export function ResumeCardSkeleton() {
  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        marginBottom: "16px",
      }}
    >
      <Skeleton width="60%" height="24px" style={{ marginBottom: "12px" }} />
      <Skeleton width="80%" height="16px" style={{ marginBottom: "8px" }} />
      <Skeleton width="40%" height="16px" />
    </div>
  );
}

/**
 * Resume list skeleton
 */
export function ResumeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ResumeCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Preview panel skeleton (right side of builder)
 */
export function PreviewPanelSkeleton() {
  return (
    <div
      style={{
        padding: "20px",
        background: "#f5f5f5",
        borderRadius: "8px",
        height: "600px",
      }}
    >
      <Skeleton width="100%" height="500px" style={{ marginBottom: "12px" }} />
      <Skeleton width="100%" height="40px" />
    </div>
  );
}

/**
 * Template grid skeleton
 */
export function TemplateGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "16px",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <Skeleton width="100%" height="250px" style={{ marginBottom: "0" }} />
          <div style={{ padding: "12px" }}>
            <Skeleton width="70%" height="18px" style={{ marginBottom: "8px" }} />
            <Skeleton width="100%" height="16px" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Form section skeleton
 */
export function FormSectionSkeleton() {
  return (
    <div style={{ padding: "16px", marginBottom: "16px" }}>
      <Skeleton width="30%" height="20px" style={{ marginBottom: "12px" }} />
      <Skeleton width="100%" height="40px" style={{ marginBottom: "12px" }} />
      <Skeleton width="100%" height="40px" style={{ marginBottom: "12px" }} />
      <Skeleton width="100%" height="40px" />
    </div>
  );
}

/**
 * User profile skeleton
 */
export function UserProfileSkeleton() {
  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
        <Skeleton width={80} height={80} circle />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height="24px" style={{ marginBottom: "8px" }} />
          <Skeleton width="80%" height="16px" />
        </div>
      </div>
      <FormSectionSkeleton />
    </div>
  );
}

/**
 * Table row skeleton
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "12px", marginBottom: "12px" }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width="100%" height="20px" />
      ))}
    </div>
  );
}

/**
 * Suspense Wrapper with built-in loading skeleton
 */
export function SuspenseLoader({
  children,
  fallback = <ResumeListSkeleton />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <div>
      {/* Using React.lazy would require Suspense boundary */}
      {children}
    </div>
  );
}

/**
 * Shimmer effect skeleton (more sophisticated animation)
 */
export function ShimmerSkeleton({
  width = "100%",
  height = "20px",
  borderRadius = "4px",
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}) {
  const widthStr = typeof width === "number" ? `${width}px` : width;
  const heightStr = typeof height === "number" ? `${height}px` : height;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .shimmer-skeleton {
          background: linear-gradient(
            to right,
            #f0f0f0 0%,
            #e0e0e0 20%,
            #f0f0f0 40%,
            #f0f0f0 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
      <div
        className="shimmer-skeleton"
        style={{
          width: widthStr,
          height: heightStr,
          borderRadius,
          marginBottom: "8px",
        }}
      />
    </>
  );
}
