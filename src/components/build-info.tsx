function formatBuildTime(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getBuildMeta() {
  const version =
    process.env.NEXT_PUBLIC_APP_VERSION ??
    process.env.npm_package_version ??
    "dev";
  const commit =
    process.env.NEXT_PUBLIC_GIT_SHA ??
    process.env.AWS_COMMIT_ID ??
    null;
  const branch = process.env.NEXT_PUBLIC_APP_BRANCH ?? process.env.AWS_BRANCH ?? null;
  const buildTime = formatBuildTime(process.env.NEXT_PUBLIC_BUILD_TIME ?? null);

  return {
    version,
    commit: commit ? commit.slice(0, 7) : null,
    branch,
    buildTime,
  };
}

type BuildInfoProps = {
  compact?: boolean;
  className?: string;
};

export function BuildInfo({ compact = false, className = "" }: BuildInfoProps) {
  const meta = getBuildMeta();
  const parts = [
    `v${meta.version}`,
    meta.commit ? `#${meta.commit}` : null,
    meta.branch ? meta.branch : null,
    meta.buildTime ? meta.buildTime : null,
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

