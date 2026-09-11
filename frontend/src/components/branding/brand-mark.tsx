import Image from "next/image";

import styles from "./brand-mark.module.css";

type BrandMarkProps = {
  className?: string;
  label?: string;
  size?: number;
  tone?: "auto" | "light" | "dark";
};

/** One approved silhouette for both themes; light/dark describe the ink color. */
export function BrandMark({
  className,
  label,
  size = 32,
  tone = "auto",
}: BrandMarkProps) {
  return (
    <span
      className={[styles.mark, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      data-tone={tone}
      aria-hidden={label ? undefined : true}
    >
      <Image
        className={styles.artwork}
        src="/brand/cr-solid.png"
        alt={label ?? ""}
        width={96}
        height={96}
        sizes={`${size}px`}
      />
    </span>
  );
}
