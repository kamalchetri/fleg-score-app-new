import { Redirect } from "expo-router";

/** Discover moved to the Events tab. Keep the route so older links still land. */
export default function DiscoverRedirect() {
  return <Redirect href="/events" />;
}
