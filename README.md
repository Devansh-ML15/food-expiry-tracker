# Food Expiry Tracker

A web application to track food expiry dates and receive email notifications.

## Deployment Instructions

### Backend Deployment (Render.com)

1. Create a new account on [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the service:
   - Name: food-expiry-tracker-backend
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add Environment Variables:
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASSWORD`: Your Gmail app password
   - `NODE_ENV`: production
   - `FRONTEND_URL`: Your Netlify frontend URL

### Frontend Deployment (Netlify)

1. Create a new account on [Netlify](https://netlify.com)
2. Create a new site from Git
3. Connect your GitHub repository
4. Configure the build:
   - Build command: Leave empty (static site)
   - Publish directory: public
5. Add Environment Variables:
   - `VITE_API_URL`: Your Render backend URL

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `EMAIL_USER`: Gmail address for sending notifications
- `EMAIL_PASSWORD`: Gmail app password
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Frontend URL for CORS (in production)

## Features

- Track food expiry dates
- Receive email notifications
- User authentication
- Responsive design 