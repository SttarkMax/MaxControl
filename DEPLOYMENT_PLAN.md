# MaxControl Deployment Plan

This document outlines the steps to deploy the MaxControl application to a production environment. The architecture consists of:
-   **Backend (Node.js/Express)**: Hosted on **Render.com** for scalability and ease of deployment.
-   **Frontend (React)**: Hosted on a standard **cPanel** web hosting server as a static site.
-   **Database (MySQL)**: Hosted within the **cPanel** account.

---

## Part A: Database Setup (cPanel)

The first step is to create the database that both the backend and frontend will rely on.

1.  **Log in to your cPanel account.**
2.  Navigate to the **Databases** section and click on **MySQL® Database Wizard**.
3.  **Step 1: Create A Database**: Enter a name for your database (e.g., `maxcontrol_db`). cPanel will prefix it with your username (e.g., `cpaneluser_maxcontrol_db`). Click **Next Step**.
4.  **Step 2: Create Database Users**: Create a new database user. Enter a username (e.g., `maxcontrol_user`) and a strong password. Click **Create User**.
5.  **Step 3: Add User to the Database**: On the next screen, check the **ALL PRIVILEGES** checkbox to grant the user full permissions to the database. Click **Next Step**.
6.  **Step 4: Complete the task**: The database and user are now set up. Note down the following information, as you will need it for the backend configuration:
    -   Database Name (e.g., `cpaneluser_maxcontrol_db`)
    -   Database User (e.g., `cpaneluser_maxcontrol_user`)
    -   User Password
    -   MySQL Hostname (usually `localhost`, but check your cPanel's documentation for remote connections)
7.  **Enable Remote Access for Render**:
    -   Go back to the cPanel main page and find **Remote MySQL®** under **Databases**.
    -   You need to allow Render's servers to connect to your database. For simplicity, you can add `%` as a wildcard host. **Warning**: This allows connections from any IP address. For better security, find Render's static outbound IP addresses in their documentation and add them individually.
    -   Add the host and click **Add Host**.
8.  **Import the Schema**:
    -   Go to **phpMyAdmin** in cPanel.
    -   Select your newly created database from the left-hand sidebar.
    -   Click the **Import** tab.
    -   Click **Choose File** and select the `backend/sql/schema.sql` file from the project.
    -   Click **Go** to create all the application tables.

---

## Part B: Backend Deployment (Render.com)

1.  **Prerequisites**:
    -   A [Render](https://render.com/) account.
    -   A [GitHub](https://github.com/) account.
    -   Push the entire project code to a new GitHub repository.

2.  **Prepare the Code for Production**:
    -   **CORS**: Open `backend/src/server.ts` and update the `cors` configuration to accept requests from your frontend's domain.
        ```typescript
        // In backend/src/server.ts
        app.use(cors({
          // Replace with your actual frontend domain
          origin: 'https://your-frontend-domain.com', 
          credentials: true,
        }));
        ```
    -   **Secure Cookies**: In the same file, make the session cookie secure for production.
        ```typescript
        // In backend/src/server.ts
        app.use(session({
          // ... other options
          cookie: {
            // This will be true when NODE_ENV is 'production'
            secure: process.env.NODE_ENV === 'production', 
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
          }
        }));
        ```
    -   Commit and push these changes to your GitHub repository.

3.  **Create the Web Service on Render**:
    -   In the Render Dashboard, click **New +** and select **Web Service**.
    -   Connect your GitHub account and select the repository for this project.
    -   Configure the service:
        -   **Name**: `maxcontrol-backend` (or similar).
        -   **Root Directory**: `backend` (important, as the backend is in a subfolder).
        -   **Runtime**: `Node`.
        -   **Build Command**: `npm run build`.
        -   **Start Command**: `npm start`.
        -   **Instance Type**: Choose a plan (the Free plan works for testing).
    -   Click **Advanced** to add Environment Variables. Add the following, using the details from your cPanel database setup:
        -   `DB_HOST`: Your cPanel's server IP address or hostname.
        -   `DB_USER`: The database user you created (e.g., `cpaneluser_maxcontrol_user`).
        -   `DB_PASSWORD`: The password for the database user.
        -   `DB_NAME`: The full database name (e.g., `cpaneluser_maxcontrol_db`).
        -   `DB_PORT`: `3306`.
        -   `SESSION_SECRET`: A long, random, and secret string.
        -   `NODE_ENV`: `production`.
    -   Click **Create Web Service**. Render will now pull your code, install dependencies, build, and deploy the backend.

4.  **Get the Backend URL**: Once deployed, Render will provide a public URL (e.g., `https://maxcontrol-backend.onrender.com`). Copy this URL. You'll need it for the frontend.

---

## Part C: Frontend Deployment (cPanel)

The frontend is a static application that will be served by cPanel's web server.

1.  **Prepare the Code for Production**:
    -   **Important**: The current project setup is not ideal for a production build. A standard React application uses a tool like Vite or Create React App to bundle all `.tsx`, `.ts`, and `.css` files into optimized, static HTML, JS, and CSS files.
    -   For this plan to work, you must have a build step. If your project was set up with Vite, you would run `npm run build`. This creates a `dist` folder. The contents of this `dist` folder are what you will upload.
    -   **Configure API URL**: In your local code, open `src/utils.ts` (or wherever your `apiFetch` utility is) and change the `API_BASE_URL` to point to your Render backend.
        ```typescript
        // In utils.ts
        const API_BASE_URL = 'https://maxcontrol-backend.onrender.com/api'; // Use your actual Render URL
        ```
    -   **Build the App**: Run your build command (e.g., `npm run build`). This will create a `dist` (or `build`) folder containing `index.html` and other static assets.
    -   **Compress the Build Folder**: Create a `.zip` file of the contents inside your `dist` (or `build`) folder.

2.  **Upload to cPanel**:
    -   In cPanel, go to **File Manager**.
    -   Navigate to the `public_html` directory (this is the root for your main domain).
    -   Click **Upload**, select your `.zip` file, and upload it.
    -   Once uploaded, right-click the `.zip` file in the File Manager and select **Extract**.

3.  **Configure SPA Routing**: React Router handles routing on the client side. To prevent 404 errors when a user directly visits a URL like `your-domain.com/products`, you must configure the server to always serve `index.html`.
    -   In `public_html`, create a new file named `.htaccess` (if one doesn't already exist).
    -   Edit the file and add the following code:
        ```apache
        <IfModule mod_rewrite.c>
          RewriteEngine On
          RewriteBase /
          RewriteRule ^index\.html$ - [L]
          RewriteCond %{REQUEST_FILENAME} !-f
          RewriteCond %{REQUEST_FILENAME} !-d
          RewriteCond %{REQUEST_FILENAME} !-l
          RewriteRule . /index.html [L]
        </IfModule>
        ```
    -   Save the file.

4.  **Test the Application**:
    -   Open your frontend domain in a browser.
    -   The application should load. Test all functionality, especially login and data fetching/saving, to ensure it's communicating correctly with the backend on Render.
    -   Use your browser's developer tools (F12) to check the Console and Network tabs for any errors.