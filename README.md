# Homelab Documentation

Personal technical documentation site for my homelab, infrastructure, local AI systems, networking, monitoring and related projects.

Built with [Astro](https://astro.build/) and deployed with Cloudflare.

## Requirements

- Node.js 22+
- npm 10+
- Git

Check your versions:

```sh
node --version
npm --version
git --version
```

## Getting Started

```sh
git clone https://github.com/siddhantdembi/homelab-docs.git
cd homelab-docs
npm install
npm run dev
```

The local site runs at:

```text
http://localhost:4321/
```

## Content Workflow

Documentation pages are generated from Markdown files in:

```text
src/content/
```

The first folder name becomes the top-level section. The Markdown filename becomes the page route.

```text
src/content/homelab/proxmox.md      -> /homelab/proxmox/
src/content/networking/dns.md       -> /networking/dns/
src/content/ai/ollama.md            -> /ai/ollama/
```

Section index pages are generated automatically:

```text
src/content/homelab/*.md            -> /homelab/
src/content/networking/*.md         -> /networking/
src/content/ai/*.md                 -> /ai/
```

The homepage and header navigation also read from the same Markdown collection, so adding a new section folder or page file automatically reflects in the UI after the site rebuilds or the dev server reloads.

## Add A New Page

Create a Markdown file under an existing section:

```text
src/content/homelab/local-ai.md
```

Use frontmatter like this:

```md
---
title: "Local AI & LLM Platform"
description: "GPU-accelerated local AI infrastructure with Ollama, OpenWebUI, agents and automation."
order: 2
tags:
  - AI
  - Ollama
  - Automation
---

## Overview

Write the page content here.
```

That file will create:

```text
/homelab/local-ai/
```

It will also appear on:

```text
/
/homelab/
```

## Add A New Section

Create a new folder under `src/content/` and add at least one Markdown file:

```text
src/content/networking/dns.md
```

That automatically creates:

```text
/networking/
/networking/dns/
```

To customize the section title and description shown on the homepage and section page, add these optional fields to one page in that section:

```md
---
title: "DNS"
description: "Internal DNS, filtering and resolver notes."
sectionTitle: "Networking"
sectionDescription: "Networking write-ups covering DNS, tunnels, remote access and local infrastructure."
order: 1
---
```

## Draft Pages

Set `draft: true` to keep a Markdown file in the repo without publishing it:

```md
---
title: "Work in Progress"
description: "Private draft notes."
draft: true
---
```

## Project Structure

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── DocCard.astro
│   │   └── Header.astro
│   ├── content/
│   │   ├── homelab/
│   │   │   └── proxmox.md
│   ├── layouts/
│   │   ├── DocLayout.astro
│   │   └── Layout.astro
│   ├── lib/
│   │   └── docs.ts
│   └── pages/
│       ├── [section]/
│       │   ├── [...slug].astro
│       │   └── index.astro
│       └── index.astro
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── wrangler.jsonc
```

## Available Commands

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the production site |
| `npm run preview` | Build and preview locally |
| `npm run deploy` | Build and deploy with Wrangler |

## Update The Resume

Replace only this file:

```text
public/resume/SiddhantDembi.pdf
```

Then run `npm run build` or `npm run deploy`. The build automatically creates a high-resolution preview for every page and reads the clickable links from the new PDF. New page counts, layouts and link positions therefore update without editing the website code.

For links to be detected, add them as actual PDF hyperlinks when exporting the resume. If a PDF has no embedded links, the preview will still display correctly and the download will still work.

## Deployment

The production URL is configured in:

```text
astro.config.mjs
```

The Cloudflare deployment is configured in:

```text
wrangler.jsonc
```

Production build output is generated into:

```text
dist/
```

## Notes

- `node_modules/`, `dist/`, `.astro/`, and `.wrangler/` should not be committed.
- `package-lock.json` should be committed for reproducible installs.
- Do not commit passwords, API keys, tokens, private keys, or other sensitive homelab configuration.
- Review internal IP addresses and infrastructure details before publishing.
