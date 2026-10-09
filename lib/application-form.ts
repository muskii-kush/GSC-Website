// Browser submission settings. Answers and PDFs are recorded in private R2 storage.
// An authenticated receiver can also copy recorded applications into the review Sheet.
export * from "./application-questions";

export const GOOGLE_FORM_ID = "1FAIpQLSe7uI5-KB-8DN-TtK8S6fjeqLjCn8rH62kORvhx2F8sC84rUg";
export const GOOGLE_FORM_ACTION = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`;
export const GOOGLE_FORM_VIEW_URL = `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/viewform`;
export const SUBMIT_URL = process.env.NEXT_PUBLIC_SUBMIT_URL || "/api/apply";
export const MAX_DECK_BYTES = 50 * 1024 * 1024;
