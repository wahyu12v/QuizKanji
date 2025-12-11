# Quiz Website (static) - Generated

Files:
- index.html
- style.css
- script.js
- questions.json (converted from your Kanji.xlsx)

How to use locally:
1. Extract the files and open `index.html` in a browser. For Chrome, if fetch fails due to CORS when opening local file, run a simple local server:
   - Python 3: `python -m http.server 8000` then visit http://locjalhost:8000

Deploy to free hosting (GitHub Pages):
1. Create a GitHub account (if you don't have).
2. Create a new repository (public).
3. Upload the files (index.html, style.css, script.js, questions.json, README).
4. In repository Settings -> Pages, set source to `main` branch and `/ (root)` folder, save.
5. GitHub will provide a domain like `https://<username>.github.io/<repo>/` after a minute.

Alternative free hosts:
- Netlify: drag-and-drop the site folder to Netlify Drop.
- Vercel: import the repo and deploy (recommended for automatic updates).

If you'd like, I can:
- Customize the UI (colors, show correct answers after submit, timed quiz).
- Convert questions into MCQ format if your spreadsheet has different structure.
- Prepare a ready-to-upload GitHub repo ZIP (already created for you).
