"use client";
import { useEffect } from "react";
import { registrationMarkup } from "@/lib/registration-markup";
import { initRegistration } from "@/lib/registration";

export default function Registration() {
  useEffect(() => { initRegistration(); }, []);
  return (
    <aside
      className="registration overlay"
      id="registration"
      aria-hidden="true"
      data-lenis-prevent
      dangerouslySetInnerHTML={{ __html: registrationMarkup }}
    />
  );
}
