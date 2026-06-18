XAVRO — Wordmark font
=====================

The XAVRO wordmark uses Azonix.

To activate it, drop the font file into THIS folder with one of these exact names:

    fonts/Azonix.otf      (preferred)
    fonts/Azonix.ttf

That's it. The CSS @font-face in css/styles.css already points here, so the
wordmark upgrades to Azonix automatically the moment the file exists.

Until the file is added, the wordmark renders in a close geometric fallback
("Michroma") so the site still looks correct.

The wordmark is the ONLY place Azonix is used — headlines use Anton, body uses
Hanken Grotesk (both loaded from Google Fonts).
