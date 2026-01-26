# Minoan Dossiers — Root Index

Knowledge corpus for the Kothar oracle soul, organized by domain.

---

## Collections

| Folder | Count | Description |
|--------|-------|-------------|
| [thera-knossos-minos/](thera-knossos-minos/INDEX.md) | 22 | Academic paper dossiers: volcanic memory, palace culture, Minos-Moses parallels |
| [scholarly-sources/](scholarly-sources/) | 78 | Per-article dossiers: Allen, Astour, Gordon, Harrison, Rendsburg |
| [oracle-concepts/](oracle-concepts/INDEX.md) | 3 | Daimonic wisdom, poetry as philosophy |
| [daimonic-soul-engine/](daimonic-soul-engine/INDEX.md) | 6 | Soul Engine architecture and cognitive steps |
| [biography/](biography/INDEX.md) | 6 | Tom di Mino's background and expertise |
| [portfolio/](portfolio/INDEX.md) | 9 | Project case studies |
| [poetry/](poetry/INDEX.md) | 7 | Original poems and translations |

---

## Paper Structure

The academic research dossiers follow a three-part structure:

### [Part I: Thera](thera-knossos-minos/part-1-thera/INDEX.md) (7 dossiers)
Volcanic eruption, primordial chaos, divine feminine toponymy

### [Part II: Knossos](thera-knossos-minos/part-2-knossos/INDEX.md) (7 dossiers)
Palace as gathering place, goddess traditions, Semitic loans

### [Part III: Minos](thera-knossos-minos/part-3-minos/INDEX.md) (8 dossiers)
Law-giver typology, etymological chains, Canaanite-Israelite convergence

---

## Scholarly Sources

| Author | Dossiers | Focus | Index |
|--------|----------|-------|-------|
| Paula Gunn Allen | 18 | Ritual gynocracy, feminine divine | [allen/INDEX.md](scholarly-sources/allen/INDEX.md) |
| Michael C. Astour | 10 | Hellenosemitica etymologies | [astour/INDEX.md](scholarly-sources/astour/INDEX.md) |
| Cyrus H. Gordon | 19 | Ugaritic-Minoan connections | [gordon/INDEX.md](scholarly-sources/gordon/INDEX.md) |
| Jane Ellen Harrison | 16 | Themis, Greek religion | [harrison/INDEX.md](scholarly-sources/harrison/INDEX.md) |
| Gary Rendsburg | 15 | Hebrew linguistics | [rendsburg/INDEX.md](scholarly-sources/rendsburg/INDEX.md) |

---

## Usage

These dossiers feed the RAG pipeline for the Kothar oracle:
1. Chunked by `scripts/chunk-dossiers.ts`
2. Embedded via VoyageAI voyage-context-3
3. Stored in Supabase vector store
4. Retrieved for contextual oracle responses

---

## RAG Tags

minoan, dossier, oracle, kothar, thera, knossos, minos, allen, astour, gordon, harrison, rendsburg, academic, research, bronze age, aegean, semitic, hebrew, ugaritic, canaanite, gynocracy, feminine divine
