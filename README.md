# Client Notes

A simple, read-only-by-default knowledge base for support teams. It starts with demo data and becomes a shared app when connected to Supabase.

## Run it locally

Open `index.html` in a browser to explore the demo. For production, deploy the repository to a static host such as Vercel.

## Connect Supabase

1. Create a Supabase project and enable Email / Magic Link sign-in.
2. In the SQL Editor, run `supabase/schema.sql`. Replace `REPLACE_WITH_YOUR_EMAIL` with the administrator's exact email **before** running it.
3. In **Authentication → URL Configuration**, set **Site URL** to `https://klayent-notes.vercel.app` and add both `https://klayent-notes.vercel.app` and `http://localhost:3000` to **Redirect URLs**.
4. Add the project URL, anon key, deployed app URL, and admin email to `config.js`.
5. Deploy. Do not put the Supabase service-role key in `config.js`.

## Note images

To enable image attachments, run `supabase/images-migration.sql` once in the Supabase SQL Editor. Images are stored in a private bucket: signed-in teammates can view them, while only the configured admin can upload or remove them.

## Roles

All authenticated people can read clients and notes. The administrator defined in the database policy can create or change them. This is enforced by Supabase Row Level Security, not merely hidden interface controls.

## Before real use

- Obtain CredoPH approval for the app, data retention, and hosting.
- Do not put passwords, payment data, government IDs, or unnecessary customer personal data in a note.
- Replace the example client and set an appropriate backup/export practice.
