const { z } = require('zod');

// Schema for User Registration
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).optional(),
  role: z.enum([
    'customer',
    'hub_owner',
    'hub_staff',
    'rider',
    'courier_company',
    'enterprise_shipper',
    'ops_admin',
    'compliance_officer',
    'finance_officer',
    'support_agent',
    'super_admin'
  ]).default('customer'),
  businessName: z.string().optional(),
  postcode: z.string().optional(),
  addressText: z.string().optional(),
  neighbourhood: z.string().optional(),
  capacity: z.number().optional(),
  vehicleType: z.string().optional(),
  plateNumber: z.string().optional(),
  cacNumber: z.string().optional()
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
          error: 'Validation Error',
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
  bookingSchema,
  custodyTransferSchema
};
