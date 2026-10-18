"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/components/ui";

export function UserAvatar({ name, image, size = "sm", priority = false, className }: { name: string; image?: string | null; size?: "sm" | "lg"; priority?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const sizes = size === "lg" ? "h-28 w-28 text-2xl" : "h-10 w-10 text-xs";
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-iium-gold font-bold text-white", sizes, className)}>
      {image && !failed ? (
        <Image src={image} alt={`${name}'s profile photo`} fill sizes={size === "lg" ? "112px" : "40px"} className="object-cover" priority={priority} onError={() => setFailed(true)} referrerPolicy="no-referrer" />
      ) : initials}
    </span>
  );
}
