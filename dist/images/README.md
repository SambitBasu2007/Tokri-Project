# Local product photos

The catalog ships with curated local photos named `<productId>.jpg` (for example `4.jpg` for
Shimla Apples). `scripts/fetch-images.mjs` prefers these files over Open Food Facts so fresh produce
and missing barcodes still get a real image. See `CREDITS.md` for sources and licences.

- 1:1 aspect ratio, object-fit contain, neutral background
- No third-party packaging shots unless you have the rights
- If a file is absent, the UI shows a flat grey placeholder with the product name
- Do not add copyrighted store imagery

Attribution for Open Food Facts images remains: “Product images: Open Food Facts contributors,
CC BY-SA.” Wikimedia Commons images keep their own licence; link back to the file page.
