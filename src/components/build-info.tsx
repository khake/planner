import { getBuildInfo } from "@/lib/build-info";

function formatBuildTime(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type BuildInfoProps = {
  compact?: boolean;
  className?: string;
};

export function BuildInfo({ compact = false, className = "" }: BuildInfoProps) {
  const meta = getBuildInfo();
  const buildTimeFormatted = formatBuildTime(meta.buildTime || null);
  const parts = [
    `v${meta.version}`,
    meta.commit ? `#${meta.commit}` : null,
    meta.branch ? meta.branch : null,
    buildTimeFormatted,
  ].filter(Boolean);

  return (
    <div
      className={`text-xs text-[#757575] ${compact ? "rounded-full border border-[#E8E8E8] bg-white/80 px-3 py-1.5" : ""} ${className}`.trim()}
      aria-label="build information"
      title={parts.join(" · ")}
    >
      <span className="font-medium text-[#555555]">Build</span>
      <span className="ml-2">{parts.join(" · ")}</span>
    </div>
  );
}
