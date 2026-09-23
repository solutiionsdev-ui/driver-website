"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";

import { Spring } from "@/components/animation/springs/spring";
import { useScroll } from "@/hooks/smooth-scroll/use-scroll";
import type { HomeContent } from "@/data/mocks/home";

export interface HeroNavProps {
  brand: HomeContent["hero"]["brand"];
  nav: HomeContent["hero"]["nav"];
  garage: HomeContent["hero"]["garage"];
  className?: string;
}

/** Where the masthead stops being a masthead and becomes a burger. */
const DESKTOP_QUERY = "(min-width: 1280px)";

const SHEET_CONFIG = { tension: 190, friction: 26 };
const ITEM_CONFIG = { tension: 170, friction: 24 };

// Module constants on purpose: `Spring` feeds these straight into `useSpring`,
// so a fresh object literal per render re-seeds the spring from `from` every
// frame and it never reaches `to` — it parks partway instead.
const SHEET_FROM = { opacity: 0 };
const SHEET_TO = { opacity: 1 };
const ITEM_FROM = { opacity: 0, transform: "translateY(0.75rem)" };
const ITEM_TO = { opacity: 1, transform: "translateY(0rem)" };
/** Per-link offset into the sheet's entrance, in ms. */
const ITEM_STAGGER = 55;

const LINK =
  "whitespace-nowrap text-label uppercase leading-flat text-foreground transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent";

/**
 * Hero masthead. From `xl` it is the frame's layout: logo left, garage link
 * right, nav pinned to the *page's* centre line — the design centres it on the
 * frame, not between those two, and they are different widths.
 *
 * Below `xl` the five links no longer fit beside the logo, so they move into a
 * full-screen sheet. A dropdown was tried first and read badly: it hung a
 * cramped list directly off the button. The sheet gives the links the page,
 * sets them in the display size, and staggers them in — and the trigger is no
 * longer touching them.
 *
 * The sheet is portalled to `body` on purpose. The masthead animates in on a
 * spring, and a transformed ancestor makes `position: fixed` resolve against
 * *it* rather than the viewport, so a sheet rendered in place would be pinned
 * inside the header instead of covering the page.
 */
export const HeroNav = ({ brand, nav, garage, className }: HeroNavProps) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const sheetId = useId();

  const stopScroll = useScroll((state) => state.stop);
  const startScroll = useScroll((state) => state.start);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setMounted(true), []);

  // Lenis keeps running behind a fixed overlay unless it is told not to.
  useEffect(() => {
    if (open) stopScroll();
    else startScroll();
  }, [open, stopScroll, startScroll]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Past `xl` the links live in the masthead again, so a sheet left open on a
  // resize would be a second copy of them.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = () => {
      if (query.matches) setOpen(false);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const items = [...nav, garage];

  return (
    <header
      className={`relative flex items-center justify-between ${className ?? ""}`}
    >
      <Link href={brand.href} aria-label={brand.name}>
        <Image
          src={brand.logo}
          alt={brand.name}
          width={106}
          height={24}
          priority
          className="h-[1.5rem] w-auto"
        />
      </Link>

      <nav
        aria-label="Primary"
        className="hidden xl:absolute xl:left-1/2 xl:block xl:-translate-x-1/2"
      >
        <ul className="flex items-center gap-16">
          {nav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={LINK}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Link href={garage.href} className={`hidden font-bold xl:block ${LINK}`}>
        <span aria-hidden>[ </span>
        {garage.label}
        <span aria-hidden> → ]</span>
      </Link>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={sheetId}
        className="-mr-2 cursor-pointer p-2 xl:hidden"
      >
        <span className="sr-only">Open menu</span>
        <span aria-hidden className="flex w-6 flex-col gap-[0.3125rem]">
          <span className="block h-px w-full bg-foreground" />
          <span className="block h-px w-full bg-foreground" />
        </span>
      </button>

      {mounted &&
        open &&
        createPortal(
          <Spring
            tag="div"
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            mode="always"
            enabled
            config={SHEET_CONFIG}
            from={SHEET_FROM}
            to={SHEET_TO}
            className="fixed inset-0 z-50 flex flex-col bg-background px-8 py-6 xl:hidden"
          >
            <div className="flex items-center justify-between">
              <Link href={brand.href} aria-label={brand.name} onClick={close}>
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={106}
                  height={24}
                  className="h-[1.5rem] w-auto"
                />
              </Link>

              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="-mr-2 cursor-pointer p-2"
              >
                <span className="sr-only">Close menu</span>
                <span aria-hidden className="relative block size-6">
                  <span className="absolute inset-x-0 top-1/2 block h-px rotate-45 bg-foreground" />
                  <span className="absolute inset-x-0 top-1/2 block h-px -rotate-45 bg-foreground" />
                </span>
              </button>
            </div>

            <nav
              aria-label="Primary"
              className="flex flex-1 flex-col justify-center"
            >
              <ul className="flex flex-col gap-4 sm:gap-6">
                {items.map((item, index) => (
                  <li key={item.href}>
                    <Spring
                      tag="div"
                      mode="once"
                      enabled
                      config={ITEM_CONFIG}
                      delayIn={120 + index * ITEM_STAGGER}
                      from={ITEM_FROM}
                      to={ITEM_TO}
                    >
                      <Link
                        href={item.href}
                        onClick={close}
                        className="font-display text-heading font-bold uppercase leading-headline text-foreground transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent sm:text-display"
                      >
                        {item.label}
                      </Link>
                    </Spring>
                  </li>
                ))}
              </ul>
            </nav>
          </Spring>,
          document.body,
        )}
    </header>
  );
};
