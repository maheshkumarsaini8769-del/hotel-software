import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, FoodType } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { io } from '../index';
import { invalidateMenuCache } from './posController';

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  itemCount: number;
  isActive: boolean;
  kitchenStationId?: string;
  kitchenStationName?: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface MenuItemDTO {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  kitchenStationId?: string;
  kitchenStationName?: string;
  foodType: string;
  price: number;
  basePrice: number;
  isAvailable: boolean;
  description?: string;
  prepTimeMinutes: number;
  images: string[];
  createdAt?: string;
}

const DEFAULT_CATEGORIES: CategoryDTO[] = [
  { id: 'cat-starters', name: 'Starters', slug: 'starters', displayOrder: 1, itemCount: 4, isActive: true },
  { id: 'cat-mains', name: 'Main Course', slug: 'main-course', displayOrder: 2, itemCount: 5, isActive: true },
  { id: 'cat-breads', name: 'Breads & Rice', slug: 'breads-rice', displayOrder: 3, itemCount: 2, isActive: true },
  { id: 'cat-chinese', name: 'Chinese', slug: 'chinese', displayOrder: 4, itemCount: 2, isActive: true },
  { id: 'cat-south-indian', name: 'South Indian', slug: 'south-indian', displayOrder: 5, itemCount: 1, isActive: true },
  { id: 'cat-beverages', name: 'Beverages', slug: 'beverages', displayOrder: 6, itemCount: 2, isActive: true },
  { id: 'cat-desserts', name: 'Desserts', slug: 'desserts', displayOrder: 7, itemCount: 1, isActive: true },
];

