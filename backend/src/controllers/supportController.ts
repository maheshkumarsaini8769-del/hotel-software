import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuditLog } from '../models/AuditLog';
import { ImpersonationGrant } from '../models/ImpersonationGrant';
import { SupportTicket } from '../models/SupportTicket';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { TenantRequest, UserRole } from '../types';
import { getJwtSecret } from '../config/security';

const ticketInputSchema = z.object({
  subject: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(4000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});

const ticketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
});

export const createSupportTicket = async (req: TenantRequest, res: Response): Promise<void> => {
  const parsed = ticketInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Enter a subject (4–160 characters) and description (10–4000 characters).',
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  if (!req.hotelId || !req.user?.userId || !Types.ObjectId.isValid(req.user.userId)) {
    res.status(403).json({ success: false, message: 'A valid hotel admin session is required.' });
    return;
  }

  try {
    const ticket = await SupportTicket.create({
      ...parsed.data,
      tenantId: req.hotelId,
      submittedBy: new Types.ObjectId(req.user.userId),
    });
    res.status(201).json({ success: true, data: { ticket } });
  } catch (error) {
    console.error('[Support] Ticket creation failed:', error);
    res.status(500).json({ success: false, message: 'The support request could not be saved.' });
  }
};

export const listSupportTickets = async (_req: TenantRequest, res: Response): Promise<void> => {
  try {
    const tickets = await SupportTicket.find()
      .sort({ createdAt: -1 })
      .limit(250)
      .populate('tenantId', 'name slug')
      .populate('submittedBy', 'name email')
      .lean();
    res.status(200).json({ success: true, data: { tickets } });
  } catch (error) {
    console.error('[Support] Ticket list failed:', error);
    res.status(500).json({ success: false, message: 'Support tickets could not be loaded.' });
  }
};

export const updateSupportTicketStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  const parsed = ticketStatusSchema.safeParse(req.body);
  const ticketId = typeof req.params.ticketId === 'string' ? req.params.ticketId : '';
  if (!parsed.success || !Types.ObjectId.isValid(ticketId)) {
    res.status(400).json({ success: false, message: 'A valid ticket ID and status are required.' });
    return;
  }

  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { $set: { status: parsed.data.status } },
      { new: true, runValidators: true }
    )
      .populate('tenantId', 'name slug')
      .populate('submittedBy', 'name email');
    if (!ticket) {
      res.status(404).json({ success: false, message: 'Support ticket not found.' });
      return;
    }
    res.status(200).json({ success: true, data: { ticket } });
  } catch (error) {
    console.error('[Support] Ticket status update failed:', error);
    res.status(500).json({ success: false, message: 'The ticket status could not be updated.' });
  }
};

export const createTenantImpersonationGrant = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  const tenantId = typeof req.params.tenantId === 'string' ? req.params.tenantId : '';
  if (!Types.ObjectId.isValid(tenantId) || !req.user?.userId || !Types.ObjectId.isValid(req.user.userId)) {
    res.status(400).json({ success: false, message: 'A valid tenant and Super Admin session are required.' });
    return;
  }

  try {
    const tenant = await Tenant.findById(tenantId).select('name status').lean();
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Hotel tenant not found.' });
      return;
    }
    if (tenant.status === 'SUSPENDED') {
      res.status(403).json({ success: false, message: 'A suspended tenant cannot be impersonated.' });
      return;
    }

    const admin = await User.findOne({
      hotelId: new Types.ObjectId(tenantId),
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .select('_id');
    if (!admin) {
      res.status(404).json({ success: false, message: 'No active Hotel Admin account was found.' });
      return;
    }

    const handoffCode = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await ImpersonationGrant.create({
      tokenHash: crypto.createHash('sha256').update(handoffCode).digest('hex'),
      tenantId: tenant._id,
      adminUserId: admin._id,
      createdBy: new Types.ObjectId(req.user.userId),
      expiresAt,
    });
    await AuditLog.create({
      hotelId: tenant._id,
      userId: new Types.ObjectId(req.user.userId),
      userEmail: req.user.email,
      userName: req.user.name || 'Super Admin',
      action: 'TENANT_IMPERSONATION_REQUESTED',
      entity: 'User',
      entityId: admin._id.toString(),
      details: `A short-lived admin handoff was created for ${tenant.name}.`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: { handoffCode, tenantName: tenant.name, expiresAt },
    });
  } catch (error) {
    console.error('[Impersonation] Grant creation failed:', error);
    res.status(500).json({ success: false, message: 'Could not create a temporary admin session.' });
  }
};

export const exchangeTenantImpersonationGrant = async (
  req: TenantRequest,
  res: Response
): Promise<void> => {
  const code = typeof req.body?.handoffCode === 'string' ? req.body.handoffCode : '';
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(code)) {
    res.status(400).json({ success: false, message: 'The temporary sign-in link is invalid or expired.' });
    return;
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(code).digest('hex');
    const grant = await ImpersonationGrant.findOneAndDelete({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });
    if (!grant) {
      res.status(401).json({ success: false, message: 'The temporary sign-in link is invalid or expired.' });
      return;
    }

    const [tenant, admin] = await Promise.all([
      Tenant.findById(grant.tenantId).select('name status slug'),
      User.findOne({
        _id: grant.adminUserId,
        hotelId: grant.tenantId,
        role: UserRole.HOTEL_ADMIN,
        isActive: true,
      }).select('_id name email role hotelId permissions'),
    ]);
    if (!tenant || tenant.status === 'SUSPENDED' || !admin) {
      res.status(403).json({ success: false, message: 'This hotel admin account is no longer available.' });
      return;
    }

    const token = jwt.sign(
      {
        userId: admin._id.toString(),
        hotelId: grant.tenantId.toString(),
        role: UserRole.HOTEL_ADMIN,
        email: admin.email,
        permissions: admin.permissions || [],
        impersonatedBy: grant.createdBy.toString(),
        impersonationGrantId: grant._id.toString(),
      },
      getJwtSecret(),
      { expiresIn: '5m' }
    );
    res.status(200).json({
      success: true,
      data: {
        token,
        tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug },
        user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, hotelId: admin.hotelId },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('[Impersonation] Grant exchange failed:', error);
    res.status(500).json({ success: false, message: 'The temporary admin session could not be started.' });
  }
};
