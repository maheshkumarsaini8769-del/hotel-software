import { Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { UserPreference } from '../models/UserPreference';
import { TenantRequest } from '../types';

const preferenceUpdateSchema = z.object({
  general: z.object({
    language: z.enum(['en', 'hi']).optional(),
    timezone: z.string().trim().min(1).max(100).optional(),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY']).optional(),
  }).strict().optional(),
  appearance: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    fontSize: z.enum(['small', 'medium', 'large']).optional(),
    sidebarCollapsed: z.boolean().optional(),
  }).strict().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    sms: z.boolean().optional(),
    soundAlerts: z.boolean().optional(),
    desktopPush: z.boolean().optional(),
  }).strict().optional(),
  print: z.object({
    thermalPrinterWidth: z.enum(['58mm', '80mm']).optional(),
    printHeaderWithLogo: z.boolean().optional(),
    printKotSeparately: z.boolean().optional(),
    autoPrintAfterOrder: z.boolean().optional(),
    footerText: z.string().trim().max(250).optional(),
  }).strict().optional(),
  workstation: z.object({
    shiftStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    shiftEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    showTaxBreakdown: z.boolean().optional(),
    checkInFlow: z.enum(['guided', 'quick']).optional(),
    soundVolume: z.number().int().min(0).max(100).optional(),
    displayDensity: z.enum(['comfortable', 'compact']).optional(),
    stationName: z.string().trim().max(80).optional(),
  }).strict().optional(),
}).strict();

function flattenPreferences(
  preferences: z.infer<typeof preferenceUpdateSchema>
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [section, values] of Object.entries(preferences)) {
    if (!values) continue;
    for (const [key, value] of Object.entries(values)) {
      fields[`${section}.${key}`] = value;
    }
  }
  return fields;
}

export const getUserPreferences = async (req: TenantRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'A valid user session is required.' });
    return;
  }

  try {
    const preference = await UserPreference.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $setOnInsert: { hotelId: req.hotelId } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    res.status(200).json({ success: true, data: preference });
  } catch {
    res.status(500).json({
      success: false,
      errorCode: 'PREFERENCES_UNAVAILABLE',
      message: 'Preferences could not be loaded. Please retry.',
    });
  }
};

export const updateUserPreferences = async (req: TenantRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'A valid user session is required.' });
    return;
  }

  const parsed = preferenceUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      errorCode: 'INVALID_PREFERENCES',
      message: 'One or more preference values are invalid.',
      details: parsed.error.flatten(),
    });
    return;
  }

  const fields = flattenPreferences(parsed.data);
  if (Object.keys(fields).length === 0) {
    res.status(400).json({
      success: false,
      errorCode: 'EMPTY_PREFERENCES',
      message: 'Provide at least one preference to update.',
    });
    return;
  }

  try {
    const preference = await UserPreference.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        $set: { ...fields, hotelId: req.hotelId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    res.status(200).json({ success: true, data: preference });
  } catch {
    res.status(500).json({
      success: false,
      errorCode: 'PREFERENCES_SAVE_FAILED',
      message: 'Preferences could not be saved. Please retry.',
    });
  }
};
