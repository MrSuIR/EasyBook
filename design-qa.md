# EasyBook design QA

## Source truth

- Selected source: `frontend/artifacts/source-option-1.png` (Product Design option 1).
- Desktop implementation: `frontend/artifacts/easybook-desktop.png`.
- Combined comparison: `frontend/artifacts/comparison.png`.
- Desktop viewport/state: 1280 × 720, unauthenticated landing page, Saint Petersburg demo catalog.
- Mobile viewport/state: 390 × 700 responsive frame, unauthenticated landing page and open mobile navigation.

## Findings

| Priority | Before | After | Why |
|---|---|---|---|
| P1 | The desktop hero and search stack were taller than the selected reference, pushing hotel imagery below the first viewport. | Header, hero image, display type, search controls, and result spacing were tightened; the hotel row now enters the first viewport like the reference. | Restores the selected editorial density and makes the catalog immediately discoverable. |
| P1 | At 390 px the hidden `<br>` elements collapsed two heading fragments into `захочетсявернуться`, producing horizontal overflow. | Mobile keeps semantic line breaks, uses a bounded 46–54 px display size, and measures `clientWidth = scrollWidth = 390`. | Preserves readability and the primary hierarchy without horizontal scrolling. |
| P2 | The initial card crop was too tall and reduced the amount of catalog content visible above the fold. | Desktop card media now uses a wider 2.15:1 crop, while mobile retains a more immersive 1.65:1 crop. | Matches the source at desktop without weakening the mobile visual experience. |

No P0 issues remain. The final desktop comparison was reviewed side by side at the same 1280 × 720 viewport and state.

## Open Questions

- Production hotel photography still depends on the backend image catalog. Generated editorial photography remains the intentional demo fallback when the API or hotel images are unavailable.
- Favorites are presentation-only because the backend has no favorites contract; search, authentication, rooms, booking, and trip history use real API contracts.

## Implementation Checklist

- [x] Cormorant Garamond display typography and Manrope UI typography match the selected direction.
- [x] Large headings use restrained negative tracking and compact leading; body copy uses readable 1.45–1.55 leading.
- [x] Palette uses Tailwind stone, emerald, orange, red, and green tokens with a clear neutral/primary/system split.
- [x] Spacing, radii, borders, and shadows use a restrained shared system.
- [x] Generated image assets match their slots and use deliberate `object-fit` crops.
- [x] Desktop reference and implementation were placed in one comparison input and rechecked after corrections.
- [x] Mobile layout has no horizontal overflow at 390 px.
- [x] Mobile menu opens and exposes navigation.
- [x] Search, hotel selection, room selection, authentication handoff, and trip drawer are wired.
- [x] Browser console contains no warnings or errors in the tested core flow.
- [x] Reduced-motion handling is present.

## Follow-up Polish

- Replace demo image mapping with backend image metadata once the catalog is guaranteed to contain photography for every hotel.
- Add a backend favorites resource before making the heart control persistent.

final result: passed
