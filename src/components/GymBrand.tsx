import { Dumbbell } from "lucide-react";
import elevateLogo from "@/assets/elevate-logo.png";

type GymBrandProps = {
  gymName?: string | null;
  gymLogoUrl?: string | null;
  gymColor?: string | null;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { logo: "h-8", iconWrap: "w-8 h-8", icon: "h-4 w-4", text: "text-base" },
  md: { logo: "h-10", iconWrap: "w-10 h-10", icon: "h-5 w-5", text: "text-xl" },
  lg: { logo: "h-12", iconWrap: "w-12 h-12", icon: "h-6 w-6", text: "text-2xl" },
} as const;

export function GymBrand({
  gymName,
  gymLogoUrl,
  gymColor,
  size = "md",
  showName = false,
  className = "",
}: GymBrandProps) {
  const styles = sizeMap[size];
  const hasCustomBrand = Boolean(gymName && gymName !== "Elevate Lindora");

  if (gymLogoUrl) {
    return (
      <img
        src={gymLogoUrl}
        alt={gymName || "Gym"}
        className={`${styles.logo} object-contain ${className}`.trim()}
      />
    );
  }

  if (hasCustomBrand) {
    return (
      <div className={`flex items-center gap-2 ${className}`.trim()}>
        <div
          className={`${styles.iconWrap} rounded-lg flex items-center justify-center`}
          style={{ backgroundColor: `${gymColor || "#6366f1"}15`, color: gymColor || "#6366f1" }}
        >
          <Dumbbell className={styles.icon} />
        </div>
        {showName && (
          <span className={`${styles.text} font-black tracking-tight font-display truncate`}>
            {gymName}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={elevateLogo}
      alt="Elevate"
      className={`${styles.logo} object-contain invert dark:invert-0 ${className}`.trim()}
    />
  );
}