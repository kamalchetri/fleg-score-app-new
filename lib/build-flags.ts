/** Build-time switches for deliberately isolated app variants. */
export function isReviewBuild(): boolean {
  const value = process.env.EXPO_PUBLIC_REVIEW_BUILD;
  return value === "true" || value === "1";
}
