# Cafgic — gestió multi-local per a cafeteries

Plataforma de **Massiu Soft** per a cafeteries, restaurants i bars amb un o més locals al mercat suís: horaris i torns, equip, comandes a proveïdors, tancaments de caixa i previsió. Interfície en sis idiomes (DE · FR · IT · EN · CA · EL), mode clar i fosc, i disseny responsiu per a mòbil.

**Demo pública (sense servidor):** https://gemmagf.github.io/coffe_logic/ — clica *Provar la demo*.

## Estructura

```
backend/   Express + TypeScript + Prisma (SQLite)      → API REST a /api
frontend/  React 18 + Vite + TypeScript + React Query  → SPA (hash routing)
scripts/   utilitats (comprovació de fitxers d'idioma)
```

## Posada en marxa local

```bash
npm install                 # instal·la els dos workspaces
cp .env.example backend/.env
npm run db:generate         # client de Prisma
npm run db:push             # crea l'esquema a SQLite
npm run db:seed             # dades de demo (Mosaik Kaffee, cafeteria fictícia de Zúric)
npm run dev                 # backend :4000 + frontend :5173
```

Les credencials de la demo són a `backend/prisma/seed.ts` (compte de propietari i compte de manager `elena` / `demo1234`). A la web pública, el botó *Provar la demo* entra directament.

La demo és **Mosaik Kaffee**, una cafeteria d'especialitat fictícia de Zúric amb tres locals (Kreis 4, Limmatquai i una petita torradora): equip de 9 persones amb hores de contracte, torradors i forn com a proveïdors, vendes diàries de 8 setmanes i torns de 5 setmanes.

### Mode demo sense backend

```bash
npm run build:demo          # VITE_DEMO_MODE=true → totes les crides van a dades locals en memòria
```

És el mode que desplega GitHub Pages. Les mutacions (crear torns, comandes, tancaments…) funcionen durant la sessió i es perden en recarregar.

## Scripts

| Script | Què fa |
|---|---|
| `npm run dev` | Backend i frontend en paral·lel |
| `npm run build` | Compila backend i frontend |
| `npm run lint` | Typecheck de tots dos + comprovació de claus d'idioma |
| `npm run check:locales` | Verifica que tots els idiomes tenen les mateixes claus que `en.json` |
| `npm run db:*` | `generate`, `push`, `migrate`, `seed`, `studio` |

## Funcionalitats

- **Inici**: KPIs de vendes, torns i comandes; evolució de vendes 14 dies; línia de temps dels torns d'avui per local; avisos (dies descoberts, proveïdors endarrerits, vacances pendents).
- **Horaris**: graella setmanal i vista per persona, crear/editar torns en modal amb validació de solapaments, copiar la setmana anterior, hores planificades vs. hores de contracte per persona, assistent de proposta automàtica (vacances, preferències, locals habituals, màxim de dies i hores de contracte per setmana).
- **Empleats**: alta/edició/baixa amb posició, hores de contracte i locals habituals, sol·licituds de vacances amb aprovació i nota, preferències de torn per dia.
- **Comandes**: pipeline per estat, suggeriments automàtics per a proveïdors endarrerits (comanda ràpida o personalitzada), detall amb totals.
- **Caixa**: tancaments per tipus de pagament amb efectiu esperat i diferència calculada, gràfics de vendes diàries i per dia de la setmana.
- **Planificació**: previsió de vendes, tendència setmanal, productes més demanats, freqüència per proveïdor, cobertura de torns a 14 dies.
- **Configuració**: locals, proveïdors, compte, tema i idioma.

## Desplegament

- **Frontend**: GitHub Pages via `.github/workflows/deploy-pages.yml` (build en mode demo).
- **Backend**: Render via `render.yaml`. Cal definir `JWT_SECRET` (el servidor s'atura en producció si falta) i `CORS_ORIGIN`.
- Per connectar el frontend desplegat a un backend real, compila'l amb `VITE_API_URL=https://…/api` i sense `VITE_DEMO_MODE`.
