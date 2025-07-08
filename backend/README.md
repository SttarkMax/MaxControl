# MaxControl Backend

This is the Node.js, Express, and MySQL backend for the MaxControl application.

## Features

-   REST API for all application data (Products, Customers, Quotes, etc.).
-   JWT-based authentication for secure endpoints.
-   Password hashing using `bcryptjs`.
-   Integration with Google Gemini API for AI features.
-   CORS enabled for cross-domain communication with the frontend.
-   Structured with routes, controllers, and middleware for scalability.

---

## Local Development Setup

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or higher recommended)
-   [NPM](https://www.npmjs.com/)
-   A running [MySQL](https://www.mysql.com/) server instance.
-   A tool to manage MySQL databases, like [MySQL Workbench](https://www.mysql.com/products/workbench/) or [DBeaver](https://dbeaver.io/).

### 1. Clone the Repository

If the project is in a git repository, clone it. Otherwise, ensure you have the `backend` directory.

### 2. Install Dependencies

Navigate to the `backend` directory and run:

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file in the root of the `backend` directory by copying the example file:

```bash
cp .env.example .env
```

Now, open the `.env` file and fill in the required values:

```dotenv
NODE_ENV=development
PORT=5001

# --- Database Connection ---
# Replace with your local MySQL server details
DB_HOST=localhost
DB_USER=root # Or your MySQL username
DB_PASSWORD=your_mysql_password
DB_DATABASE=maxcontrol_db # The name of the database you will create
DB_PORT=3306

# --- JWT Authentication ---
# Generate a strong, random string for the JWT secret
JWT_SECRET=a_very_strong_and_secret_key_for_jwt

# --- Google Gemini API ---
# Your API key from Google AI Studio
API_KEY=your_gemini_api_key
```

### 4. Create and Setup the Database

1.  **Create the Database**: Using your MySQL management tool, create a new database with the name you specified in `DB_DATABASE` (e.g., `maxcontrol_db`).

2.  **Import the Schema**: Import the table structure by running the `database.sql` file located in the `backend` directory. You can do this via your management tool's "Import" or "Run SQL Script" feature, or via the command line:
    ```bash
    mysql -u your_mysql_username -p maxcontrol_db < database.sql
    ```
    You will be prompted for your MySQL password.

3.  **Create an Admin User (Optional but Recommended)**: The `database.sql` file includes a command to insert a default admin user. You can modify the password directly in the file before importing, or update it later.
    -   **Username**: `admin`
    -   **Password**: `admin123`
    -   **Full Name**: `Admin User`
    -   **Role**: `admin`

### 5. Start the Development Server

Once the dependencies, environment variables, and database are set up, you can start the backend server:

```bash
npm run dev
```

This command uses `nodemon` to automatically restart the server whenever you make changes to the code.

The server should now be running at `http://localhost:5001`.

---

## API Endpoints

The API is structured by resource. All data-related endpoints are protected and require a `Bearer <token>` in the `Authorization` header.

-   `/api/auth/login` - [POST] User login
-   `/api/auth/me` - [GET] Get current user profile
-   `/api/products` - [GET, POST] Product management
-   `/api/categories` - [GET, POST] Category management
-   `/api/customers` - [GET, POST] Customer management
-   ...and so on for all other resources.

---

## Deployment to Render

This backend is designed to be easily deployed on a service like [Render](https://render.com/).

### 1. Prepare your code

Push your code to a GitHub or GitLab repository.

### 2. Create a New Web Service on Render

1.  Log in to your Render dashboard.
2.  Click "New +" and select "Web Service".
3.  Connect your GitHub/GitLab repository and select the repo containing the backend code.
4.  Configure the service:
    -   **Name**: A unique name for your service (e.g., `maxcontrol-backend`).
    -   **Root Directory**: If your backend is in a subdirectory (e.g., `backend`), specify it here. Otherwise, leave it blank.
    -   **Runtime**: `Node`.
    -   **Build Command**: `npm install`.
    -   **Start Command**: `npm start`.

### 3. Set Up the Database on Render

1.  While you can connect to an external MySQL database, it's recommended to use Render's own managed database for simplicity.
2.  Click "New +" and select "PostgreSQL" or "MySQL" (if available). Create a new database instance.
3.  Once the database is created, Render will provide you with connection details (Host, User, Password, Database Name).

### 4. Configure Environment Variables on Render

1.  Go to your Web Service's dashboard on Render.
2.  Navigate to the "Environment" tab.
3.  Add all the environment variables from your local `.env` file.
    -   `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` should be the values from your Render database instance.
    -   Set `NODE_ENV` to `production`.
    -   Set `JWT_SECRET` and `API_KEY` to your production values.

### 5. Deploy

After setting the environment variables, Render will automatically trigger a new deployment. You can monitor the deployment logs.

Once deployed, Render will provide you with a public URL for your backend (e.g., `https://maxcontrol-backend.onrender.com`).

### 6. Update Frontend Configuration

Finally, update the `config.ts` file in your frontend application with the public URL of your Render backend and redeploy your frontend.

```typescript
// frontend/src/config.ts
export const API_BASE_URL = 'https://maxcontrol-backend.onrender.com';
```
