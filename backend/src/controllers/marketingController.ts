import { Response } from 'express';
import { Types } from 'mongoose';
import { MarketingCampaign, CampaignStatus, CampaignChannel } from '../models/MarketingCampaign';
import { GuestProfile } from '../models/GuestProfile';
import { TenantRequest } from '../types';
import { io } from '../index';

// 1. Create Marketing Campaign
export const createCampaign = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      campaignName,
      channel = CampaignChannel.SMS,
      targetVipTier = 'ALL',
      minimumSpendFilter = 0,
      messageTemplate,
    } = req.body;

    if (!campaignName || !messageTemplate) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Campaign name and message template required' });
      return;
    }

    const campaign = new MarketingCampaign({
      hotelId,
      campaignName: campaignName.trim(),
      channel,
      targetVipTier,
      minimumSpendFilter: Number(minimumSpendFilter),
      messageTemplate,
      status: CampaignStatus.DRAFT,
      dispatchedByUserId: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
    });

    await campaign.save();
    res.status(201).json({ success: true, campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Dispatch Campaign to Targeted Audience
export const dispatchCampaign = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const campaignId = String(req.params.campaignId);

    const campaign = await MarketingCampaign.findOne({ _id: new Types.ObjectId(campaignId), hotelId });
    if (!campaign) {
      res.status(404).json({ success: false, errorCode: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found' });
      return;
    }

    // Build audience filter
    const audienceFilter: any = { hotelId };
    if (campaign.targetVipTier && campaign.targetVipTier !== 'ALL') {
      audienceFilter.vipTier = campaign.targetVipTier;
    }
    if (campaign.minimumSpendFilter && campaign.minimumSpendFilter > 0) {
      audienceFilter.totalLifetimeSpend = { $gte: campaign.minimumSpendFilter };
    }

    const targetAudience = await GuestProfile.find(audienceFilter);

    // Simulate personalization & message dispatch
    const sampleDispatches: any[] = [];
    for (const guest of targetAudience.slice(0, 5)) {
      const personalizedMessage = campaign.messageTemplate
        .replace(/{{guestName}}/g, guest.name)
        .replace(/{{points}}/g, String(guest.loyaltyPointsBalance))
        .replace(/{{vipTier}}/g, guest.vipTier);

      sampleDispatches.push({
        guestPhone: guest.phone,
        message: personalizedMessage,
      });
    }

    campaign.status = CampaignStatus.SENT;
    campaign.recipientCount = targetAudience.length;
    campaign.deliveredCount = targetAudience.length;
    campaign.sentAt = new Date();
    await campaign.save();

    io.to(`${hotelId?.toString()}_global`).emit('marketing:campaign_dispatched', {
      campaignId: campaign._id,
      campaignName: campaign.campaignName,
      recipientCount: campaign.recipientCount,
    });

    res.status(200).json({
      success: true,
      campaign,
      recipientCount: targetAudience.length,
      sampleDispatches,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Get Campaigns
export const getCampaigns = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const campaigns = await MarketingCampaign.find({ hotelId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: campaigns.length, campaigns });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
