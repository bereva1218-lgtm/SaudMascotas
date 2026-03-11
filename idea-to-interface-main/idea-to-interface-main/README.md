# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## Backend service (local development)

A simple Express server lives in the `backend/` folder and provides the same mock
information that the UI used to read directly. To run the backend:

```bash
cd backend
npm install
npm run dev   # starts on http://localhost:4000
```

The frontend is configured to call `http://localhost:4000` by default; you can
change this URL by setting an environment variable in the root of the project:

```env
VITE_API_URL=http://localhost:4000
```

Re‑start the Vite server (`npm run dev`) after changing the value.

The backend exposes the following endpoints (authentication required):

- `POST /auth/register` – create an account
- `POST /auth/login` – obtain a JWT token

After logging in the token is stored in local storage and automatically sent with
subsequent requests.

- `GET /pets`, `GET /pets/:id`, `POST /pets`
- `GET /alerts`, `GET /alerts/:id`, `PUT /alerts/:id/read`
- `GET /logs`, `POST /logs` (optional `?petId=` filter)

For local development the demo user `demo@example.com` / `password` is created
automatically when the backend starts.
All data is stored in memory and resets when the server restarts. This lets you
build and test the frontend against a realistic API without requiring a real
database.
