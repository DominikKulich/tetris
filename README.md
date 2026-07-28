# Tetris pro babičku

Jednoduchý Tetris v prohlížeči. Bez reklam, bez sledování, bez internetu (po načtení funguje offline).
Vše je v jediném souboru `index.html`.

## Nasazení na GitHub Pages

1. Vytvoř nový repozitář na GitHubu (např. `tetris`), veřejný.
2. Nahraj do něj soubor `index.html` (Add file → Upload files → Commit).
3. V repozitáři jdi na **Settings → Pages**.
4. U *Source* zvol **Deploy from a branch**, branch `main`, složka `/ (root)`. Ulož.
5. Za minutu bude hra na adrese:
   `https://<tvoje-jmeno>.github.io/tetris/`

Tu adresu babičce pošli a ať si ji na mobilu uloží na plochu:
- **Android/Chrome:** menu ⋮ → *Přidat na plochu*
- **iPhone/Safari:** tlačítko sdílení → *Přidat na plochu*

Pak se hra otevírá jako běžná aplikace, na celou obrazovku a bez adresního řádku.

## Jak se hraje

- **◀ ▶** posun kostky doleva a doprava (dá se držet prstem)
- **↻** otočení kostky
- **▼ DOLŮ** rychlejší pád (dá se držet)
- **⏸ Pauza** / **↺ Nová hra**

Skóre, rekord a počet řádků jsou nahoře. Rekord se ukládá do telefonu.
Vpravo nahoře je náhled další kostky. Na úvodní obrazovce lze vypnout zvuk (🔊).

Na počítači fungují i šipky, mezerník (rychlý pád) a klávesa P (pauza).

## Nastavení pro seniory

- pomalé tempo (první úroveň 1,15 s na políčko, zrychluje se po 12 řádcích, nikdy pod 0,3 s)
- světlý „duch" ukazuje, kam kostka dopadne
- velká tlačítka, vysoký kontrast, žádné náhodné zavření hry
- hra se sama pozastaví, když se telefon přepne do jiné aplikace

Chceš-li hru ještě zpomalit, otevři `index.html` a v části `function dropInterval`
zvyš číslo `1150` (např. na `1600`).

---

Vytvořil **Dominik Kulich** — [www.dominikkulich.cz](https://www.dominikkulich.cz)
