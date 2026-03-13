# SDP Backend API

A complete Node.js + Express backend for the SDP system with MySQL and Prisma ORM.

## Features

- **Role-based Authentication**: Admin, Employee, and Customer roles
- **JWT Authentication**: Secure token-based authentication
- **MySQL Database**: Using Prisma ORM for database operations
- **File Upload**: Image upload support with multer
- **Validation**: Zod schema validation
- **Error Handling**: Comprehensive error handling with consistent response format
- **Security**: CORS, rate limiting, and helmet middleware

## Tech Stack

- **Node.js** + **Express**
- **MySQL** (via XAMPP)
- **Prisma ORM**
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Zod** for validation
- **multer** for file uploads
- **CORS** for cross-origin requests

## Installation

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up Environment Variables**
   Create your own local `.env` file in the backend directory (do not commit it).
   You can start from the template `backend/.env.example`:
   - Copy `.env.example` to `.env`
   - Fill in your local values

   Example:
   ```env
   # Database Configuration
   DATABASE_URL="mysql://root:@localhost:3307/sdp_db"
   
   # JWT Configuration
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_EXPIRES_IN="24h"
   
   # Server Configuration
   PORT=5000
   
   # File Upload Configuration
   MAX_FILE_SIZE=5000000  # 5MB
   UPLOAD_PATH="./uploads"
   
   # CORS Configuration
   CORS_ORIGIN="http://localhost:5173"
   ```

3. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

4. **Run Database Migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Customer registration
- `POST /api/auth/login` - User login (Admin/Employee/Customer)
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/verify-code` - Verify reset code
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user profile (Protected)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)
- `POST /api/products/:id/image` - Upload product image (Admin)

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale by ID
- `POST /api/sales` - Create new sale
- `GET /api/sales/export` - Export sales data (CSV)

### Reservations
- `GET /api/reservations` - Get reservations (role-based)
- `GET /api/reservations/:id` - Get reservation by ID
- `POST /api/reservations` - Create reservation (Customer)
- `PUT /api/reservations/:id` - Update reservation (Admin/Employee)

### Customers
- `GET /api/customers` - Get all customers (Admin/Employee)
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer profile

### Alerts
- `GET /api/alerts` - Get all notifications
- `GET /api/alerts/low-stock` - Get low stock alerts
- `PUT /api/alerts/:id/read` - Mark notification as read

### Reports
- `GET /api/reports` - Get reports
- `GET /api/reports/sales` - Generate sales report
- `GET /api/reports/inventory` - Generate inventory report
- `GET /api/reports/performance` - Generate performance report

### Settings
- `GET /api/settings/profile` - Get user profile
- `PUT /api/settings/profile` - Update profile
- `PUT /api/settings/password` - Change password
- `GET /api/settings/company` - Get company settings (Admin)
- `PUT /api/settings/company` - Update company settings (Admin)

## Response Format

All API responses follow this format:

```json
{
  "success": true|false,
  "message": "Response message",
  "data": { /* response data */ },
  "errors": [ /* validation errors */ ]
}
```

## Error Handling

The API provides consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Error message"
    }
  ]
}
```

## Database Schema

The system uses 12 main tables:
- `customer` - Customer information
- `employee` - Employee information  
- `admin` - Admin information
- `product` - Product catalog
- `reservation` - Service reservations
- `sale` - Sales transactions
- `invoice` - Invoice generation
- `contact` - Customer contact messages
- `notification` - System notifications
- `report` - Generated reports
- `inventory_update` - Stock movement tracking
- `manage_user` - User management audit

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Authorization**: Different permissions for Admin, Employee, Customer
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security headers

## Development

- **Development Server**: `npm run dev`
- **Production Server**: `npm start`
- **Prisma Studio**: `npx prisma studio` (for database management)

## Frontend Integration

The backend is designed to work seamlessly with the Vite + React frontend:

```javascript
// Example API call from frontend
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();
if (data.success) {
  localStorage.setItem('token', data.data.token);
  // Redirect to dashboard
}
```

## License

MIT License
