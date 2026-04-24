# Wartezimmer-TV einrichten — Audio OHNE Klick

## Warum ist das überhaupt nötig?

Alle Browser (auch auf Smart-TVs) **verbieten Audio-Wiedergabe ohne vorherigen Nutzer-Klick**. Das ist eine Browser-Sicherheitsregel, die nicht per Code umgangen werden kann. Einmalige Einrichtung am Gerät löst das dauerhaft.

**Wähle einen der drei Wege** — abhängig von deiner Hardware:

---

## 🟢 Weg A (empfohlen, 100 % zuverlässig): HDMI-Stick oder Mini-PC

**Idee:** Kleiner externer Rechner am HDMI-Eingang des TVs, der einen echten Chrome-Browser mit Autoplay-Berechtigung startet.

### Option A1: Windows-Mini-PC (z. B. Intel NUC, ~100–150 €)

1. Chrome installieren auf dem Mini-PC
2. Datei `start-wartezimmer-browser.bat` aus diesem Projekt kopieren
3. Im Skript die Platzhalter anpassen:
   - `<SECRET>` → dein `WARTEZIMMER_SECRET`
4. Verknüpfung vom Skript in den **Autostart-Ordner** ziehen:
   - `Win + R` → `shell:startup` → Enter → Verknüpfung hineinziehen
5. Nach PC-Neustart startet Chrome automatisch im Vollbild mit aktivem Ton. **Fertig, kein Klick nötig.**

### Option A2: Fire TV Stick 4K (~40 €)
1. App „**Silk Browser**" aus Amazon App-Store installieren
2. URL aufrufen: `https://newdent-production.up.railway.app/wartezimmer/<SECRET>`
3. Menü → Einstellungen → **Site-Einstellungen → Sound → Zulassen** für die Domain
4. URL als Startseite setzen
5. Stick neu starten — lädt die Seite automatisch, Ton funktioniert

### Option A3: Chromecast with Google TV (~40 €)
1. Chrome aus Play Store installieren
2. Seite öffnen → Drei-Punkte-Menü → **Site Settings → Sound → Allow**
3. Als Lesezeichen / Startseite setzen

---

## 🟡 Weg B: Eingebauter TV-Browser (falls er Autoplay erlaubt)

Je nach TV-Marke unterschiedlich. Teste ob es funktioniert:

### Samsung (Tizen)
1. TV-Browser öffnen
2. URL eingeben
3. Menü → **Einstellungen → Datenschutz & Sicherheit → Site-Berechtigungen**
4. Domain `newdent-production.up.railway.app` → **Ton: Zulassen**
5. Wenn die Option fehlt → Weg A nötig

### LG (WebOS)
1. Browser → URL öffnen
2. Menü → **Einstellungen → Website-Einstellungen**
3. Audio → Zulassen für die Domain
4. Wenn nicht möglich → Weg A nötig

### Android TV (falls Chrome verfügbar)
1. Chrome öffnen → Seite laden
2. Adresszeile antippen → Schloss-Symbol → **Site settings → Sound → Allow**

---

## 🔴 Weg C (Notlösung): Täglich einmal klicken

Wenn beide anderen Wege nicht funktionieren:
- TV morgens einschalten
- Auf der Wartezimmer-Seite mit der Fernbedienung **einmal auf OK drücken** (auf den Bildschirm)
- Danach läuft der Ton den ganzen Tag
- Code bleibt den ganzen Tag aktiv dank Auto-Heal-Mechanismen

Das **kleine Icon unten rechts** zeigt den Status:
- 🔇 „Ton inaktiv" → einmal klicken nötig
- 🔊 „Ton aktiv" → Audio bereit (verschwindet nach 1 Sekunde)

---

## Testen

1. TV einrichten nach einem der Wege oben
2. Am Rezeptions-PC einen Testpatienten aufrufen (z. B. „Test")
3. Am TV:
   - Name erscheint groß ✅
   - Gong ertönt **3x** ✅
   - Status-Icon zeigt 🔊 „Ton aktiv" (falls eingeblendet)

Wenn es nach 1–2 Stunden Standby weiterhin läuft → dauerhaft stabil.

---

## Bei Problemen

**Kein Ton trotz Einrichtung:**
- Systemlautstärke am TV > 0? HDMI-Audio aktiviert?
- Browser-Tab nicht stummgeschaltet?
- Status-Icon schauen: wenn 🔇, dann war die Berechtigungs-Einstellung nicht erfolgreich

**Seite lädt nicht:**
- Internet am TV vorhanden? (mit Sprachsuche o. ä. testen)
- URL-Tippfehler? `WARTEZIMMER_SECRET` korrekt?

**Seite wird schwarz / Standby:**
- TV-Bildschirmschoner deaktivieren
- Ruhezustand / Energiesparmodus deaktivieren
