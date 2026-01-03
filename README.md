# Ride Sharing Application - Documentation

A microservices-based ride sharing application with separate frontends for riders and drivers.

---

## 📋 Table of Contents

1. [Backend Microservices](#1-backend-microservices)
2. [Key API Routes](#2-key-api-routes-in-each-service)
3. [MongoDB Entities/Collections](#3-mongodb-entitiescollections)
4. [Request/Response Flow](#4-requestresponse-flow)
5. [Client-Side Modules](#5-client-side-modules)

---

## 1. Backend Microservices

### **auth-service** (Port: 3001)
- **Purpose**: Handles user and driver authentication, authorization, and user management
- **Responsibilities**:
  - User registration and login
  - Driver registration and login
  - JWT token generation and validation
  - User profile management
  - Email/OTP verification
  - Wallet balance management for users
  - User ratings
- **Database**: Uses MongoDB (shared instance)
- **Collections**: `users`, `captains` (drivers), `blacklisttokens`

### **rider-service** (Port: 3002)
- **Purpose**: Manages rider-specific data and ride requests 
- **Responsibilities**:
  - Rider profile creation and management
  - Ride request creation
  - Ride history for riders
  - Saved locations management
- **Database**: Uses MongoDB (shared instance)
- **Collections**: `riders`, `riderequests`
note that this service is not using most of things as it now none of it features is used so don't include it anywhere

### **driver-service** (Port: 3003)
- **Purpose**: Manages driver-specific operations and data
- **Responsibilities**:
  - Driver profile management
  - Driver availability status
  - Location updates
  - Nearby driver lookup
  - Wallet and subscription management
  - Driver earnings and statistics
  - Driver ratings
- **Database**: Uses MongoDB (shared instance)
- **Collections**: `drivers`
- **Shared APIs**: Used by `ride-service` for driver lookups and status updates

### **ride-service** (Port: 3004)
- **Purpose**: Core ride management and orchestration
- **Responsibilities**:
  - Ride creation and lifecycle management
  - Ride acceptance, start, completion, cancellation
  - Real-time communication via WebSockets (Socket.io)
  - Fare calculation
  - Route calculation
  - OTP generation and verification
  - Ride history for users and drivers
  - Rating system (driver and rider)
- **Database**: Uses MongoDB (shared instance)
- **Collections**: `rides`
- **Integrations**: 
  - Calls `driver-service` for nearby drivers and status updates
  - Calls `payment-service` to create payments on ride completion
  - Uses Socket.io for real-time updates

### **payment-service** (Port: 3005)
- **Purpose**: Handles payment processing and transactions
- **Responsibilities**:
  - Payment creation
  - Payment status tracking
  - Payment refunds
  - Integration with wallet systems (syncs with auth-service and driver-service)
- **Database**: Uses MongoDB (shared instance)
- **Collections**: `payments`
- **Shared APIs**: Called by `ride-service` when a ride is completed

### **notification-service** (Port: 3007)
- **Purpose**: Manages notifications for users
- **Responsibilities**:
  - Sending notifications (email, push)
  - Notification history
  - Mark notifications as read
- **Database**: Uses MongoDB (shared instance)
- **Collections**: `notifications`

### **api-gateway** (Port: 3000)
- **Purpose**: Single entry point for all client requests
- **Responsibilities**:
  - Routes requests to appropriate microservices
  - Handles CORS
  - Request proxying
  - WebSocket proxying for ride-service
- **Database**: None (stateless proxy)

### **analytic-service**
- **Purpose**: Analytics and reporting (structure exists, implementation may vary)
- **Database**: Uses MongoDB (shared instance)

---

## 2. Key API Routes in Each Service

### **Auth Service** (`/auth` via gateway)

#### User Routes (`/auth/users` or `/auth/user`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /profile` - Get user profile (authenticated)
- `GET /logout` - Logout user (authenticated)
- `PATCH /update-profile` - Update user profile (authenticated)
- `DELETE /delete` - Delete user account (authenticated)
- `POST /verify/request` - Request email verification OTP (authenticated)
- `POST /verify` - Verify email with OTP (authenticated)
- `GET /wallet` - Get wallet balance (authenticated)
- `PATCH /wallet` - Update wallet balance (authenticated)
- `PATCH /:id/rating` - Update user rating

#### Driver Routes (`/auth/drivers` or `/auth/captain`)
- `POST /register` - Register new driver
- `POST /login` - Driver login
- `GET /profile` - Get driver profile (authenticated)
- `GET /logout` - Logout driver (authenticated)

### **Rider Service** (`/rider` via gateway)
- `POST /profile` - Create/update rider profile (authenticated)
- `GET /profile` - Get rider profile (authenticated)
- `POST /request` - Create ride request (authenticated)
- `GET /myrides` - Get rider's ride history (authenticated)
note all these are handle by auth and ride service as it is close now

### **Driver Service** (`/driver` via gateway)
- `POST /register` - Create/update driver profile (authenticated)
- `GET /profile` - Get driver profile (authenticated)
- `PUT /availability` - Update driver availability status (authenticated)
- `PUT /location` - Update driver location (authenticated)
- `GET /wallet` - Get driver wallet balance (authenticated)
- `POST /wallet/add-funds` - Add funds to driver wallet (authenticated)
- `POST /subscription/subscribe` - Subscribe to a plan (authenticated)
- `GET /subscription/status` - Get own subscription status (authenticated)
- `GET /subscription-status/:userId` - Get subscription status for a user (internal)
- `GET /earnings/:driverId` - Get driver earnings (authenticated)
- `GET /history/:driverId` - Get driver ride history (authenticated)
- `GET /trip-summary` - Get trip summary (authenticated)
- `GET /nearby` - Get nearby drivers (public, used by ride-service)
- `GET /by-user/:userId` - Get driver by auth userId (internal)
- `PATCH /:userId/status` - Update driver status by userId (internal)
- `PATCH /:id/rating` - Update driver rating

### **Ride Service** (`/ride` via gateway)
- `POST /request` - Create ride request (authenticated, rider)
- `GET /active` - Get active ride for logged-in user/driver (authenticated)
- `POST /accept/:rideId` - Driver accepts a ride (authenticated, driver)
- `POST /start/:rideId` - Driver starts ride (authenticated, driver)
- `POST /complete/:rideId` - Driver completes ride (authenticated, driver)
- `POST /cancel/:rideId` - Cancel ride (authenticated, rider/driver)
- `GET /:rideId` - Get ride details (authenticated)
- `GET /history/user/:userId` - Get user ride history (authenticated)
- `GET /history/driver/:driverId` - Get driver ride history (authenticated)
- `POST /:rideId/rating/driver` - Rate driver (authenticated, rider)
- `POST /:rideId/rating/rider` - Rate rider (authenticated, driver)

### **Payment Service** (`/payment` via gateway)
- `POST /create` - Create payment record
- `GET /status/:paymentId` - Get payment status
- `PATCH /refund/:paymentId` - Refund a payment

### **Notification Service** (`/notification` via gateway)
- `POST /send` - Send notification
- `GET /:userId` - Get notifications for user
- `PUT /:id/read` - Mark notification as read

---

## 3. MongoDB Entities/Collections

### **User** (auth-service)
- **Collection**: `users`
- **Key Fields**:
  - `fullname.firstname`, `fullname.lastname` - User's name
  - `email` - Unique email address
  - `password` - Hashed password (not selected by default)
  - `socketId` - WebSocket connection ID
  - `isVerified` - Email verification status
  - `otp`, `otpExpires` - OTP for verification
  - `walletBalance` - Current wallet balance
  - `rating` - Average rating
  - `totalRatings` - Total number of ratings
  - `createdAt`, `updatedAt` - Timestamps

### **Driver (Auth)** (auth-service)
- **Collection**: `captains`
- **Key Fields**:
  - `fullname.firstname`, `fullname.lastname` - Driver's name
  - `email` - Unique email address
  - `mobileNumber` - Unique mobile number
  - `password` - Hashed password
  - `licenseNumber` - Driver's license number
  - `vehicle.color`, `vehicle.plate`, `vehicle.capacity`, `vehicle.vehicleType` - Vehicle information
  - `socketId` - WebSocket connection ID

### **Driver** (driver-service)
- **Collection**: `drivers`
- **Key Fields**:
  - `userId` - Reference to auth-service driver ID
  - `fullname.firstname`, `fullname.lastname` - Driver's name
  - `mobileNumber` - Unique mobile number
  - `vehicleInfo.model`, `vehicleInfo.plateNumber`, `vehicleInfo.color` - Vehicle details
  - `licenseNumber` - Driver's license number
  - `rating` - Average rating
  - `totalRatings` - Total number of ratings
  - `totalRides` - Total completed rides
  - `totalEarnings` - Total earnings
  - `isAvailable` - Availability status
  - `location.lat`, `location.lng` - Current location coordinates
  - `walletBalance` - Driver's wallet balance
  - `subscription.isActive` - Subscription status
  - `subscription.plan.name`, `subscription.plan.durationDays`, `subscription.plan.price` - Subscription plan details
  - `subscription.startedAt`, `subscription.expiresAt` - Subscription dates
  - `reviews[]` - Array of review objects (rideId, userId, rating, comment, createdAt)
  - `createdAt`, `updatedAt` - Timestamps

### **Rider** (rider-service)
- **Collection**: `riders`
- **Key Fields**:
  - `userId` - Reference to auth-service user ID
  - `rating` - Average rating
  - `totalRides` - Total completed rides
  - `preferredPayment` - Preferred payment method (default: "cash")
  - `savedLocations[]` - Array of saved locations (name, coordinates.lat, coordinates.lng)
  - `createdAt`, `updatedAt` - Timestamps

### **RideRequest** (rider-service)
- **Collection**: `riderequests`
- **Key Fields**:
  - `riderId` - Reference to Rider document
  - `pickup` - Pickup location (string)
  - `drop` - Drop location (string)
  - `status` - Status enum: "pending", "accepted", "completed", "cancelled"
  - `fareEstimate` - Estimated fare
  - `createdAt`, `updatedAt` - Timestamps

### **Ride** (ride-service)
- **Collection**: `rides`
- **Key Fields**:
  - `riderId` - Rider's user ID (string)
  - `driverId` - Driver's user ID (string, nullable)
  - `driverServiceId` - Driver service ID (string, nullable)
  - `pickup` - GeoJSON Point (type: "Point", coordinates: [lng, lat])
  - `destination` - GeoJSON Point (type: "Point", coordinates: [lng, lat])
  - `distanceKm` - Distance in kilometers
  - `durationMin` - Duration in minutes
  - `fare` - Calculated fare
  - `fareBreakdown` - Detailed fare breakdown object
  - `status` - Status enum: "REQUESTED", "ACCEPTED", "STARTED", "COMPLETED", "CANCELLED"
  - `otp` - 4-digit OTP for ride verification
  - `otpVerified` - OTP verification status
  - `driverRating.rating`, `driverRating.review` - Driver rating by rider
  - `riderRating.rating`, `riderRating.review` - Rider rating by driver
  - `startedAt` - Ride start timestamp
  - `completedAt` - Ride completion timestamp
  - `cancelledAt` - Ride cancellation timestamp
  - `cancellationReason` - Reason for cancellation
  - `paymentStatus` - Payment status enum: "PENDING", "PAID", "REFUNDED"
  - `createdAt`, `updatedAt` - Timestamps

### **Payment** (payment-service)
- **Collection**: `payments`
- **Key Fields**:
  - `rideId` - Reference to ride ID
  - `userId` - Rider's user ID
  - `driverId` - Driver's user ID
  - `amount` - Payment amount
  - `status` - Status enum: "PENDING", "SUCCESS", "FAILED", "REFUNDED"
  - `paymentMethod` - Payment method enum: "WALLET", "RAZORPAY", "CASH", "STRIPE"
  - `transactionId` - Unique transaction ID
  - `createdAt`, `updatedAt` - Timestamps

### **Notification** (notification-service)
- **Collection**: `notifications`
- **Key Fields**:
  - `userId` - User ID who receives notification
  - `type` - Notification type enum: "ride", "payment", "system", "promo"
  - `title` - Notification title
  - `message` - Notification message
  - `isRead` - Read status
  - `createdAt` - Timestamp

### **BlacklistToken** (auth-service)
- **Collection**: `blacklisttokens`
- **Key Fields**:
  - `token` - JWT token string
  - `expiresAt` - Token expiration timestamp

---

## 4. Request/Response Flow

### **Rider Requests Ride**

1. **Rider creates ride request**:
   - **Endpoint**: `POST /ride/request`
   - **Request Body**: `{ pickup: { lat, lng }, destination: { lat, lng } }`
   - **Process**:
     - Ride service calculates route (distance, duration) using `getRoute()`
     - Calculates fare using `calculateFare()`
     - Generates 4-digit OTP
     - Creates Ride document with status "REQUESTED"
     - Fetches nearby drivers from driver-service (`GET /drivers/nearby`)
     - Broadcasts ride request to all drivers via Socket.io (`ride_broadcast` event)
   - **Response**: `{ rideId, distanceKm, durationMin, fare, otp, message }`

2. **Driver receives broadcast**:
   - All drivers in "drivers" room receive `ride_broadcast` event via Socket.io
   - Event includes: `rideId`, `pickup`, `destination`, `distanceKm`, `durationMin`, `fare`, `nearbyDrivers`

### **Driver Accepts Ride**

1. **Driver accepts ride**:
   - **Endpoint**: `POST /ride/accept/:rideId`
   - **Process**:
     - Validates ride exists and status is "REQUESTED"
     - Checks driver subscription status (must be active)
     - Updates Ride: sets `driverId`, changes status to "ACCEPTED"
     - Updates driver availability to `false` in driver-service
     - Fetches full driver profile from driver-service
     - Emits Socket.io events:
       - `ride_accepted` to rider room (`rider_{riderId}`)
       - `ride_accepted` to driver room (`driver_{driverId}`)
   - **Response**: `{ success: true, message: "Ride accepted", driver: {...} }`

2. **State Changes**:
   - Ride status: `REQUESTED` → `ACCEPTED`
   - Driver `isAvailable`: `true` → `false`
   - Ride `driverId` is set

### **Location Updates**

1. **Driver location updates**:
   - **Endpoint**: `PUT /driver/location`
   - **Request Body**: `{ lat, lng }`
   - **Process**:
     - Updates driver's location in driver-service
     - Location is stored in `driver.location.lat` and `driver.location.lng`
   - **Frequency**: Updated whenever driver moves (typically via frontend location tracking)

2. **Real-time location sharing**:
   - During active rides, location updates are shared via Socket.io
   - Driver location is broadcast to rider in real-time
   - Used for live map tracking

### **Payment Object Created**

1. **When payment is created**:
   - **Trigger**: When ride status changes to "COMPLETED"
   - **Endpoint**: `POST /payment/create` (called internally by ride-service)
   - **Request Body**: 
     ```json
     {
       "rideId": "...",
       "userId": "...",
       "driverId": "...",
       "amount": 150,
       "paymentMethod": "WALLET"
     }
     ```

2. **Payment creation process**:
   - Payment service creates Payment document with status "PENDING"
   - Generates unique `transactionId` (format: `TXN-{timestamp}`)
   - After 2 seconds (simulated processing), payment status changes to "SUCCESS"
   - Syncs with auth-service: Deducts amount from rider's wallet
   - Syncs with driver-service: Adds amount to driver's earnings
   - Updates ride `paymentStatus` to "PAID"

3. **What's stored in Payment**:
   - `rideId` - Links payment to ride
   - `userId` - Rider who pays
   - `driverId` - Driver who receives payment
   - `amount` - Payment amount
   - `status` - Payment status
   - `paymentMethod` - How payment was made
   - `transactionId` - Unique transaction identifier
   - Timestamps

### **Ride Start Flow**

1. **Driver starts ride**:
   - **Endpoint**: `POST /ride/start/:rideId`
   - **Request Body**: `{ driverLocation: { lat, lng }, otp: "1234" }`
   - **Process**:
     - Validates driver is assigned to ride
     - Validates ride status is "ACCEPTED"
     - Calculates distance between driver location and pickup point
     - Verifies OTP matches ride's OTP
     - Updates ride: `otpVerified = true`, status → "STARTED", sets `startedAt`
     - Emits `ride_started` event to rider via Socket.io
   - **Response**: `{ success: true, message: "Ride started" }`

### **Ride Completion Flow**

1. **Driver completes ride**:
   - **Endpoint**: `POST /ride/complete/:rideId`
   - **Request Body**: `{ distanceMeters, durationSec }` (optional)
   - **Process**:
     - Validates ride status is "STARTED"
     - Recalculates fare based on actual distance/duration
     - Updates ride: status → "COMPLETED", sets `completedAt`
     - Marks driver as available again (`isAvailable = true`)
     - Creates payment via payment-service
     - Emits `ride_completed` event via Socket.io
   - **Response**: `{ success: true, message: "Ride completed", data: {...} }`

---

## 5. Client-Side Modules

### **Rider Frontend** (`ride-frontend/`)

#### **Pages** (`src/pages/`)
- **Dashboard.tsx** - Main rider dashboard with:
  - Ride request interface
  - Map integration for pickup/destination selection
  - Active ride tracking
  - Ride history
- **Login.tsx** - User login page
- **Register.tsx** - User registration page
- **Profile.tsx** - User profile management

#### **Components** (`src/components/`)
- **RideMap.tsx** - Interactive map component for ride requests and tracking

#### **Services** (`src/services/`)
- **axios.ts** - Axios instance configuration
- **routerService.ts** - Route calculation service
- **socket.ts** - Socket.io client connection

#### **Store** (`src/store/`)
- **authSlice.ts** - Redux slice for authentication state
- **rideSlice.ts** - Redux slice for ride state management
- **index.ts** - Redux store configuration

#### **Utils** (`src/utils/`)
- **types.ts** - TypeScript type definitions

---

### **Driver Frontend** (`driver-frontend/`)

#### **Pages** (`src/pages/`)
- **Dashboard.tsx** - Main driver dashboard with:
  - Ride request notifications
  - Active ride management
  - Location tracking
  - Earnings display
- **Login.tsx** - Driver login page
- **Register.tsx** - Driver registration page
- **DriverProfile.tsx** - Driver profile management
- **WalletPage.tsx** - Wallet balance and transaction history

#### **Components** (`src/components/`)
- **RideMap.tsx** - Interactive map component for ride navigation
- **driver/ProtectedDriverRoute.tsx** - Route protection for authenticated drivers
- **driver/SubscriptionCard.tsx** - Subscription plan display and management
- **driver/WalletCard.tsx** - Wallet balance card component

#### **Services** (`src/services/`)
- **axiosInstance.ts** - Axios instance configuration
- **routeService.ts** - Route calculation service
- **socket.ts** - Socket.io client connection

#### **Store** (`src/store/`)
- **slices/driverAuthSlice.ts** - Redux slice for driver authentication
- **slices/driverLocationSlice.ts** - Redux slice for location tracking
- **slices/driverRideSlice.ts** - Redux slice for ride state management
- **slices/driverWalletSlice.ts** - Redux slice for wallet state
- **index.ts** - Redux store configuration

---

## 🚀 Getting Started

### Prerequisites
- Node.js and npm
- MongoDB running on `localhost:27017`
- Environment variables configured for each service

### Running the Application

1. **Start all backend services**:
   ```bash
   npm run start:all
   ```

2. **Start frontends**:
   ```bash
   npm run start:frontend
   ```

   Or individually:
   ```bash
   npm run start:Riderfrontend  # Port 5173
   npm run start:Driverfrontend  # Port 5174
   ```

### Service Ports
- API Gateway: `3000`
- Auth Service: `3001`
- Rider Service: `3002`
- Driver Service: `3003`
- Ride Service: `3004`
- Payment Service: `3005`
- Notification Service: `3007`
- Rider Frontend: `5173`
- Driver Frontend: `5174`

---

## 📝 Notes

- All services connect to the same MongoDB instance but use different collections
- JWT tokens are used for authentication across services
- Socket.io is used for real-time communication (ride broadcasts, status updates)
- The API Gateway acts as a single entry point and routes requests to appropriate services
- Driver subscription is required to accept rides
- OTP verification is required to start a ride

---

## 🔧 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Frontend**: React, TypeScript, Redux Toolkit
- **Maps**: Integration with mapping services
- **Authentication**: JWT tokens

