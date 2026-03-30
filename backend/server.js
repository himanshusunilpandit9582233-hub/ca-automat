/**
 * CA Automation Backend - Node.js/Express
 * 
 * 32-BIT STATUS BITMASK SYSTEM
 * ============================
 * status_code is a combination of multiple flags stored in a single integer
 * using bitwise operations. Each verification step is a POWER OF 2:
 *
 * | Step                | Bit Position | Value | Binary      |
 * |---------------------|--------------|-------|-------------|
 * | PAN Verified        | 0            | 1     | 0b0000001   |
 * | GST Verified        | 1            | 2     | 0b0000010   |
 * | CIN Verified        | 2            | 4     | 0b0000100   |
 * | Consent Given       | 3            | 8     | 0b0001000   |
 * | AIS Access Approved | 4            | 16    | 0b0010000   |
 * | ITR Data Fetched    | 5            | 32    | 0b0100000   |
 * | Account Created     | 6            | 64    | 0b1000000   |
 *
 * BITMASK OPERATIONS:
 * ------------------
 * SET a flag:    status = status | BIT_VALUE     (bitwise OR)
 * CHECK a flag:  (status & BIT_VALUE) !== 0      (bitwise AND)
 * REMOVE a flag: status = status & ~BIT_VALUE    (bitwise AND NOT)
 *
 * EXAMPLE:
 * --------
 * User completes PAN (1) and GST (2) verification:
 * Initial:   status = 0           (0b0000000)
 * After PAN: status = 0 | 1 = 1   (0b0000001) - PAN flag is ON
 * After GST: status = 1 | 2 = 3   (0b0000011) - PAN + GST flags are ON
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
const PORT = 8001;

// ==========================================
// 32-BIT STATUS BITMASK CONSTANTS
// ==========================================
const StatusBit = {
  PAN_VERIFIED: 1,      // 2^0 = 0b0000001
  GST_VERIFIED: 2,      // 2^1 = 0b0000010
  CIN_VERIFIED: 4,      // 2^2 = 0b0000100
  CONSENT_GIVEN: 8,     // 2^3 = 0b0001000
  AIS_ACCESS: 16,       // 2^4 = 0b0010000
  ITR_FETCHED: 32,      // 2^5 = 0b0100000
  ACCOUNT_CREATED: 64,  // 2^6 = 0b1000000

  /**
   * Set a specific bit in the status code using bitwise OR.
   * This ADDS the flag without affecting other flags.
   * Example: setBit(1, 2) = 1 | 2 = 3 (both PAN and GST flags ON)
   */
  setBit: (status, bitValue) => status | bitValue,

  /**
   * Check if a specific bit is set using bitwise AND.
   * Example: checkBit(3, 1) = (3 & 1) = 1 !== 0 → true (PAN is verified)
   * Example: checkBit(3, 4) = (3 & 4) = 0 === 0 → false (CIN not verified)
   */
  checkBit: (status, bitValue) => (status & bitValue) !== 0,

  /**
   * Remove a specific bit from the status code using bitwise AND NOT.
   * Example: removeBit(3, 1) = 3 & ~1 = 2 (only GST flag ON)
   */
  removeBit: (status, bitValue) => status & ~bitValue,

  /**
   * Get a breakdown of all status bits
   */
  getStatusBreakdown: (status) => ({
    pan_verified: (status & 1) !== 0,
    gst_verified: (status & 2) !== 0,
    cin_verified: (status & 4) !== 0,
    consent_given: (status & 8) !== 0,
    ais_access: (status & 16) !== 0,
    itr_fetched: (status & 32) !== 0,
    account_created: (status & 64) !== 0,
  }),

  /**
   * Get binary representation of status (7 bits)
   */
  getBinaryString: (status) => status.toString(2).padStart(7, '0')
};

// Onboarding flow configuration
const ONBOARDING_FLOWS = {
  individual: ['pan', 'consent'],
  sole_proprietor: ['pan', 'gst', 'consent'],
  opc: ['pan', 'cin', 'consent'],
  pvt_ltd: ['cin', 'gst', 'director_pan', 'consent']
};

