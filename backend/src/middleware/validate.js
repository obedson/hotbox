const { z } = require('zod');
const { SELF_SIGNUP_ROLES, STAFF_ROLES } = require('../config/roles');

// Schema for User Registration
// Identity is self-service only: visitors may create a customer, hub partner,
// rider or enterprise account. Staff roles are provisioned by an administrator.
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  phone: z.string().trim().min(11, 'Enter a valid Nigerian phone number').max(25),
  email: z.string().trim().email('Enter a valid email address').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum(SELF_SIGNUP_ROLES).default('customer'),
  businessName: z.string().trim().max(120).optional(),
  postcode: z.string().trim().max(20).optional(),
  addressText: z.string().trim().max(200).optional(),
  neighbourhood: z.string().trim().max(120).optional(),
  capacity: z.number().int().positive().max(5000).optional(),
  vehicleType: z.enum(['bicycle', 'motorcycle', 'van', 'truck']).optional(),
  plateNumber: z.string().trim().max(20).optional(),
  cacNumber: z.string().trim().max(40).optional()
});

// Schema for Sign In
const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your phone number or email address'),
  password: z.string().min(1, 'Enter your password')
});

// Schema for a forgotten-password request
const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address')
});

// Schema for resetting a password with a token from the recovery email
const resetPasswordSchema = z.object({
  token: z.string().min(20, 'That recovery link is no longer valid'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72)
});

// Schema for an administrator provisioning a staff or partner account.
const createStaffSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  email: z.string().trim().email('Enter a valid email address').max(120),
  phone: z.string().trim().min(11, 'Enter a valid Nigerian phone number').max(25),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum([...STAFF_ROLES, ...SELF_SIGNUP_ROLES]),
  businessName: z.string().trim().max(120).optional(),
  cacNumber: z.string().trim().max(40).optional(),
  postcode: z.string().trim().max(20).optional(),
  neighbourhood: z.string().trim().max(120).optional(),
  capacity: z.number().int().positive().max(5000).optional(),
  vehicleType: z.enum(['bicycle', 'motorcycle', 'van', 'truck']).optional(),
  plateNumber: z.string().trim().max(20).optional()
});

// Schema for Shipment Booking
const bookingSchema = z.object({
  serviceType: z.enum(['ADDRESS_TO_HUB', 'HUB_TO_HUB', 'DOOR_TO_HUB', 'HUB_TO_DOOR']).default('DOOR_TO_HUB'),
  senderName: z.string().optional(),
  senderPhone: z.string().min(10),
  senderPostcode: z.string().min(4, 'Valid Nigerian postcode required'),
  senderAddressText: z.string().min(3),
  recipientName: z.string().min(2),
  recipientPhone: z.string().min(10),
  recipientEmail: z.string().optional().nullable(),
  recipientPostcode: z.string().min(4),
  recipientAddressText: z.string().min(3),
  destinationHubId: z.string().optional().nullable(),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  weightKg: z.number().positive().optional().default(1.0),
  packageDescription: z.string().optional(),
  declaredValueNgn: z.number().nonnegative().optional().default(0.00)
});

// Schema for Custody Handover
const custodyTransferSchema = z.object({
  shipmentId: z.string().min(1, 'Valid shipment identifier required'),
  handoverType: z.enum([
    'SENDER_TO_RIDER',
    'RIDER_TO_HUB',
    'HUB_TO_RECIPIENT',
    'HUB_TO_RIDER',
    'RIDER_TO_RECIPIENT',
    'HUB_TO_RETURN'
  ]),
  verificationMethod: z.enum(['OTP', 'QR_SCAN', 'SIGNATURE_PHOTO', 'PIN', 'ADMIN_OVERRIDE']).default('OTP'),
  verificationToken: z.string().min(4, 'Verification token or OTP required'),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  bayCode: z.string().optional().nullable(),
  notes: z.string().optional()
});

// Middleware generator
function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (err) {
      const issues = err.issues || err.errors || [];
      if (issues.length > 0) {
        return res.status(400).json({
          error: issues[0].message,
          details: issues.map(e => ({ field: (e.path || []).join('.'), message: e.message }))
        });
      }
      return res.status(400).json({ error: err.message });
    }
  };
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createStaffSchema,
  bookingSchema,
  custodyTransferSchema
};
