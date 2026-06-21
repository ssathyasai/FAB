"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("fab_token");
    router.replace(token ? "/budget/overview" : "/login");
  }, [router]);
  return null;
}
