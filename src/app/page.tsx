"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/utils/auth-client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data?.session) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    });
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <span className="font-sans text-body-md text-primary">Initialising security perimeter...</span>
    </div>
  );
}
