/**
 * Seed events mirroring what runs on fleg.in today, shaped like ./events-live.
 * Replaced by the `events_v_public` read-view at cutover; screens never import this.
 */
import type { EventSummary, EventDetail } from "./events-live";

export const SEED_EVENTS: EventSummary[] = [
  {
    slug: "nspg26", title: "Nagaland State & Para Games 2026", kind: "tournament", sport: null,
    status: "live", startDate: "2026-11-02T09:00:00+05:30", city: "Chümoukedima", venue: "Multiple venues",
    bannerUrl: null, paid: false, priceFrom: null, isNspg: true, organiser: "Nagaland Olympic Association",
  },
  {
    slug: "rmlcf-pickleball", title: "RMLCF Pickleball Fundraiser", kind: "fundraiser", sport: "pickleball",
    status: "past", startDate: "2026-09-28T08:00:00+05:30", city: "Kohima", venue: "Kohima",
    bannerUrl: null, paid: true, priceFrom: 500, isNspg: false, organiser: "RMLCF",
  },
  {
    slug: "coffee-run-2", title: "Coffee Run 2", kind: "run", sport: "running",
    status: "past", startDate: "2026-09-20T05:30:00+05:30", city: "Diphu", venue: "Yimi Cafe",
    bannerUrl: null, paid: true, priceFrom: 300, isNspg: false, organiser: "Dash Nation × Yimi Cafe",
  },
  {
    slug: "nagaland-darts", title: "Nagaland Darts Open", kind: "tournament", sport: "darts",
    status: "registration_open", startDate: "2026-12-06T10:00:00+05:30", city: "Dimapur", venue: "TBA",
    bannerUrl: null, paid: true, priceFrom: 300, isNspg: false, organiser: "Nagaland Darts Association",
  },
  {
    slug: "womens-pickleball-clinic", title: "Women's Pickleball Clinic", kind: "clinic", sport: "pickleball",
    status: "registration_open", startDate: "2026-11-23T09:00:00+05:30", city: "Kohima", venue: "Kohima",
    bannerUrl: null, paid: false, priceFrom: null, isNspg: false, organiser: "FLEG",
  },
  {
    slug: "one-nagaland-run", title: "One Nagaland Run", kind: "run", sport: "running",
    status: "upcoming", startDate: "2027-01-12T05:30:00+05:30", city: "Kohima", venue: "Kohima",
    bannerUrl: null, paid: true, priceFrom: 500, isNspg: false, organiser: "FLEG",
  },
];

export const SEED_EVENT_DETAIL: Record<string, EventDetail> = {
  "nagaland-darts": {
    ...SEED_EVENTS[3],
    description: "Open singles darts tournament. All skill levels welcome.",
    rules: "501 double-out, best of 5 legs from quarter-finals.",
    importantNotes: "Report 30 minutes before your scheduled match.",
    categories: [{ id: "open", name: "Open Singles", price: 300 }],
    requiresLogin: true, registrationCloseAt: "2026-12-04T18:00:00+05:30",
  },
  "womens-pickleball-clinic": {
    ...SEED_EVENTS[4],
    description: "Beginner-friendly coaching clinic for women.",
    rules: null, importantNotes: "Paddles provided. Wear court shoes.",
    categories: [{ id: "adult", name: "Adult clinic", price: 0 }, { id: "kids", name: "Kids clinic", price: 0 }],
    requiresLogin: true, registrationCloseAt: "2026-11-20T18:00:00+05:30",
  },
};
