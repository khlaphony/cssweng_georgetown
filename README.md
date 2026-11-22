# cssweng_georgetown
GeorgeTown Incident

Website for Georgetown Electrical Systems: Home, Products, Services, Contact Us and Apply Here pages, plus an admin dashboard for viewing job applications and contact requests.

## What you need to install

Install these once per computer:

1. **Node.js** (LTS version): https://nodejs.org
2. **MySQL 8** (MySQL Server and MySQL Workbench): https://dev.mysql.com/downloads/installer/
   - Choose **Custom** setup, then add **MySQL Server** and **MySQL Workbench**.
   - Keep the default port **3306**.
   - Set a **root password** and remember it. You will need it in Step 3.
3. **Git** (https://git-scm.com) or **GitHub Desktop**, to clone this repository.

NOTE!!!: For-testing is latest

## First-time setup

### Step 1: Open a terminal in the project folder

1. Open the project folder in File Explorer, for example:
   `Desktop\CSSWENG Project\cssweng_georgetown`
2. Click the address bar at the top, type `cmd` and press **Enter**.
   A Command Prompt opens, already inside the project folder.

### Step 2: Install the project's packages

In the Command Prompt, type:

```
npm install
```

Wait until it finishes. It creates a `node_modules` folder (this is ignored by Git).

### Step 3: Create the `.env` file

1. Open the `server` folder inside the project.
2. Copy `.env.example` and rename the copy to **`.env`**. If Windows warns about changing the file extension, click **Yes**.
3. Open `.env` with Notepad and set:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=georgetown
PORT=3000
```

Replace `your_mysql_root_password` with the password you set when installing MySQL. Never commit `.env` to GitHub (it is already ignored by Git).

### Step 4: Create the database

1. Open **MySQL Workbench** and click the **Local instance MySQL80** connection. Enter your root password.
2. Go to **File > Open SQL Script**, open the file, then click the **lightning bolt** to run it.
3. Do this for each file below, **in this exact order**:
   1. `server/schema.sql`
   2. `server/migrations/applicationForm.sql`
   3. `server/migrations/applicationFormFrontendCompatibility.sql`
   4. `server/migrations/contactMessages.sql` (contact form topic + "Replied" checkmark)

To check that it worked, run `SHOW TABLES FROM georgetown;`. You should see: `admins`, `applications`, `contact_messages` and `settings`.

### Step 5: Create an admin account

In the Command Prompt (inside the project folder), type:

```
node server/createAdmin.js <username> <password>
```

Example:

```
node server/createAdmin.js admin testpass123
```

- The password must be **at least 8 characters**.
- You should see: `Admin "admin" saved.`
- To change a password, run the same command again with the same username.
- Each person's database is separate, so every member creates their own admin.

## Running the site

In the Command Prompt (inside the project folder), type:

```
npm start
```

Then open in your browser:

| Page | Address |
| --- | --- |
| Website | http://localhost:3000 |
| Admin login | http://localhost:3000/login |

Keep the Command Prompt open while using the site. Press **Ctrl + C** to stop the server.

## After pulling new changes

1. Run `npm install` in case new packages were added.
2. If any `.sql` file changed, re-run `server/migrations/applicationFormFrontendCompatibility.sql` and `server/migrations/contactMessages.sql` in Workbench (both are safe to run again). Do **not** re-run `schema.sql` or `applicationForm.sql` on an existing database.
3. Restart the server (**Ctrl + C**, then `npm start`).
4. Press **Ctrl + F5** in the browser to load the newest pages.
