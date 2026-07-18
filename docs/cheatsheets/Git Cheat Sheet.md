# Git Cheat Sheet

> Daily Git workflow for We Build and Design

---

# Daily Workflow

## 1. Check the status

```bash
git status
```

Vraag jezelf af:

> Wat is er veranderd?

---

## 2. Voeg wijzigingen toe

```bash
git add .
```

Vraag jezelf af:

> Zijn alle wijzigingen klaar voor de volgende versie?

---

## 3. Maak een commit

```bash
git commit -m "Korte omschrijving"
```

Voorbeelden:

```bash
git commit -m "Add homepage hero"
```

```bash
git commit -m "Update navigation"
```

```bash
git commit -m "Improve SEO structure"
```

---

## 4. Upload naar GitHub

```bash
git push
```

---

# Nieuwe Repository

Alleen de eerste keer:

```bash
git init
git remote add origin https://github.com/<gebruikersnaam>/<repository>.git
git branch -M main
git push -u origin main
```

---

# Veelgebruikte commando's

Status bekijken

```bash
git status
```

Geschiedenis bekijken

```bash
git log
```

Laatste commit

```bash
git log --oneline
```

---

# WBD Workflow

✅ Bouwen

↓

✅ Testen

↓

✅ Documenteren

↓

✅ git status

↓

✅ git add .

↓

✅ git commit

↓

✅ git push

---

# Belangrijk

Git = versiebeheer

GitHub = online back-up

Git bewaart de geschiedenis.

GitHub bewaart de geschiedenis online.

---

# Onthouden

Iedere sessie eindigt met:

git status

git add .

git commit

git push