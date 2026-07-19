# Git Cheat Sheet

> Daily Git workflow for We Build And Design

---

# Dagelijkse workflow

## 1. Controleer wat er is gewijzigd

```bash
git status
```

Gebruik dit altijd als eerste.

Vraag jezelf af:

> Welke bestanden zijn nieuw, aangepast of verwijderd?

---

## 2. Kies wat je wilt opslaan

### Optie A — Eén specifiek bestand toevoegen

```bash
git add docs/project-bible/02-WBD-Method.md
```

Opbouw:

```text
git add + pad naar het bestand
```

Voorbeeld:

```bash
git add docs/project-bible/03-Identity.md
```

Gebruik dit wanneer je alleen één bestand wilt opslaan.

---

### Optie B — Meerdere specifieke bestanden toevoegen

```bash
git add docs/project-bible/02-WBD-Method.md docs/project-bible/03-Identity.md
```

Gebruik dit wanneer meerdere bestanden bij dezelfde commit horen.

---

### Optie C — Alle wijzigingen toevoegen

```bash
git add .
```

Gebruik dit alleen wanneer **alle wijzigingen bij dezelfde commit horen**.

Controleer daarom altijd eerst met:

```bash
git status
```

---

## 3. Controleer wat klaarstaat voor de commit

```bash
git status
```

Bestanden onder:

```text
Changes to be committed
```

worden meegenomen in de volgende commit.

---

## 4. Maak een commit

```bash
git commit -m "Korte omschrijving"
```

Voorbeelden:

```bash
git commit -m "docs: voeg Atlas-methode toe"
```

```bash
git commit -m "docs: leg identiteit van WBD vast"
```

```bash
git commit -m "website: voeg challenge-sectie toe"
```

```bash
git commit -m "website: verbeter homepage-opbouw"
```

Een goede committekst vertelt kort:

- welk onderdeel is aangepast;
- wat er is veranderd.

---

## 5. Controleer of de commit gelukt is

```bash
git status
```

Als alles lokaal is opgeslagen, zie je meestal:

```text
nothing to commit, working tree clean
```

Er kunnen nog andere bestanden overblijven als je bewust maar een deel hebt gecommit.

---

## 6. Upload de commits naar GitHub

```bash
git push
```

Gebruik dit nadat de commit lokaal is gemaakt.

---

# Belangrijk verschil

## `git add`

```bash
git add <bestand>
```

Kiest welke wijzigingen klaarstaan voor de volgende commit.

---

## `git commit`

```bash
git commit -m "Omschrijving"
```

Slaat de klaargezette wijzigingen lokaal op in de Git-geschiedenis.

---

## `git push`

```bash
git push
```

Stuurt de lokale commits naar GitHub.

---

# Kort onthouden

```text
git status
```

Kijken wat er veranderd is.

```text
git add
```

Kiezen wat je wilt opslaan.

```text
git commit
```

Lokaal opslaan in de geschiedenis.

```text
git push
```

Uploaden naar GitHub.

---

# Veilige standaardworkflow

```bash
git status
git add docs/project-bible/02-WBD-Method.md
git status
git commit -m "docs: voeg Atlas-methode toe"
git status
git push
```

---

# Workflow voor meerdere bestanden

```bash
git status
git add docs/project-bible/02-WBD-Method.md docs/project-bible/03-Identity.md
git status
git commit -m "docs: leg Atlas-methode en identiteit vast"
git status
git push
```

---

# Workflow wanneer alles bij elkaar hoort

```bash
git status
git add .
git status
git commit -m "Korte duidelijke omschrijving"
git status
git push
```

Gebruik `git add .` alleen wanneer je zeker weet dat alle wijzigingen samen horen.

---

# Geschiedenis bekijken

## Korte geschiedenis

```bash
git log --oneline
```

## Uitgebreide geschiedenis

```bash
git log
```

## Bekijken welke bestanden in de laatste commit zitten

```bash
git show --stat --oneline HEAD
```

---

# Nieuwe repository

Alleen de eerste keer:

```bash
git init
git remote add origin https://github.com/<gebruikersnaam>/<repository>.git
git branch -M main
git push -u origin main
```

---

# WBD Workflow

```text
Bouwen
↓
Testen
↓
Documenteren
↓
git status
↓
git add
↓
git status
↓
git commit
↓
git status
↓
git push
```

---

# Belangrijk

Git = lokaal versiebeheer.

GitHub = online opslag van jouw Git-geschiedenis.

Git bewaart versies.

GitHub bewaart die versies online.

---

# Hoofdregel

> `git add` kiest wat je opslaat.  
> `git commit` slaat het lokaal op.  
> `git push` stuurt het naar GitHub.