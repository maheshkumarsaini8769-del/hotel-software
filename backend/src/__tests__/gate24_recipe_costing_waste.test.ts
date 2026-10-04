import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { MenuItem } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { Recipe } from '../models/Recipe';
import { FoodWasteLog, WasteType, KitchenShift, WasteDisposalMethod } from '../models/FoodWasteLog';
import { UserRole } from '../types';

describe('--- SHIFT 24 / GATE 24: KITCHEN RECIPE COSTING, FOOD WASTE TRACKER & PORTION CONTROL ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let chefToken: string;
  let rivalToken: string;
  let biryaniItemId: string;
  let kitchenStationId: string;
  let recipeId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });
    }

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'Grand Oberoi Palace & Kitchens',
      slug: `oberoi-kitchen-${Date.now()}`,
      contactEmail: `oberoi_${Date.now()}@spicehub.com`,
      contactPhone: '9833300001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Fast Dine',
      slug: `rival-dine-${Date.now()}`,
      contactEmail: `rival_${Date.now()}@spicehub.com`,
      contactPhone: '9833300002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Executive Chef User for Tenant A
    const chef = await User.create({
      hotelId: tenantA._id,
      name: 'Executive Chef Sanjeev Kapoor',
      email: `chef_${Date.now()}@oberoi.com`,
      phone: '9833300003',
      passwordHash: 'dummy_hash',
      role: UserRole.CHEF,
      isActive: true,
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';
    chefToken = jwt.sign(
      {
        userId: chef._id.toString(),
        hotelId: tenantAId,
        role: UserRole.CHEF,
        email: chef.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 4. Create Rival Chef User for Tenant B
    const rivalChef = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Head Chef',
      email: `rival_chef_${Date.now()}@rival.com`,
      phone: '9833300004',
      passwordHash: 'dummy_hash',
      role: UserRole.CHEF,
      isActive: true,
    });

    rivalToken = jwt.sign(
      {
        userId: rivalChef._id.toString(),
        hotelId: tenantBId,
        role: UserRole.CHEF,
        email: rivalChef.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 5. Setup Kitchen Station
    const station = await KitchenStation.create({
      hotelId: tenantA._id,
      stationName: `Tandoor & Biryani Station ${Date.now()}`,
      screenToken: `station_screen_tok_${Date.now()}`,
      assignedChefIds: [chef._id],
      isOnline: true,
    });
    kitchenStationId = station._id.toString();

    // 6. Setup Menu Item
    const biryaniItem = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Dum Awadhi Gosht Biryani',
      basePrice: 300,
      itemCode: '501',
      isAvailable: true,
    });
    biryaniItemId = biryaniItem._id.toString();
  });

  afterAll(async () => {
    await Recipe.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await FoodWasteLog.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MenuItem.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await KitchenStation.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. Create Standard Recipe Specification BOM & verify live food cost percentage calculation', async () => {
    // Ingredients:
    // Basmati Rice: 0.25 kg @ 90/kg = 22.50
    // Fresh Chicken: 0.3 kg @ 180/kg = 54.00
    // Pure Ghee & Spices: 0.05 kg @ 300/kg = 15.00
    // Total batch cost = 91.50
    // Yield: 1 portion => Cost per portion = 91.50
    // Selling price = 300 => Food Cost % = (91.5 / 300) * 100 = 30.5%
    // Gross Margin % = 69.5%
    const res = await request(app)
      .post('/api/v1/recipe-costing/recipes')
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        menuItemId: biryaniItemId,
        title: 'Authentic Awadhi Biryani Recipe',
        recipeCode: 'RCP-501',
        yieldPortions: 1,
        portionSizeDescription: '350g biryani with 2 pcs meat + 100g burani raita',
        ingredients: [
          { ingredientName: 'Aged Basmati Rice', quantity: 0.25, unit: 'kg', unitCost: 90 },
          { ingredientName: 'Fresh Chicken Curry Cut', quantity: 0.3, unit: 'kg', unitCost: 180 },
          { ingredientName: 'Desi Ghee & Royal Spices', quantity: 0.05, unit: 'kg', unitCost: 300 },
        ],
        preparationSteps: [
          'Soak rice for 30 minutes',
          'Marinate chicken with curd and spices',
          'Layer parboiled rice over chicken and seal pot with dough',
          'Dum cook on slow flame for 25 minutes',
        ],
        sellingPrice: 300,
        targetCostPercentage: 32,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recipe).toBeDefined();
    expect(res.body.recipe.totalBatchCost).toBe(91.5);
    expect(res.body.recipe.costPerPortion).toBe(91.5);
    expect(res.body.recipe.foodCostPercentage).toBe(30.5);
    expect(res.body.recipe.grossMarginPercentage).toBe(69.5);

    recipeId = res.body.recipe._id;
  });

  // TEST 2
  it('2. Get All Recipes: Fetch catalog with calculated average food cost % and health alerts', async () => {
    const res = await request(app)
      .get('/api/v1/recipe-costing/recipes')
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recipes.length).toBe(1);
    expect(res.body.metrics.totalRecipesCount).toBe(1);
    expect(res.body.metrics.highCostRecipesCount).toBe(0);
    expect(res.body.metrics.averageFoodCostPercentage).toBe(30.5);
  });

  // TEST 3
  it('3. Get Recipe by MenuItem: Lookup recipe specification for a dish', async () => {
    const res = await request(app)
      .get(`/api/v1/recipe-costing/recipes/menu-item/${biryaniItemId}`)
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recipe.recipeCode).toBe('RCP-501');
    expect(res.body.recipe.ingredients.length).toBe(3);
    expect(res.body.recipe.preparationSteps.length).toBe(4);
  });

  // TEST 4
  it('4. High Cost Alert Detection: Flag recipes exceeding target cost percentage', async () => {
    // Add extra luxury saffron ingredient to raise food cost to 42%
    const res = await request(app)
      .post('/api/v1/recipe-costing/recipes')
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        menuItemId: biryaniItemId,
        title: 'Authentic Awadhi Biryani Recipe',
        recipeCode: 'RCP-501',
        yieldPortions: 1,
        ingredients: [
          { ingredientName: 'Aged Basmati Rice', quantity: 0.25, unit: 'kg', unitCost: 90 }, // 22.50
          { ingredientName: 'Fresh Chicken Curry Cut', quantity: 0.3, unit: 'kg', unitCost: 180 }, // 54.00
          { ingredientName: 'Desi Ghee & Royal Spices', quantity: 0.05, unit: 'kg', unitCost: 300 }, // 15.00
          { ingredientName: 'Pure Kashmiri Saffron', quantity: 0.01, unit: 'kg', unitCost: 3450 }, // 34.50
        ], // Total = 126 => (126 / 300) * 100 = 42.0%
        sellingPrice: 300,
        targetCostPercentage: 32,
      });

    expect(res.status).toBe(200);
    expect(res.body.recipe.foodCostPercentage).toBe(42);

    // Verify metrics reflect high cost alert
    const metricsRes = await request(app)
      .get('/api/v1/recipe-costing/recipes')
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId);

    expect(metricsRes.body.metrics.highCostRecipesCount).toBe(1);
    expect(metricsRes.body.metrics.averageFoodCostPercentage).toBe(42);
  });

  // TEST 5
  it('5. Log Kitchen Spoilage / Food Waste Entry with automatic monetary loss calculation', async () => {
    // 3 kg Burnt Biryani @ ₹90/kg = ₹270 loss
    const res = await request(app)
      .post('/api/v1/recipe-costing/waste')
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        wasteType: WasteType.BURNT_OVERCOOKED,
        kitchenStationId,
        menuItemId: biryaniItemId,
        itemName: 'Burnt Dum Handi Rice',
        quantity: 3,
        unit: 'kg',
        unitCost: 90,
        shift: KitchenShift.DINNER,
        reason: 'Flame left on high during evening banquet rush',
        preventiveAction: 'Use heavy copper bottom handi and timer',
        disposalMethod: WasteDisposalMethod.TRASH,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.wasteLog).toBeDefined();
    expect(res.body.wasteLog.totalLossAmount).toBe(270);
    expect(res.body.wasteLog.wasteType).toBe(WasteType.BURNT_OVERCOOKED);
    expect(res.body.wasteLog.wasteNumber).toMatch(/^WST-/);
  });

  // TEST 6
  it('6. Log Second Food Waste Entry (Expired Dressing)', async () => {
    // 2 Liters expired dressing @ ₹150/L = ₹300 loss
    const res = await request(app)
      .post('/api/v1/recipe-costing/waste')
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        wasteType: WasteType.EXPIRED,
        itemName: 'Hollandaise Cream Dressing',
        quantity: 2,
        unit: 'l',
        unitCost: 150,
        shift: KitchenShift.LUNCH,
        reason: 'Crossed 48 hour cold room holding limit',
        disposalMethod: WasteDisposalMethod.COMPOST,
      });

    expect(res.status).toBe(201);
    expect(res.body.wasteLog.totalLossAmount).toBe(300);
    expect(res.body.wasteLog.wasteType).toBe(WasteType.EXPIRED);
  });

  // TEST 7
  it('7. Comprehensive Waste Audit Report: Aggregate losses by category and shift', async () => {
    const res = await request(app)
      .get('/api/v1/recipe-costing/waste/audit?days=30')
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.totalEntriesCount).toBe(2);
    expect(res.body.summary.totalLossAmount).toBe(570); // 270 + 300
    expect(res.body.summary.wasteBreakdownByType[WasteType.BURNT_OVERCOOKED]).toBe(270);
    expect(res.body.summary.wasteBreakdownByType[WasteType.EXPIRED]).toBe(300);
    expect(res.body.summary.lossByShift[KitchenShift.DINNER]).toBe(270);
    expect(res.body.summary.lossByShift[KitchenShift.LUNCH]).toBe(300);
  });

  // TEST 8
  it('8. Strict Multi-Tenant Isolation: Competitor cannot view recipes or waste audit logs', async () => {
    // Rival tries to read Tenant A's recipe
    const recipeRes = await request(app)
      .get(`/api/v1/recipe-costing/recipes/menu-item/${biryaniItemId}`)
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(recipeRes.status).toBe(404);
    expect(recipeRes.body.success).toBe(false);
    expect(recipeRes.body.errorCode).toBe('RECIPE_NOT_FOUND');

    // Rival tries to audit Tenant A's waste logs
    const wasteRes = await request(app)
      .get('/api/v1/recipe-costing/waste/audit')
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(wasteRes.status).toBe(200);
    expect(wasteRes.body.summary.totalEntriesCount).toBe(0);
    expect(wasteRes.body.summary.totalLossAmount).toBe(0);
  });
});
