# SecurePrint (Vault Print) - Feature Overview

SecurePrint is a highly secure, privacy-first web application designed to allow users to safely print sensitive documents (like Aadhaar or PAN cards) at public cyber cafes without the risk of identity theft or data leaks.

## 🌟 Core Features & How They Work

### 1. Zero-Knowledge Document Encryption
**What it means:** When you upload a document, we don't store your actual document. It's locked using a complex mathematical key before it even leaves your computer.
**How the backend does it:** 
We use the Web Crypto API (AES-256-GCM) directly in your browser. Before the upload happens, your browser generates a random "Master Password" and scrambles the document. We slice this master password into two halves:
- **Half 1:** Sent to our Supabase Cloud Database.
- **Half 2:** Embedded directly inside the URL that you copy/share (after the `#` symbol).

Because our server never gets the full password, even if our database gets hacked, the hacker only gets unreadable, scrambled files. The file can *only* be opened by the person holding the exact unique URL link you share.

### 2. View-Only Anti-Screenshot Protection
**What it means:** When the cyber cafe operator opens the link, they cannot screenshot your document to steal it or drag it to their desktop. 
**How the backend does it:** 
When the URL is opened, the browser recombines the two password halves, unlocks the document, and displays it on the screen. However, using CSS trickery and JavaScript DOM manipulation:
- Right-clicking is disabled.
- Keyboard shortcuts for screenshots, saving, or inspecting code (F12) are blocked.
- A heavy visual watermark layer (saying "PREVIEW ONLY - DO NOT PRINT SCREEN") is violently stitched *on top* of the document.

### 3. Clean-Copy Printing
**What it means:** Even though the screen is covered heavily in red watermarks to prevent screenshots, the actual paper that comes out of the printer is perfectly clean.
**How the backend does it:** 
The application utilizes CSS Media Queries. We define rules under `@media screen` (what is seen on the monitor) and `@media print` (what is sent to the printer hardware). We instruct the browser to hide the watermark layer exclusively during printing, routing the pure, clean document directly to the printer spooler.

### 4. Explosive Self-Destruct Sequence
**What it means:** The moment the document is sent to the printer, the link dies forever. It cannot be refreshed, opened again, or downloaded by the cyber cafe operator.
**How the backend does it:** 
We hooked into the browser's native `beforeprint` event. The literal millisecond the operator clicks "Print", three things happen:
1. A signal is blasted to our Next.js backend `/api/destruct` route, which commands the Supabase Storage system to permanently physically delete the file.
2. The database record is marked as "destroyed".
3. The local internet browser's cache, sessionStorage, and localStorage are completely wiped clean, ensuring no trace of the document remains on the cyber cafe's hard drive.

### 5. IP Rate Limiting Security
**What it means:** Spammers cannot flood the system with fake uploads and exhaust your server costs.
**How the backend does it:**
Every time someone creates a link, the backend checks their IP address. If they have uploaded over 10 documents within 24 hours, the server rejects the request. This avoids the friction of SMS/OTPs while keeping the server safe from abuse.
