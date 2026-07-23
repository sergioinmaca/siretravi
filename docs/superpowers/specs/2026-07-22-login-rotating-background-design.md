# Login Rotating Background Images

## Summary

Daily-rotating full-screen background images on the login page. Native front-end images referenced via a local JSON file. No database, no API calls, no overlay — a clean full-screen photo behind the white login card.

## Architecture

### Files

```
public/
  img/
    login/
      dia-01.jpg   ← initial image (all 7 days start here)
      dia-02.jpg   ← placeholder (replaced when new photos arrive)
      ...
      dia-07.jpg

src/
  data/
    login-images.json
  hooks/
    useDailyImage.ts
  components/
    LoginBackground.tsx
  pages/
    Login.tsx       ← modified: replace gradient wrapper with LoginBackground
```

### Data: `login-images.json`

```json
[
  "/img/login/dia-01.jpg",
  "/img/login/dia-01.jpg",
  "/img/login/dia-01.jpg",
  "/img/login/dia-01.jpg",
  "/img/login/dia-01.jpg",
  "/img/login/dia-01.jpg",
  "/img/login/dia-01.jpg"
]
```

- Array of 7 strings, one per day of week or day-of-month cycle.
- Initially all slots point to the same image (`dia-01.jpg`).
- New photos replace individual slots by editing the JSON and adding files to `public/img/login/`.
- Zero code changes required to add, remove, or swap images.

### Hook: `useDailyImage`

```
// Input: the JSON array (imported statically).
// Output: { src: string | null, loaded: boolean, error: boolean }
//
// Algorithm:
//   index = new Date().getDate() % pool.length
//   Return pool[index]
```

- Uses `new Date().getDate()` (day of month, 1–31) modulo pool length.
- Deterministic per day — same image for all users in the same timezone.
- Returns `null` if the pool is empty or unparseable.

### Component: `LoginBackground`

Props: `src: string`

1. On mount or `src` change, preload via `new Image()`.
2. Three states:
   - **`loading`**: Render a plain gray background (`bg-gray-100`). No image visible.
   - **`loaded`**: Render `<img>` with CSS `opacity: 0` → `opacity: 1` transition (0.8s ease).
   - **`error`**: Stay on gray background. Do not retry.
3. CSS for the `<img>` tag:

```css
position: fixed;
inset: 0;
width: 100vw;
height: 100dvh;
object-fit: cover;
object-position: center;
z-index: 0;
```

- `100dvh` handles mobile browser address-bar-collapse behavior.
- `object-fit: cover` crops without distortion — works on both landscape and portrait tablets.

### Login Page Modifications

- Remove the existing gradient background wrapper (`from-caracas-red/5 via-caracas-light to-caracas-blue/5`).
- Replace with `LoginBackground` as full-screen background.
- The white card (`bg-white rounded-3xl shadow-xl`) and all its contents remain unchanged.

## Behavior Matrix

| Scenario | Result |
|---|---|
| Normal load (image exists) | Gray bg briefly → image fades in (0.8s) |
| Image missing (404) | Stays gray bg, login form works normally |
| JSON missing or empty | Hook returns `null`, component renders gray bg, form works |
| Same day, multiple tabs/users | Same image (deterministic from date) |
| New day at midnight | User must reload or reopen login to see next image |
| Tablet portrait | Image fills screen via `cover`, horizontal crop at center |
| Tablet landscape | Image fills screen via `cover`, vertical crop at center |

## Maintenance

1. Add new photo file to `public/img/login/` (e.g., `dia-02.jpg`).
2. Edit `login-images.json` slot 2 to `"/img/login/dia-02.jpg"`.
3. No code changes. No deploy needed beyond the static file update.

## Testing (manual)

1. Open login page → confirm day's image loads with fade-in.
2. Temporarily rename `public/img/login/dia-01.jpg` → reload → gray background, form still usable.
3. Restore the file → reload → image returns with fade-in.
4. Chrome DevTools device mode: test portrait and landscape on iPad/tablet presets.
5. Delete `login-images.json` temporarily → login still works with gray background.
