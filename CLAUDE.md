# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a bilingual (English/Russian) personal blog and portfolio site built with Hugo, using the hugo-PaperMod theme. The site is deployed to GitHub Pages at natashakatson.com.

## Build Commands

```bash
# Local development server
hugo server

# Build for production (outputs to ./public)
hugo --minify
```

**Hugo version**: 0.110.0 (as specified in CI workflow)

## Deployment

Deployment is automatic via GitHub Actions on push to `main` branch. The workflow:
1. Builds with `hugo --minify`
2. Deploys the `./public` directory to the `gh-pages` branch

## Architecture

### Content Structure

- `/content/posts/` - Blog posts with language suffixes (`.en.md`, `.ru.md`)
- `/content/archives.md` and `/content/archives.ru.md` - Archive pages per language
- All posts require both English and Russian versions for full bilingual support

### Customizations Over Theme

- `/layouts/index.html` - Custom homepage with hero section, expertise areas, and interests grid
- `/layouts/partials/` - Custom header, footer, comments, and home_info partials
- `/assets/css/extended/homepage.css` - Extensive homepage styling (hero, expertise pills, interest cards)
- `/assets/css/extended/post-entry.css` - Blog entry styling

### Configuration

- `config.yml` - Main Hugo config including:
  - Bilingual setup (en weight 1, ru weight 2)
  - Separate menus per language
  - Disqus comments integration
  - Google Analytics

### Theme

The hugo-PaperMod theme is a git submodule at `/themes/hugo-PaperMod/`. After cloning, run:
```bash
git submodule update --init --recursive
```

## Content Conventions

- Blog post filenames: `post-name.en.md` and `post-name.ru.md`
- Images go in `/static/images/`
- Front matter uses YAML format with title, date, tags, and optional draft/toc settings