const STEP_TO_BIT = {
  pan: StatusBit.PAN_VERIFIED,
  director_pan: StatusBit.PAN_VERIFIED,
  gst: StatusBit.GST_VERIFIED,
  cin: StatusBit.CIN_VERIFIED,
  consent: StatusBit.CONSENT_GIVEN,
  ais: StatusBit.AIS_ACCESS,
  itr: StatusBit.ITR_FETCHED,
  account: StatusBit.ACCOUNT_CREATED
};

// ==========================================
// JWT CONFIGURATION
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const ACCESS_TOKEN_EXPIRE = '15m';
const REFRESH_TOKEN_EXPIRE = '7d';

// ==========================================
// MONGOOSE SCHEMAS
// ==========================================
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['individual', 'sole_proprietor', 'opc', 'pvt_ltd', null], default: null },
  created_at: { type: Date, default: Date.now }
});

const onboardingStatusSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status_code: { type: Number, default: 0 },
  updated_at: { type: Date, default: Date.now }
});

const userDetailsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pan: { type: String },
  pan_key: { type: String },
  pan_verified_at: { type: Date },
  gstin: { type: String },
  gst_key: { type: String },
  gst_verified_at: { type: Date },
  cin: { type: String },
  cin_key: { type: String },
  cin_verified_at: { type: Date },
  consent_key: { type: String },
  consent_given_at: { type: Date },
  ais_consent: { type: Boolean },
  itr_consent: { type: Boolean },
  business_name: { type: String },
  director_name: { type: String },
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const OnboardingStatus = mongoose.model('OnboardingStatus', onboardingStatusSchema);
const UserDetails = mongoose.model('UserDetails', userDetailsSchema);

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Generate a unique verification key for each step.
 * This key is proof that the user completed this verification.
 */
function generateVerificationKey(userId, step, value) {
  const timestamp = Date.now().toString();
  const rawString = `${userId}:${step}:${value}:${timestamp}`;
  const hash = crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 8);
  return `${step}_${userId.toString().substring(0, 8)}_${hash}`;
}

function createAccessToken(userId, email) {
  return jwt.sign(
    { sub: userId.toString(), email, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRE }
  );
}

function createRefreshToken(userId) {
  return jwt.sign(
    { sub: userId.toString(), type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRE }
  );
}

// Authentication middleware
async function authenticate(req, res, next) {
  let token = req.cookies.access_token;
  
  if (!token) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ detail: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'access') {
      return res.status(401).json({ detail: 'Invalid token type' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }

    req.user = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token expired' });
    }
    return res.status(401).json({ detail: 'Invalid token' });
  }
}

// ==========================================
// ROUTES
// ==========================================

// Health check
app.get('/api/', (req, res) => {
  res.json({ message: 'CA Automation API - Node.js', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get onboarding flows configuration
app.get('/api/onboarding-flows', (req, res) => {
  res.json({
    flows: ONBOARDING_FLOWS,
    bit_mapping: {
      pan_verified: StatusBit.PAN_VERIFIED,
      gst_verified: StatusBit.GST_VERIFIED,
      cin_verified: StatusBit.CIN_VERIFIED,
      consent_given: StatusBit.CONSENT_GIVEN,
      ais_access: StatusBit.AIS_ACCESS,
      itr_fetched: StatusBit.ITR_FETCHED,
      account_created: StatusBit.ACCOUNT_CREATED
    }
  });
});

// ==========================================
// AUTH ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ detail: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ detail: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    const user = new User({
      email: email.toLowerCase(),
      password_hash,
      name,
      phone: phone || null,
      role: null
    });
    await user.save();

    // Create onboarding status
    const onboardingStatus = new OnboardingStatus({
      user_id: user._id,
      status_code: 0
    });
    await onboardingStatus.save();

    const access_token = createAccessToken(user._id, user.email);
    const refresh_token = createRefreshToken(user._id);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at.toISOString(),
      access_token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const access_token = createAccessToken(user._id, user.email);
    const refresh_token = createRefreshToken(user._id);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at.toISOString(),
      access_token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  res.json({ message: 'Logged out successfully' });
});

// Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({
    id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    phone: req.user.phone,
    role: req.user.role,
    created_at: req.user.created_at.toISOString()
  });
});

// Refresh token
app.post('/api/auth/refresh', async (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) {
    return res.status(401).json({ detail: 'No refresh token' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ detail: 'Invalid token type' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }

    const access_token = createAccessToken(user._id, user.email);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    res.json({ message: 'Token refreshed', access_token });
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid refresh token' });
  }
});

