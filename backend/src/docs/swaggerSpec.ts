export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'SpiceHub Enterprise Hospitality ERP API',
    version: '1.0.0',
    description: 'Enterprise API documentation for multi-tenant hotel PMS, restaurant POS, KDS, OTA channel management and billing engine.',
    contact: {
      name: 'SpiceHub Engineering Support',
      email: 'dev@spicehub.io',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Core Engine',
    },
    {
      url: 'https://api.spicehub.io',
      description: 'Production Cloud Cluster',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/v1/auth/login': {
      post: {
        summary: '1. Authenticate Staff / Admin User',
        description: 'Authenticates a staff member, hotel admin, or super admin and returns tenant-isolated JWT tokens.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@tajgateway.com' },
                  password: { type: 'string', example: 'SpiceHub@123' },
                  pinCode: { type: 'string', example: '1111' },
                  hotelSlug: { type: 'string', example: 'taj-gateway' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful with signed JWT session.',
            content: {
              'application/json': {
                example: {
                  success: true,
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  user: { id: '654321', name: 'Taj Admin', role: 'HOTEL_ADMIN', hotelId: '654320' },
                },
              },
            },
          },
          401: { description: 'Invalid email, password, or PIN' },
        },
      },
    },
    '/api/v1/pms/reception/check-in': {
      post: {
        summary: '2. Guest Check-In & Room Allocation',
        description: 'Checks in an arriving guest, captures KYC / ID proof, assigns physical room, and marks room status to OCCUPIED.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['guestName', 'guestPhone', 'roomId'],
                properties: {
                  guestName: { type: 'string', example: 'Vikram Malhotra' },
                  guestPhone: { type: 'string', example: '+91-9820012345' },
                  idProofType: { type: 'string', example: 'AADHAAR' },
                  idProofNumber: { type: 'string', example: '9876-5432-1098' },
                  roomId: { type: 'string', example: '671ee123456789abcdef' },
                  advancePaymentAmount: { type: 'number', example: 5000 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Guest checked in successfully. Room occupied.',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Guest checked in successfully. Room is now OCCUPIED.',
                  stay: { id: 'stay-99', roomNumber: '101', guestName: 'Vikram Malhotra', stayStatus: 'ACTIVE' },
                },
              },
            },
          },
          400: { description: 'Missing required guest parameters or room already occupied' },
        },
      },
    },
    '/api/v1/customer/orders': {
      post: {
        summary: '3. Place Dine-In / In-Room Order',
        description: 'Submits a table or room service order from digital guest menu with instant KOT generation.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  tableId: { type: 'string', example: '671ee987654321abcdef' },
                  roomId: { type: 'string', example: '671ee123456789abcdef' },
                  cookingInstructions: { type: 'string', example: 'Make paneer medium spicy' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        menuItemId: { type: 'string', example: '671eebbb99990000abcdef' },
                        quantity: { type: 'number', example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Order placed and KOT dispatched to kitchen station.',
            content: {
              'application/json': {
                example: {
                  success: true,
                  orderNumber: 'ORD-10492',
                  orderStatus: 'PLACED',
                  totalAmount: 750,
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/billing/payment/process': {
      post: {
        summary: '4. Settle Bill & Process Payment',
        description: 'Processes cash, UPI, card, or room-folio settlement for restaurant bills with double-payment idempotency guards.',
        parameters: [
          {
            name: 'x-idempotency-key',
            in: 'header',
            required: true,
            schema: { type: 'string', example: 'idem_pay_1793080000' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['billId', 'paymentMode', 'amount'],
                properties: {
                  billId: { type: 'string', example: '671ee99999990000abcdef' },
                  paymentMode: { type: 'string', enum: ['CASH', 'UPI', 'CARD', 'ROOM_FOLIO'], example: 'CASH' },
                  amount: { type: 'number', example: 1050 },
                  cashReceived: { type: 'number', example: 1500 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Payment settled. Change due calculated.',
            content: {
              'application/json': {
                example: {
                  success: true,
                  paymentId: 'pay_998811',
                  amountPaid: 1050,
                  cashChangeReturned: 450,
                  billStatus: 'PAID',
                },
              },
            },
          },
          400: {
            description: 'ALREADY_PAID or PAYMENT_EXCEEDS_DUE',
            content: {
              'application/json': {
                example: { success: false, errorCode: 'ALREADY_PAID', message: 'Bill is already paid' },
              },
            },
          },
        },
      },
    },
    '/api/v1/pos/kds/orders': {
      get: {
        summary: '5. Get Active KDS Kitchen Tickets',
        description: 'Retrieves live active orders classified by kitchen station and production stages (PLACED, PREPARING, READY).',
        responses: {
          200: {
            description: 'List of active tickets awaiting preparation.',
            content: {
              'application/json': {
                example: {
                  success: true,
                  count: 4,
                  orders: [
                    {
                      id: '671ee22200001111abcdef',
                      orderNumber: 'ORD-10492',
                      tableNumber: 'T-04',
                      status: 'PREPARING',
                      elapsedMinutes: 6,
                      items: [{ name: 'Paneer Butter Masala', quantity: 2, station: 'Hot Kitchen' }],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
};
