@echo off
REM NEW DENT Wartezimmer-Browser Autostart
REM Startet Chrome im Vollbild mit aktivem Audio-Autoplay.
REM
REM VOR DEM ERSTEN START: Platzhalter <SECRET> unten durch dein
REM WARTEZIMMER_SECRET aus Railway ersetzen!

set URL=https://newdent-production.up.railway.app/wartezimmer/<SECRET>

start "" "chrome.exe" ^
  --kiosk ^
  --autoplay-policy=no-user-gesture-required ^
  --disable-features=TranslateUI ^
  --noerrdialogs ^
  --disable-session-crashed-bubble ^
  --disable-infobars ^
  --no-first-run ^
  --app=%URL%