// ==========================================
// ONBOARDING ROUTES
// ==========================================

// Select role
app.post('/api/onboarding/select-role', authenticate, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['individual', 'sole_proprietor', 'opc', 'pvt_ltd'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ detail: 'Invalid role' });
    }

    await User.findByIdAndUpdate(req.user._id, { role });

    // Initialize user details if not exists
    const existingDetails = await UserDetails.findOne({ user_id: req.user._id });
    if (!existingDetails) {
      const userDetails = new UserDetails({ user_id: req.user._id });
      await userDetails.save();
    }

    res.json({ message: 'Role selected successfully', role });
  } catch (err) {
    console.error('Select role error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Get onboarding status
app.get('/api/onboarding/status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let onboarding = await OnboardingStatus.findOne({ user_id: req.user._id });

    if (!onboarding) {
      onboarding = new OnboardingStatus({ user_id: req.user._id, status_code: 0 });
      await onboarding.save();
    }

    const statusCode = onboarding.status_code || 0;
    const role = user.role;
    const requiredSteps = role ? (ONBOARDING_FLOWS[role] || []) : [];

    // Calculate completed and pending steps
    const completedSteps = [];
    const pendingSteps = [];

    for (const step of requiredSteps) {
      const bitValue = STEP_TO_BIT[step] || 0;
      if (StatusBit.checkBit(statusCode, bitValue)) {
        completedSteps.push(step);
      } else {
        pendingSteps.push(step);
      }
    }

    const progress = requiredSteps.length > 0
      ? (completedSteps.length / requiredSteps.length) * 100
      : 0;

    const userDetails = await UserDetails.findOne({ user_id: req.user._id })
      .select('-_id -user_id -__v');

    res.json({
      user_id: req.user._id,
      status_code: statusCode,
      status_binary: StatusBit.getBinaryString(statusCode),
      status_breakdown: StatusBit.getStatusBreakdown(statusCode),
      role,
      required_steps: requiredSteps,
      completed_steps: completedSteps,
      pending_steps: pendingSteps,
      progress_percentage: Math.round(progress * 100) / 100,
      user_details: userDetails ? userDetails.toObject() : null
    });
  } catch (err) {
    console.error('Get status error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// PAN Verification
app.post('/api/onboarding/pan-verify', authenticate, async (req, res) => {
  try {
    const { pan } = req.body;

    if (!pan || pan.length !== 10) {
      return res.status(400).json({ detail: 'Invalid PAN format. Must be 10 characters.' });
    }

    const panUpper = pan.toUpperCase();
    const validPrefixes = ['A', 'B', 'C', 'F', 'G', 'H', 'L', 'J', 'P', 'T', 'K'];
    if (!validPrefixes.includes(panUpper[0])) {
      return res.status(400).json({ detail: 'Invalid PAN format' });
    }

    // Generate unique PAN verification key
    const panKey = generateVerificationKey(req.user._id, 'pan', panUpper);

    // Update user details
    await UserDetails.findOneAndUpdate(
      { user_id: req.user._id },
      {
        pan: panUpper,
        pan_key: panKey,
        pan_verified_at: new Date()
      },
      { upsert: true }
    );

    // Update status bitmask: status_code = status_code | PAN_VERIFIED (bit 0 = 1)
    let onboarding = await OnboardingStatus.findOne({ user_id: req.user._id });
    const currentStatus = onboarding ? onboarding.status_code : 0;
    const newStatus = StatusBit.setBit(currentStatus, StatusBit.PAN_VERIFIED);

    await OnboardingStatus.findOneAndUpdate(
      { user_id: req.user._id },
      { status_code: newStatus, updated_at: new Date() },
      { upsert: true }
    );

    console.log(`PAN verified for user ${req.user._id}. Key: ${panKey}. Status: ${currentStatus} | 1 = ${newStatus}`);

    res.json({
      message: 'PAN verified successfully',
      pan: panUpper,
      pan_key: panKey,
      status_code: newStatus,
      bit_value: StatusBit.PAN_VERIFIED,
      status_binary: StatusBit.getBinaryString(newStatus)
    });
  } catch (err) {
    console.error('PAN verify error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// GST Verification
app.post('/api/onboarding/gstin-verify', authenticate, async (req, res) => {
  try {
    const { gstin } = req.body;

    if (!gstin || gstin.length !== 15) {
      return res.status(400).json({ detail: 'Invalid GSTIN format. Must be 15 characters.' });
    }

    const gstinUpper = gstin.toUpperCase();

    // Generate unique GST verification key
    const gstKey = generateVerificationKey(req.user._id, 'gst', gstinUpper);

    // Update user details
    await UserDetails.findOneAndUpdate(
      { user_id: req.user._id },
      {
        gstin: gstinUpper,
        gst_key: gstKey,
        gst_verified_at: new Date()
      },
      { upsert: true }
    );

    // Update status bitmask: status_code = status_code | GST_VERIFIED (bit 1 = 2)
    let onboarding = await OnboardingStatus.findOne({ user_id: req.user._id });
    const currentStatus = onboarding ? onboarding.status_code : 0;
    const newStatus = StatusBit.setBit(currentStatus, StatusBit.GST_VERIFIED);

    await OnboardingStatus.findOneAndUpdate(
      { user_id: req.user._id },
      { status_code: newStatus, updated_at: new Date() },
      { upsert: true }
    );

    console.log(`GSTIN verified for user ${req.user._id}. Key: ${gstKey}. Status: ${currentStatus} | 2 = ${newStatus}`);

    res.json({
      message: 'GSTIN verified successfully',
      gstin: gstinUpper,
      gst_key: gstKey,
      status_code: newStatus,
      bit_value: StatusBit.GST_VERIFIED,
      status_binary: StatusBit.getBinaryString(newStatus)
    });
  } catch (err) {
    console.error('GSTIN verify error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// CIN Verification
app.post('/api/onboarding/cin-verify', authenticate, async (req, res) => {
  try {
    const { cin } = req.body;

    if (!cin || cin.length !== 21) {
      return res.status(400).json({ detail: 'Invalid CIN format. Must be 21 characters.' });
    }

    const cinUpper = cin.toUpperCase();

    // Generate unique CIN verification key
    const cinKey = generateVerificationKey(req.user._id, 'cin', cinUpper);

    // Update user details
    await UserDetails.findOneAndUpdate(
      { user_id: req.user._id },
      {
        cin: cinUpper,
        cin_key: cinKey,
        cin_verified_at: new Date()
      },
      { upsert: true }
    );

    // Update status bitmask: status_code = status_code | CIN_VERIFIED (bit 2 = 4)
    let onboarding = await OnboardingStatus.findOne({ user_id: req.user._id });
    const currentStatus = onboarding ? onboarding.status_code : 0;
    const newStatus = StatusBit.setBit(currentStatus, StatusBit.CIN_VERIFIED);

    await OnboardingStatus.findOneAndUpdate(
      { user_id: req.user._id },
      { status_code: newStatus, updated_at: new Date() },
      { upsert: true }
    );

    console.log(`CIN verified for user ${req.user._id}. Key: ${cinKey}. Status: ${currentStatus} | 4 = ${newStatus}`);

    res.json({
      message: 'CIN verified successfully',
      cin: cinUpper,
      cin_key: cinKey,
      status_code: newStatus,
      bit_value: StatusBit.CIN_VERIFIED,
      status_binary: StatusBit.getBinaryString(newStatus)
    });
  } catch (err) {
    console.error('CIN verify error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Consent
app.post('/api/onboarding/consent', authenticate, async (req, res) => {
  try {
    const { general_consent, ais_consent, itr_consent } = req.body;

    let onboarding = await OnboardingStatus.findOne({ user_id: req.user._id });
    let currentStatus = onboarding ? onboarding.status_code : 0;
    let newStatus = currentStatus;

    // Set consent bit: status_code = status_code | 8 (bit 3)
    if (general_consent) {
      newStatus = StatusBit.setBit(newStatus, StatusBit.CONSENT_GIVEN);
    }

    // Set AIS access bit: status_code = status_code | 16 (bit 4)
    if (ais_consent) {
      newStatus = StatusBit.setBit(newStatus, StatusBit.AIS_ACCESS);
    }

    // Set ITR fetched bit: status_code = status_code | 32 (bit 5)
    if (itr_consent) {
      newStatus = StatusBit.setBit(newStatus, StatusBit.ITR_FETCHED);
    }

    // Auto-create account if all required steps are done: status_code = status_code | 64 (bit 6)
    const user = await User.findById(req.user._id);
    if (user.role) {
      const requiredSteps = ONBOARDING_FLOWS[user.role] || [];
      let allDone = true;
      for (const step of requiredSteps) {
        const bitValue = STEP_TO_BIT[step] || 0;
        if (!StatusBit.checkBit(newStatus, bitValue)) {
          allDone = false;
          break;
        }
      }
      if (allDone) {
        newStatus = StatusBit.setBit(newStatus, StatusBit.ACCOUNT_CREATED);
      }
    }

    // Generate unique consent verification key
    const consentKey = generateVerificationKey(req.user._id, 'consent', String(general_consent));

    // Update user details
    await UserDetails.findOneAndUpdate(
      { user_id: req.user._id },
      {
        consent_key: consentKey,
        consent_given_at: new Date(),
        ais_consent,
        itr_consent
      },
      { upsert: true }
    );

    await OnboardingStatus.findOneAndUpdate(
      { user_id: req.user._id },
      { status_code: newStatus, updated_at: new Date() },
      { upsert: true }
    );

    console.log(`Consent submitted for user ${req.user._id}. Key: ${consentKey}. Status: ${currentStatus} -> ${newStatus}`);

    res.json({
      message: 'Consent submitted successfully',
      consent_key: consentKey,
      status_code: newStatus,
      bit_values: {
        consent: general_consent ? StatusBit.CONSENT_GIVEN : 0,
        ais: ais_consent ? StatusBit.AIS_ACCESS : 0,
        itr: itr_consent ? StatusBit.ITR_FETCHED : 0,
        account: StatusBit.checkBit(newStatus, StatusBit.ACCOUNT_CREATED) ? StatusBit.ACCOUNT_CREATED : 0
      },
      status_binary: StatusBit.getBinaryString(newStatus),
      account_created: StatusBit.checkBit(newStatus, StatusBit.ACCOUNT_CREATED)
    });
  } catch (err) {
    console.error('Consent error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Get all verification keys for current user
app.get('/api/onboarding/verification-keys', authenticate, async (req, res) => {
  try {
    const userDetails = await UserDetails.findOne({ user_id: req.user._id });

    if (!userDetails) {
      return res.json({ verification_keys: {} });
    }

    const keys = {};
    if (userDetails.pan_key) keys.pan_key = userDetails.pan_key;
    if (userDetails.gst_key) keys.gst_key = userDetails.gst_key;
    if (userDetails.cin_key) keys.cin_key = userDetails.cin_key;
    if (userDetails.consent_key) keys.consent_key = userDetails.consent_key;

    res.json({
      user_id: req.user._id,
      verification_keys: keys,
      details: {
        pan: userDetails.pan,
        gstin: userDetails.gstin,
        cin: userDetails.cin
      }
    });
  } catch (err) {
    console.error('Get verification keys error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Verify a key
app.get('/api/verify-key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const keyType = key.split('_')[0];

    if (!['pan', 'gst', 'cin', 'consent'].includes(keyType)) {
      return res.status(400).json({ detail: 'Invalid key format' });
    }

    const keyField = `${keyType}_key`;
    const query = {};
    query[keyField] = key;

    const userDetails = await UserDetails.findOne(query);

    if (!userDetails) {
      return res.status(404).json({ detail: 'Verification key not found' });
    }

    const onboarding = await OnboardingStatus.findOne({ user_id: userDetails.user_id });

    let verifiedValue = null;
    if (keyType === 'pan') verifiedValue = userDetails.pan;
    else if (keyType === 'gst') verifiedValue = userDetails.gstin;
    else if (keyType === 'cin') verifiedValue = userDetails.cin;
    else if (keyType === 'consent') verifiedValue = 'Consent Given';

    res.json({
      valid: true,
      key_type: keyType,
      user_id: userDetails.user_id.toString(),
      status_code: onboarding ? onboarding.status_code : 0,
      verified_value: verifiedValue,
      verified_at: userDetails[`${keyType}_verified_at`] || userDetails.consent_given_at
    });
  } catch (err) {
    console.error('Verify key error:', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ==========================================
// DATABASE CONNECTION & SERVER START
// ==========================================
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/ca_automation';

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log('CA Automation Backend - Node.js/Express');
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