const DEFAULT_ITEMS: MenuItemDTO[] = [
  {
    id: 'm1',
    name: 'Paneer Butter Masala',
    categoryId: 'cat-mains',
    category: 'Main Course',
    foodType: 'VEG',
    price: 280,
    basePrice: 280,
    isAvailable: true,
    description: 'Fresh cottage cheese simmered in rich creamy tomato butter gravy with aromatic spices.',
    prepTimeMinutes: 15,
    images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm2',
    name: 'Hyderabadi Chicken Biryani',
    categoryId: 'cat-mains',
    category: 'Main Course',
    foodType: 'NON_VEG',
    price: 320,
    basePrice: 320,
    isAvailable: true,
    description: 'Dum-cooked long-grain basmati rice with succulent chicken marinated in saffron & herbs.',
    prepTimeMinutes: 20,
    images: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm3',
    name: 'Tandoori Paneer Tikka',
    categoryId: 'cat-starters',
    category: 'Starters',
    foodType: 'VEG',
    price: 260,
    basePrice: 260,
    isAvailable: true,
    description: 'Charcoal-grilled paneer cubes marinated in hung curd, mustard oil and Kashmiri degi mirch.',
    prepTimeMinutes: 12,
    images: ['https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm4',
    name: 'Smoky Chicken Tikka',
    categoryId: 'cat-starters',
    category: 'Starters',
    foodType: 'NON_VEG',
    price: 320,
    basePrice: 320,
    isAvailable: true,
    description: 'Tender boneless chicken morsels barbecued on skewers in clay oven with mint chutney.',
    prepTimeMinutes: 14,
    images: ['https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm5',
    name: 'Dal Makhani Heritage',
    categoryId: 'cat-mains',
    category: 'Main Course',
    foodType: 'VEG',
    price: 220,
    basePrice: 220,
    isAvailable: true,
    description: 'Slow-cooked black lentils overnight on tandoor with white butter and fresh cream.',
    prepTimeMinutes: 10,
    images: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm6',
    name: 'Crispy Veg Spring Rolls',
    categoryId: 'cat-chinese',
    category: 'Chinese',
    foodType: 'VEG',
    price: 220,
    basePrice: 220,
    isAvailable: true,
    description: 'Golden fried stuffed rolls loaded with crunchy vegetables served with hot sweet chilli dip.',
    prepTimeMinutes: 12,
    images: ['https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm7',
    name: 'Chilli Chicken Dry',
    categoryId: 'cat-chinese',
    category: 'Chinese',
    foodType: 'NON_VEG',
    price: 310,
    basePrice: 310,
    isAvailable: true,
    description: 'Wok-tossed battered chicken pieces with bell peppers, green chilies, and dark soy glaze.',
    prepTimeMinutes: 15,
    images: ['https://images.unsplash.com/photo-1525755662778-989d0524087e?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm8',
    name: 'Mysore Masala Dosa',
    categoryId: 'cat-south-indian',
    category: 'South Indian',
    foodType: 'VEG',
    price: 160,
    basePrice: 160,
    isAvailable: true,
    description: 'Crispy crepe smeared with fiery red garlic chutney stuffed with spiced potato masala.',
    prepTimeMinutes: 10,
    images: ['https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm9',
    name: 'Garlic Butter Naan (2 Pcs)',
    categoryId: 'cat-breads',
    category: 'Breads & Rice',
    foodType: 'VEG',
    price: 110,
    basePrice: 110,
    isAvailable: true,
    description: 'Tandoor baked leavened bread brushed with garlic-infused butter and coriander.',
    prepTimeMinutes: 6,
    images: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm10',
    name: 'Jeera Rice Bowl',
    categoryId: 'cat-breads',
    category: 'Breads & Rice',
    foodType: 'VEG',
    price: 150,
    basePrice: 150,
    isAvailable: true,
    description: 'Aromatic basmati rice tempered with golden roasted cumin seeds and fresh desi ghee.',
    prepTimeMinutes: 8,
    images: ['https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm11',
    name: 'Chilled Cold Coffee',
    categoryId: 'cat-beverages',
    category: 'Beverages',
    foodType: 'VEG',
    price: 120,
    basePrice: 120,
    isAvailable: true,
    description: 'Creamy blended espresso coffee with vanilla ice cream and dark cocoa drizzle.',
    prepTimeMinutes: 5,
    images: ['https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm12',
    name: 'Kesar Mango Lassi',
    categoryId: 'cat-beverages',
    category: 'Beverages',
    foodType: 'VEG',
    price: 110,
    basePrice: 110,
    isAvailable: true,
    description: 'Rich thick yogurt shake infused with pure Alphonso mango pulp and Kashmiri saffron.',
    prepTimeMinutes: 5,
    images: ['https://images.unsplash.com/photo-1571006682858-a09e0eaa0f6c?w=500&auto=format&fit=crop&q=80'],
  },
  {
    id: 'm13',
    name: 'Hot Gulab Jamun with Ice Cream',
    categoryId: 'cat-desserts',
    category: 'Desserts',
    foodType: 'VEG',
    price: 140,
    basePrice: 140,
    isAvailable: true,
    description: 'Two warm melt-in-mouth khoya dumplings served with cold premium vanilla bean gelato.',
    prepTimeMinutes: 5,
    images: ['https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&auto=format&fit=crop&q=80'],
  },
];

function getValidHotelObjectId(req: Request): Types.ObjectId | null {
  const raw = (req as any).hotelId || req.query.hotelId || req.headers['x-hotel-id'] || req.body?.hotelId;
  if (raw && Types.ObjectId.isValid(String(raw))) {
    return new Types.ObjectId(String(raw));
  }
  return null;
}

// 1. GET /api/v1/menu-catalog/categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const hotelId = getValidHotelObjectId(req);
    let dbCategories: CategoryDTO[] = [];

    if (hotelId) {
      try {
        const cats = await MenuCategory.find({ hotelId }).sort({ displayOrder: 1, name: 1 });
        if (cats && cats.length > 0) {
          const itemCounts = await MenuItem.aggregate([
            { $match: { hotelId } },
            { $group: { _id: '$categoryId', count: { $sum: 1 } } }
          ]);
          const countMap = new Map<string, number>();
          itemCounts.forEach(c => countMap.set(c._id.toString(), c.count));

          dbCategories = cats.map(c => ({
            id: c._id.toString(),
            name: c.name,
            slug: c.slug,
            displayOrder: c.displayOrder || 0,
            itemCount: countMap.get(c._id.toString()) || 0,
            isActive: c.isActive,
            kitchenStationId: c.kitchenStationId?.toString(),
            imageUrl: c.imageUrl,
            createdAt: c.createdAt ? c.createdAt.toISOString() : undefined,
          }));
        } else if (hotelId) {
          const toInsert = DEFAULT_CATEGORIES.map((dc) => ({
            hotelId,
            name: dc.name,
            slug: `${dc.slug}-${hotelId.toString().slice(-4)}`,
            displayOrder: dc.displayOrder,
            isActive: true,
            imageUrl: dc.imageUrl || '',
          }));
          const inserted = await MenuCategory.insertMany(toInsert);
          dbCategories = inserted.map((c: any) => ({
            id: c._id.toString(),
            name: c.name,
            slug: c.slug,
            displayOrder: c.displayOrder || 0,
            itemCount: 0,
            isActive: c.isActive,
            imageUrl: c.imageUrl,
            createdAt: c.createdAt ? c.createdAt.toISOString() : undefined,
          }));
        }
      } catch (err) {
        console.warn('DB categories fetch error, using in-memory store:', err);
      }
    }

    const finalCats = (hotelId && dbCategories.length > 0) ? dbCategories : DEFAULT_CATEGORIES;

    res.status(200).json({
      success: true,
      data: finalCats,
      count: finalCats.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. POST /api/v1/menu-catalog/categories
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, displayOrder, kitchenStationId, imageUrl } = req.body;
    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, message: 'Category name is required' });
      return;
    }

    const hotelId = getValidHotelObjectId(req);
    if (!hotelId) {
      res.status(400).json({ success: false, message: 'Hotel context is required' });
      return;
    }

    const trimmedName = String(name).trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const categoryCount = await MenuCategory.countDocuments({ hotelId });

    const newCat = await MenuCategory.create({
      hotelId,
      name: trimmedName,
      slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
      displayOrder: Number(displayOrder) || categoryCount + 1,
      kitchenStationId: kitchenStationId && Types.ObjectId.isValid(String(kitchenStationId))
        ? new Types.ObjectId(String(kitchenStationId))
        : undefined,
      isActive: true,
      imageUrl: imageUrl || '',
    });

    const newCategoryDTO: CategoryDTO = {
      id: newCat._id.toString(),
      name: newCat.name,
      slug: newCat.slug,
      displayOrder: newCat.displayOrder || 0,
      itemCount: 0,
      isActive: newCat.isActive,
      kitchenStationId: newCat.kitchenStationId?.toString(),
      imageUrl: newCat.imageUrl,
      createdAt: newCat.createdAt ? newCat.createdAt.toISOString() : new Date().toISOString(),
    };

    try {
      invalidateMenuCache();
      if (io) {
        io.emit('menu:category_created', newCategoryDTO);
        io.emit('menu:catalog_updated', { type: 'CATEGORY_CREATED', category: newCategoryDTO });
      }
    } catch (_) {}

    res.status(201).json({
      success: true,
      data: newCategoryDTO,
      message: `Category "${trimmedName}" created successfully!`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. PATCH /api/v1/menu-catalog/categories/:id
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, displayOrder, isActive, kitchenStationId, imageUrl } = req.body;
    const hotelId = getValidHotelObjectId(req);

    if (!hotelId || !Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const cat = await MenuCategory.findOne({ _id: new Types.ObjectId(id), hotelId });
    if (!cat) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    if (name) cat.name = String(name).trim();
    if (displayOrder !== undefined) cat.displayOrder = Number(displayOrder);
    if (isActive !== undefined) cat.isActive = Boolean(isActive);
    if (imageUrl !== undefined) cat.imageUrl = String(imageUrl);
    if (kitchenStationId && Types.ObjectId.isValid(String(kitchenStationId))) {
      cat.kitchenStationId = new Types.ObjectId(String(kitchenStationId));
    }
    await cat.save();

    const updatedCat: CategoryDTO = {
      id: cat._id.toString(),
      name: cat.name,
      slug: cat.slug,
      displayOrder: cat.displayOrder,
      itemCount: await MenuItem.countDocuments({ hotelId, categoryId: cat._id }),
      isActive: cat.isActive,
      kitchenStationId: cat.kitchenStationId?.toString(),
      imageUrl: cat.imageUrl,
      createdAt: cat.createdAt ? cat.createdAt.toISOString() : undefined,
    };

    try {
      invalidateMenuCache();
      if (io) {
        io.emit('menu:category_updated', updatedCat);
        io.emit('menu:catalog_updated', { type: 'CATEGORY_UPDATED', category: updatedCat });
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      data: updatedCat,
      message: 'Category updated successfully!',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. DELETE /api/v1/menu-catalog/categories/:id
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const hotelId = getValidHotelObjectId(req);

    if (!hotelId || !Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const category = await MenuCategory.findOneAndDelete({
      _id: new Types.ObjectId(id),
      hotelId,
    });

    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    await MenuItem.deleteMany({ hotelId, categoryId: category._id });

    try {
      invalidateMenuCache();
      if (io) {
        io.emit('menu:category_deleted', { id, name: category.name });
        io.emit('menu:catalog_updated', { type: 'CATEGORY_DELETED', categoryId: id });
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" removed successfully!`,
      deletedId: id,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. GET /api/v1/menu-catalog/items
export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const hotelId = getValidHotelObjectId(req);
    const { categoryId, categoryName, foodType, search, inStockOnly } = req.query;

    let dbItems: MenuItemDTO[] = [];
    if (hotelId) {
      try {
        const filter: any = { hotelId };
        if (categoryId && Types.ObjectId.isValid(String(categoryId))) {
          filter.categoryId = new Types.ObjectId(String(categoryId));
        }
        if (foodType && foodType !== 'ALL') {
          filter.foodType = foodType;
        }
        if (inStockOnly === 'true') {
          filter.isAvailable = true;
        }

        const items = await MenuItem.find(filter).populate('categoryId').sort({ name: 1 });
        if (items && items.length > 0) {
          dbItems = items.map(m => {
            const catObj = m.categoryId as any;
            return {
              id: m._id.toString(),
              name: m.name,
              categoryId: catObj?._id ? catObj._id.toString() : (m.categoryId?.toString() || ''),
              category: catObj?.name || 'Main Course',
              kitchenStationId: m.kitchenStationId?.toString(),
              foodType: m.foodType || 'VEG',
              price: m.basePrice,
              basePrice: m.basePrice,
              isAvailable: m.isAvailable !== false,
              description: m.description || '',
              prepTimeMinutes: m.prepTimeMinutes || 12,
              images: m.images && m.images.length > 0 ? m.images : [
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
              ],
              createdAt: m.createdAt ? m.createdAt.toISOString() : undefined,
            };
          });
        } else if (hotelId) {
          const cats = await MenuCategory.find({ hotelId });
          if (cats.length > 0) {
            const catMap = new Map<string, Types.ObjectId>();
            cats.forEach(c => catMap.set(c.name.toLowerCase(), c._id));

            let station = await KitchenStation.findOne({ hotelId });
            if (!station) {
              station = await KitchenStation.create({
                hotelId,
                stationName: 'Main Kitchen',
                screenToken: `station_${hotelId.toString()}_${Date.now()}`,
              });
            }

            const itemsToInsert = DEFAULT_ITEMS.map((di) => {
              const catId = catMap.get(di.category.toLowerCase()) || cats[0]._id;
              return {
                hotelId,
                categoryId: catId,
                kitchenStationId: station._id,
                name: di.name,
                description: di.description || '',
                foodType: di.foodType === 'NON_VEG' ? FoodType.NON_VEG : FoodType.VEG,
                basePrice: di.basePrice || di.price || 150,
                hasVariants: false,
                variants: [],
                addons: [],
                isAvailable: di.isAvailable !== false,
                prepTimeMinutes: di.prepTimeMinutes || 12,
                images: di.images || [],
              };
            });
            const createdItems = await MenuItem.insertMany(itemsToInsert);
            dbItems = createdItems.map((m: any) => {
              const catObj = cats.find(c => c._id.equals(m.categoryId));
              return {
                id: m._id.toString(),
                name: m.name,
                categoryId: m.categoryId.toString(),
                category: catObj?.name || 'Main Course',
                kitchenStationId: m.kitchenStationId?.toString(),
                foodType: m.foodType || 'VEG',
                price: m.basePrice,
                basePrice: m.basePrice,
                isAvailable: m.isAvailable !== false,
                description: m.description || '',
                prepTimeMinutes: m.prepTimeMinutes || 12,
                images: m.images && m.images.length > 0 ? m.images : [
                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
                ],
                createdAt: m.createdAt ? m.createdAt.toISOString() : undefined,
              };
            });
          }
        }
      } catch (err) {
        console.warn('DB menu items fetch error:', err);
      }
    }

    let results = (hotelId && dbItems.length > 0) ? dbItems : DEFAULT_ITEMS;

    if (categoryId && categoryId !== 'ALL' && categoryId !== 'All') {
      results = results.filter(i => i.categoryId === categoryId || i.category.toLowerCase() === String(categoryId).toLowerCase());
    }
    if (categoryName && categoryName !== 'ALL' && categoryName !== 'All') {
      results = results.filter(i => i.category.toLowerCase() === String(categoryName).toLowerCase());
    }
    if (foodType && foodType !== 'ALL') {
      results = results.filter(i => i.foodType === foodType);
    }
    if (inStockOnly === 'true') {
      results = results.filter(i => i.isAvailable);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(i => i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
    }

    res.status(200).json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. POST /api/v1/menu-catalog/items
export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      categoryId,
      category,
      price,
      basePrice,
      foodType = 'VEG',
      description,
      prepTimeMinutes = 15,
      kitchenStationId,
      images,
      isAvailable = true,
    } = req.body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, message: 'Dish name is required' });
      return;
    }

    const itemPrice = Number(price || basePrice) || 150;
    const hotelId = getValidHotelObjectId(req);

    if (!hotelId) {
      res.status(400).json({ success: false, message: 'Hotel context is required' });
      return;
    }

    const matchedCat = categoryId && Types.ObjectId.isValid(String(categoryId))
      ? await MenuCategory.findOne({ _id: new Types.ObjectId(String(categoryId)), hotelId })
      : await MenuCategory.findOne({
          hotelId,
          ...(category ? { name: String(category).trim() } : {}),
        });

    if (!matchedCat) {
      res.status(400).json({ success: false, message: 'A valid menu category is required for this hotel' });
      return;
    }

    const stationObjId = kitchenStationId && Types.ObjectId.isValid(String(kitchenStationId))
      ? new Types.ObjectId(String(kitchenStationId))
      : undefined;

    let station = stationObjId
      ? await KitchenStation.findOne({ _id: stationObjId, hotelId })
      : null;

    if (!station) {
      station = await KitchenStation.findOne({ hotelId });
    }

    if (!station) {
      station = await KitchenStation.create({
        hotelId,
        stationName: 'Main Kitchen',
        screenToken: `station_${hotelId.toString()}_${Date.now()}`,
      });
    }

    const newItem = await MenuItem.create({
      hotelId,
      categoryId: matchedCat._id,
      kitchenStationId: station._id,
      name: String(name).trim(),
      description: description || '',
      foodType: String(foodType).toUpperCase() === 'NON_VEG' ? FoodType.NON_VEG : FoodType.VEG,
      basePrice: itemPrice,
      hasVariants: false,
      variants: [],
      addons: [],
      isAvailable: Boolean(isAvailable),
      prepTimeMinutes: Number(prepTimeMinutes) || 15,
      images: images && Array.isArray(images) && images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
      ],
    });

    const newItemDTO: MenuItemDTO = {
      id: newItem._id.toString(),
      name: newItem.name,
      categoryId: matchedCat._id.toString(),
      category: matchedCat.name,
      kitchenStationId: newItem.kitchenStationId?.toString(),
      foodType: newItem.foodType,
      price: newItem.basePrice,
      basePrice: newItem.basePrice,
      isAvailable: newItem.isAvailable,
      description: newItem.description || '',
      prepTimeMinutes: newItem.prepTimeMinutes || 15,
      images: newItem.images || [],
      createdAt: newItem.createdAt ? newItem.createdAt.toISOString() : new Date().toISOString(),
    };

    try {
      invalidateMenuCache();
      if (io) {
        io.emit('menu:item_created', newItemDTO);
        io.emit('menu:catalog_updated', { type: 'ITEM_CREATED', item: newItemDTO });
      }
    } catch (_) {}

    res.status(201).json({
      success: true,
      data: newItemDTO,
      message: `Dish "${name}" added to menu!`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. PATCH /api/v1/menu-catalog/items/:id
export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, price, basePrice, foodType, categoryId, description, prepTimeMinutes, isAvailable, images } = req.body;
    const hotelId = getValidHotelObjectId(req);

    if (!hotelId || !Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Menu item not found' });
      return;
    }

    const item = await MenuItem.findOne({ _id: new Types.ObjectId(id), hotelId });
    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found' });
      return;
    }

    if (name) item.name = String(name).trim();
    if (price || basePrice) item.basePrice = Number(price || basePrice);
    if (foodType) item.foodType = String(foodType).toUpperCase() === 'NON_VEG' ? FoodType.NON_VEG : FoodType.VEG;
    if (categoryId) {
      if (!Types.ObjectId.isValid(String(categoryId))) {
        res.status(400).json({ success: false, message: 'Invalid category id' });
        return;
      }
      const categoryExists = await MenuCategory.exists({ _id: new Types.ObjectId(String(categoryId)), hotelId });
      if (!categoryExists) {
        res.status(400).json({ success: false, message: 'Category not found for this hotel' });
        return;
      }
      item.categoryId = new Types.ObjectId(String(categoryId));
    }
    if (description !== undefined) item.description = String(description);
    if (prepTimeMinutes) item.prepTimeMinutes = Number(prepTimeMinutes);
    if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
    if (images) item.images = images;
    await item.save();

    const itemCategory = await MenuCategory.findOne({ _id: item.categoryId, hotelId });
    const updatedItem: MenuItemDTO = {
      id: item._id.toString(),
      name: item.name,
      categoryId: item.categoryId.toString(),
      category: itemCategory?.name || 'Main Course',
      kitchenStationId: item.kitchenStationId?.toString(),
      foodType: item.foodType,
      price: item.basePrice,
      basePrice: item.basePrice,
      isAvailable: item.isAvailable,
      description: item.description,
      prepTimeMinutes: item.prepTimeMinutes,
      images: item.images,
      createdAt: item.createdAt ? item.createdAt.toISOString() : undefined,
    };

    try {
      invalidateMenuCache();
      if (io) {
        io.emit('menu:item_updated', updatedItem);
        io.emit('menu:catalog_updated', { type: 'ITEM_UPDATED', item: updatedItem, hotelId: hotelId.toString() });
        io.to(`${hotelId.toString()}_customers`)
          .to(`${hotelId.toString()}_kds`)
          .to(`${hotelId.toString()}_waiters`)
          .to(`${hotelId.toString()}_admin`)
          .emit('menu:catalog_updated', { type: 'ITEM_UPDATED', item: updatedItem });
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      data: updatedItem,
      message: 'Menu item updated successfully!',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. DELETE /api/v1/menu-catalog/items/:id
export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const hotelId = getValidHotelObjectId(req);

    if (!hotelId || !Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Menu item not found' });
      return;
    }

    const item = await MenuItem.findOneAndDelete({ _id: new Types.ObjectId(id), hotelId });
    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found' });
      return;
    }

    try {
      invalidateMenuCache();
      if (io) {
        io.emit('menu:item_deleted', { id, name: item.name });
        io.emit('menu:catalog_updated', { type: 'ITEM_DELETED', itemId: id });
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: `Dish "${item.name}" deleted successfully!`,
      deletedId: id,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. PATCH /api/v1/menu-catalog/items/:id/toggle-86
export const toggleItem86 = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const hotelId = getValidHotelObjectId(req);

    if (!hotelId || !Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Menu item not found' });
      return;
    }

    const item = await MenuItem.findOne({ _id: new Types.ObjectId(id), hotelId });
    if (!item) {
      res.status(404).json({ success: false, message: 'Menu item not found' });
      return;
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    try {
      invalidateMenuCache();
      if (io) {
        const payload = { itemId: id, isAvailable: item.isAvailable, name: item.name, hotelId: hotelId.toString() };
        io.emit('menu:item_86_toggled', payload);
        io.emit('menu:catalog_updated', { type: 'ITEM_86_TOGGLED', itemId: id, isAvailable: item.isAvailable, hotelId: hotelId.toString() });
        io.to(`${hotelId.toString()}_customers`)
          .to(`${hotelId.toString()}_kds`)
          .to(`${hotelId.toString()}_waiters`)
          .to(`${hotelId.toString()}_admin`)
          .emit('menu:item_86_toggled', payload);
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      data: { id, isAvailable: item.isAvailable, name: item.name },
      message: item.isAvailable ? `Dish "${item.name}" is now AVAILABLE in kitchen!` : `Dish "${item.name}" marked 86 OUT OF STOCK!`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
