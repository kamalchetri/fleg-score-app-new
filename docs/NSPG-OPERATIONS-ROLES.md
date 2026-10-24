# NSPG operations roles

This is the app-side role contract for the association review build. It does
not grant anyone access in Supabase and it must not be treated as a production
permission migration.

| Role | Public hub | Kiosk lookup | Accreditation scan | Access log | Tournament control |
| --- | --- | --- | --- | --- | --- |
| `admin` | Yes | Yes | Yes | Yes | All NSPG disciplines |
| `nspg_lead` | Yes | Yes | Yes | Yes | All NSPG disciplines |
| `nspg_staff` | Yes | Yes | Yes | Yes | Assigned NSPG operations |
| `organizer` / `organiser` | Yes | Yes | Yes | Yes | Owned/assigned tournaments |
| `volunteer` | Yes | Yes | Yes* | No | No |
| `kiosk_volunteer` | Yes | Yes | Yes* | No | No |
| `official` / `referee` | Yes | Yes | No by default | No | Match duties only through tournament staff assignment |
| `user` | Yes | Yes | No | No | No |

`*` Scanner access must be explicitly approved for the person and checkpoint in
the production policy. The app recognizes the role so the review flow can be
tested, but the server/RPC remains authoritative.

## Safety rules

- The public kiosk is read-only and does not require a personal login.
- The accreditation scanner and access log are separate capabilities. A
  volunteer may scan without being allowed to browse movement history.
- Tournament staff membership (`owner`, `co_organizer`, `referee`, and
  `scorekeeper`) remains separate from the profile role. A profile role must
  not automatically grant score writes.
- Role assignment must use an audited, authenticated server action/RPC. The
  mobile app must never update `profiles.role` directly.
- `alltoolsatwork@gmail.com` is recognized as the UI super-admin only when the
  database role is already `admin`; email alone never grants server authority.

## Production cutover checklist

Before enabling volunteer scanning or role assignment, the backend owner must
approve and deploy the corresponding role values, RLS policies, RPC checks,
audit events, and staff/checkpoint scope. Until then, these screens remain a
review-build contract and the production database is unchanged.
