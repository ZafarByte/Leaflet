# Leaflet

Leaflet is a private PDF reader that turns a document into an interactive,
page-turning flipbook. It runs in the browser, with no account or server-side
PDF processing. A reader chooses a PDF from their own device and Leaflet
renders it locally.

## Purpose and use cases

- Read personal documents, ebooks, manuals, and other PDFs in a book-like view.
- Keep PDF processing on the reader's device instead of uploading documents to
  an application server.
- Use page turns, keyboard navigation, themes, zoom, fullscreen, thumbnails,
  and device-local bookmarks to navigate and personalize reading.
- Export a self-contained HTML flipbook when a specific book needs to be sent
  to somebody else. This is a copy of the book, not a link to the Leaflet
  application.
- Deploy Leaflet as a static website so people can use the reader with their
  own PDFs.

## How it works

1. The browser downloads the static application files from the website host
   (or loads them from a local/desktop installation).
2. The user selects or drops a PDF into the uploader.
3. PDF.js reads the selected file in the browser. Each page is rendered to a
   canvas, then encoded as a JPEG data URL in browser memory.
4. React passes those rendered pages to the reader. PageFlip displays them
   with page-turn animation and adapts to the available screen size.
5. When the reader closes, its current PDF and rendered pages are discarded
   from application state. The application does not maintain a PDF account,
   upload endpoint, or document library.

### Architecture

```text
Browser / Tauri webview
├── src/main.tsx
│   └── React application entry point
├── src/App.tsx
│   ├── landing page and site theme
│   └── PDF uploader → BookReader
├── src/components/PdfUploader.tsx
│   └── validates selected file and starts local PDF rendering
├── src/lib/pdfRenderer.ts
│   └── PDF.js → page canvas → in-memory JPEG data URLs
├── src/components/BookReader.tsx
│   ├── PageFlip reader, navigation and responsive controls
│   ├── theme preference and bookmarks in localStorage
│   └── self-contained HTML export/share action
└── src/lib/flipbookExport.ts
    └── packages page images, styles, and PageFlip into standalone HTML
```

The web UI is built with React, TypeScript, and Vite. Page turning uses
`page-flip`; PDF parsing and rendering uses `pdfjs-dist`. The optional desktop
wrapper is configured with Tauri 2 in `src-tauri/`.

## Privacy and security

### PDF handling

- The selected PDF is read and rendered in the user's browser or desktop
  webview. The code does not send the PDF to a Leaflet backend.
- Rendered page images exist in memory while the book is open. Closing the
  reader clears the application's reference to that book.
- The PDF's SHA-256 digest is calculated locally and used as the identifier
  for its bookmark storage key. The digest is not an upload or a password.
- Theme preferences and bookmarks are stored in the browser's `localStorage`
  on that device. They are not synchronized between devices and are not
  encrypted by Leaflet.

### Hosting and sharing

- A deployed website host stores and serves Leaflet's static application
  files. The host may process ordinary web requests and related operational
  data under its own policies; this is separate from PDF handling by Leaflet.
- Do not place private PDFs in the website's deployment folder or source
  repository.
- The HTML export embeds page images and the reader code. Anyone who obtains
  that HTML file can view its book and make further copies. The export is not
  encrypted, password-protected, or access-controlled by Leaflet. Share it
  only with people you trust; a third-party file-sharing service may store it.
- Use HTTPS when deploying the website. Keep dependencies updated and review
  third-party hosting, build, and distribution services according to your
  privacy requirements.

### Practical limitations

- Leaflet renders every page into an image in memory. Large or long PDFs can
  require substantial memory and may be slow or fail on devices with limited
  resources.
- The rendered reader displays page images rather than a searchable,
  selectable-text PDF layer. Text search, OCR, and copy/paste from the
  original document are not provided by this rendering flow.
- Website use requires internet access to initially load the hosted
  application and its assets. Local PDF processing does not itself require
  sending a PDF to the host.

## Run locally

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`).
Choose a PDF from your device to read it.

## Build and verify

```sh
npm run lint
npm run build
npm run preview
```

The production website is written to `dist/`. Preview it locally with the URL
printed by Vite.

## Publish the website

Leaflet is a static single-page application; it does not require an
application server or database for its current PDF-reading functionality.

1. Run `npm run build`.
2. Deploy the contents of `dist/` to a static hosting service such as Netlify.
   For Netlify's Git-based deployment, use `npm run build` as the build command
   and `dist` as the publish directory. For a manual deploy, upload the
   generated `dist/` directory using the host's current deployment workflow.
3. Open the resulting HTTPS URL and test PDF selection, page turns, themes,
   thumbnails, and HTML export.
4. Share that URL. Each visitor uses the app with PDFs from their own device.

For client-side route paths other than `/`, configure the host to serve
`index.html` as the fallback. The current app uses a single route.

## Standalone HTML flipbook

From the reader, choose **Export HTML** and confirm the export. Leaflet creates
one self-contained `.html` file with the rendered book pages embedded. Send
that file directly or through a file-sharing service. The recipient opens it
in a modern browser. It works offline and does not require installing the
Leaflet website.

This shares one book, not the Leaflet web application. Treat the file as an
unprotected copy of the document.

## Desktop application status

The repository contains a Tauri 2 wrapper in `src-tauri/`, with a configured
frontend build and bundle targets. To attempt a local desktop build, install
the prerequisites for Tauri on the target operating system, then run:

```sh
npm install
npx tauri build
```

Build output is normally placed under `src-tauri/target/release/bundle/`.
Installer types and required platform tooling vary by operating system.

**The desktop packaging has not been certified as a release workflow.** Before
distributing it:

- Replace the placeholder product name and `com.tauri.dev` identifier in
  `src-tauri/tauri.conf.json` with the Leaflet product name and a unique,
  owned application identifier.
- Review and configure the Tauri Content Security Policy; it is currently
  `null`.
- Build and test the installer on each supported operating system.
- Consider code signing and provide users with installation and update
  guidance.

The desktop app is intended to let a user run Leaflet and open PDFs locally.
An installer does not include a user's PDF.

## Project scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Type-check and build the production web app |
| `npm run preview` | Preview the production build locally |
| `npx tauri build` | Build a desktop bundle (after Tauri prerequisites and configuration) |

## Third-party software

The flipbook export embeds the PageFlip browser runtime and its styles. The
generated HTML includes PageFlip's MIT license notice. Other dependencies are
declared in `package.json` and locked in `package-lock.json`; consult their
respective licenses before redistribution.
